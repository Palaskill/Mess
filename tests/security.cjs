const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const SID = '11111111-1111-4111-8111-111111111111';
const TOKEN = 'a'.repeat(64);

// Only dummy cookie/database/provider adapters; never use runtime Supabase config.
function fixture({ authenticated = true, allowed = true, participantIds = ['friend-a'], reserve = true } = {}) {
  const events = [];
  const saved = new Map(authenticated ? [[`mess_grant_${SID}`, TOKEN]] : []);
  const cookieOptions = [];
  const store = {
    get: name => saved.has(name) ? { name, value: saved.get(name) } : undefined,
    getAll: () => [...saved].map(([name,value]) => ({name,value})),
    set: (name,value,options) => { saved.set(name,value); cookieOptions.push(options); },
    delete: name => saved.delete(name),
  };
  const client = {
    async rpc(name, input) {
      events.push(['rpc',name,input]);
      if (name === 'mess_can_edit') return {data: allowed, error: null};
      if (name === 'mess_unlock_session') return {data: TOKEN, error: null};
      if (name === 'mess_reserve_scan') return reserve ? {data: SID,error:null} : {data:null,error:{message:'quota'}};
      return {data:null,error:null};
    },
    from(table) {
      events.push(['from',table]);
      const query = {
        select() { return this; }, eq() { return this; }, in() { return this; },
        single() { return Promise.resolve({data:{id:'order-a',quantity:3,split_type:'individual'},error:null}); },
        upsert(row) { events.push(['write',table,row]); return Promise.resolve({data:null,error:null}); },
        update(row) { events.push(['write',table,row]); return this; },
        insert(row) { events.push(['write',table,row]); return this; },
        delete() { events.push(['write',table]); return this; },
        then(resolve,reject) { return Promise.resolve({data:participantIds.map(id=>({id})),error:null}).then(resolve,reject); },
      };
      return query;
    },
  };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = {exports:{}};cache.set(filename,module);
    const code = ts.transpileModule(fs.readFileSync(filename,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    function requireFixture(name) {
      if (name === 'server-only') return {};
      if (name === 'next/headers') return {cookies: async()=>store};
      if (name === 'next/cache') return {revalidatePath: ()=>{}};
      if (name === '@/utils/supabase/server') return {createClient: ()=>client};
      if (name.startsWith('@/')) return load('src/'+name.slice(2)+'.ts');
      return require(name);
    }
    const quietConsole = { ...console, error: ()=>{}, warn: ()=>{} };
    new Function('exports','require','module','console',code)(module.exports,requireFixture,module,quietConsole);
    return module.exports;
  }
  return {load,events,saved,cookieOptions};
}

test('no grant: an order mutation is rejected before database access', async () => {
  const f=fixture({authenticated:false});const a=f.load('src/lib/actions.ts');
  assert.equal((await a.updateOrder('order-a',SID,{unit_price:1})).success,false);
  assert.equal(f.events.length,0);
});
test('expired or closed authorization rejects before resource write',async()=>{
  const f=fixture({allowed:false});
  assert.equal((await f.load('src/lib/actions.ts').addParticipant(new MapForm({session_id:SID,name:'Dummy'}))).success,false);
  assert.equal(f.events.filter(e=>e[0]==='write').length,0);
});
function MapForm(values) { const f=new FormData();for(const [k,v] of Object.entries(values))f.set(k,v);return f; }
test('foreign-session participant is rejected before assignment upsert',async()=>{
  const f=fixture({participantIds:[]});
  assert.equal((await f.load('src/lib/actions.ts').assignItem('order-a','foreign',1,SID)).success,false);
  assert.equal(f.events.filter(e=>e[0]==='write').length,0);
});
test('in-scope assignment is allowed only after trusted grant and relationship checks',async()=>{
  const f=fixture();
  assert.equal((await f.load('src/lib/actions.ts').assignItem('order-a','friend-a',1,SID)).success,true);
  assert.equal(f.events[0][1],'mess_can_edit');
  assert.equal(f.events.filter(e=>e[0]==='write').length,1);
});
test('batch rejects excessive expansion and cross-session references before insertion',async()=>{
  const f=fixture({participantIds:[]});const a=f.load('src/lib/actions.ts');
  const item={item_name:'Pizza',unit_price:20,quantity:1,split_type:'shared',assigned_participant_ids:['foreign']};
  assert.equal((await a.createBatchOrders(SID,[{...item,quantity:1e9}])).success,false);
  assert.equal((await a.createBatchOrders(SID,[item])).success,false);
  assert.equal(f.events.filter(e=>e[0]==='write').length,0);
});
test('unlock stores a random opaque grant in an HttpOnly cookie, not the password',async()=>{
  const f=fixture({authenticated:false});
  assert.equal((await f.load('src/lib/actions.ts').verifySessionPassword(SID,'dummy password')).success,true);
  assert.equal(f.saved.get(`mess_grant_${SID}`),TOKEN);
  assert.equal([...f.saved.values()].includes('dummy password'),false);
  assert.equal(f.cookieOptions[0].httpOnly,true);
  assert.equal(f.cookieOptions[0].sameSite,'strict');
});
test('lock revokes the server grant and removes the cookie',async()=>{
  const f=fixture();assert.equal((await f.load('src/lib/actions.ts').lockSession(SID)).success,true);
  assert.equal(f.events[0][1],'mess_revoke_grant');assert.equal(f.saved.size,0);
});
test('public session serialization never returns verifier or unknown future fields',()=>{
  const f=fixture();const {publicSession}=f.load('src/lib/security/validation.ts');
  const dto=publicSession({id:SID,name:'Dinner::auth:abc123',password_hash:'dummy hash',private_token:'dummy',status:'open',created_at:'now'});
  assert.deepEqual(Object.keys(dto).sort(),['created_at','has_password','id','name','status']);assert.equal(dto.name,'Dinner');assert.equal(dto.has_password,true);
});
test('missing session and rejected quota cause zero provider calls',async()=>{
  const oldFetch=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw Error('must not fetch');};
  const oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='dummy-test-key';
  try {
    const f=fixture({reserve:false});const scan=f.load('src/lib/gemini.ts').scanReceiptWithGemini;
    assert.equal((await scan('AAAA','image/jpeg')).success,false);
    const unauthorized = fixture({authenticated:false});
    assert.equal((await unauthorized.load('src/lib/gemini.ts').scanReceiptWithGemini('AAAA','image/jpeg','dummy-personal-key',SID)).success,false);
    assert.equal((await scan('AAAA','image/jpeg',undefined,SID)).success,false);assert.equal(calls,0);
  } finally { global.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey; }
});
test('successful scan reserves first, uses header credential and releases the lease',async()=>{
  const oldFetch=global.fetch;const oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='dummy-test-key';
  const f=fixture();let called=false;
  global.fetch=async(url,options)=>{
    called=true;assert.equal(f.events.at(-1)[1],'mess_reserve_scan');
    assert.equal(url.includes('key='),false);assert.equal(options.headers['x-goog-api-key'],'dummy-test-key');
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({currency:'TND',items:[{name:'Pizza',quantity:1,unit_price:20,category:'food',split_type:'shared'}]})}]}}]}),{status:200});
  };
  try {
    const result=await f.load('src/lib/gemini.ts').scanReceiptWithGemini('AAAA','image/jpeg',undefined,SID);
    assert.equal(result.success,true);assert.equal(called,true);assert.equal(f.events.at(-1)[1],'mess_finish_scan');
  } finally {global.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
});
test('image and response limits reject malformed or oversized buffers',async()=>{
  const f=fixture();const {validateReceiptImage,boundedResponseJSON}=f.load('src/lib/security/receipt.ts');
  assert.throws(()=>validateReceiptImage('AAAA','text/html'));
  assert.throws(()=>validateReceiptImage('!?!?','image/jpeg'));
  assert.throws(()=>validateReceiptImage('A'.repeat(3*1024*1024+4),'image/jpeg'));
  await assert.rejects(()=>boundedResponseJSON(new Response('x'.repeat(100)),16),/volumineuse/);
});
