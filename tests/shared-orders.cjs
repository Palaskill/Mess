const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
function load(path) {
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('exports', 'require', 'module', compiled)(module.exports, require, module);
  return module.exports;
}
const { separateSharedUnits } = load('src/lib/shared-orders.ts');
const { calculateBills, calculateTotal, calculateUnassigned } = load('src/lib/calculations.ts');
test('two identical pizzas: one solo, one shared between two other diners', () => {
  const participants = ['A','B','C'].map(id => ({ id, name: id }));
  const orders = separateSharedUnits([{ item_name: 'Pizza', quantity: 2, unit_price: 20, split_type: 'shared' }]).map((o,i) => ({ ...o, id: String(i) }));
  const assignments = [['0','A'],['1','B'],['1','C']].map(([order_id,participant_id]) => ({order_id,participant_id,quantity:1}));
  const bills = calculateBills(orders, assignments, participants);
  assert.deepEqual(bills.map(b => b.total), [20,10,10]);
  assert.equal(bills.reduce((n,b) => n+b.total,0), calculateTotal(orders));
  assert.equal(calculateUnassigned(orders, assignments),0);
});
test('individual drinks stay grouped; shared normalization is idempotent', () => {
  const input = [{ quantity: 3, split_type: 'individual', unit_price: 5 }, { quantity: 2, split_type: 'shared', unit_price: 20 }];
  const result = separateSharedUnits(input);
  assert.deepEqual(result.map(x=>x.quantity),[3,1,1]);
  assert.deepEqual(separateSharedUnits(result),result);
  assert.equal(result.reduce((n,x)=>n+x.quantity*x.unit_price,0),55);
  assert.equal(input[1].quantity,2);
});
test('unassigned pizza is not charged to diners of the other pizza', () => {
  const orders = [{id:'a',quantity:1,split_type:'shared',unit_price:20},{id:'b',quantity:1,split_type:'shared',unit_price:20}];
  const assignments = [{order_id:'a',participant_id:'A',quantity:1}];
  assert.equal(calculateBills(orders,assignments,[{id:'A'}])[0].total,20);
  assert.equal(calculateUnassigned(orders,assignments),20);
});
