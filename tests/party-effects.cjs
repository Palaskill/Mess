const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const moduleUnderTest = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('src/lib/party-effects.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('exports', 'require', 'module', source)(moduleUnderTest.exports, require, moduleUnderTest);
const { isAlcoholItem, countPartyItems, countSavedPartyItems } = moduleUnderTest.exports;

test('decorative alcohol matching excludes explicitly alcohol-free drinks', () => {
  for (const name of ['Celtia', 'Bière pression', 'Gin tonic', 'Whisky', 'نبيذ']) assert.equal(isAlcoholItem(name), true, name);
  for (const name of ['Bière sans alcool', 'Beer 0.0', 'Virgin mojito', 'Eau de rose', 'Pizza', 'Coca Cola']) assert.equal(isAlcoholItem(name), false, name);
});
test('shared drinks count fractions; individual allocations follow quantities', () => {
  assert.deepEqual(countPartyItems([
    { name: 'Celtia', quantity: 3, shared: false, participantIds: ['A', 'A', 'A'] },
    { name: 'Vin', quantity: 1, shared: true, participantIds: ['A', 'B'] },
    { name: 'Pizza', quantity: 4, shared: true, participantIds: ['A', 'B'] },
  ]), { A: 3.5, B: .5 });
});
test('removing allocations reduces the effect and affects only the correct friend', () => {
  const orders = [{ id: 'beer', item_name: 'Celtia', quantity: 6, split_type: 'individual' }];
  const assignments = [{ order_id: 'beer', participant_id: 'A', quantity: 4 }, { order_id: 'beer', participant_id: 'B', quantity: 2 }];
  assert.deepEqual(countSavedPartyItems(orders, assignments), { A: 4, B: 2 });
  assert.deepEqual(countSavedPartyItems(orders, assignments.slice(1)), { B: 2 });
  assert.equal(assignments[0].quantity, 4);
});
