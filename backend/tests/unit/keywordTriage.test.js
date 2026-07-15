const { test } = require('node:test');
const assert = require('node:assert');
const triage = require('../../src/services/triage/keywordTriage');

const CATEGORIES = [
  { id: 'cat_plumbing', name: 'Plumbing' },
  { id: 'cat_electrical', name: 'Electrical' },
  { id: 'cat_cleaning', name: 'Cleaning' },
  { id: 'cat_security', name: 'Security' },
  { id: 'cat_lift', name: 'Lift/Elevator' },
  { id: 'cat_other', name: 'Other' },
];

test('matches a plumbing complaint to the Plumbing category', async () => {
  const result = await triage.suggest('There is a water leak from the kitchen tap, pipe seems broken', CATEGORIES);
  assert.strictEqual(result.suggestedCategoryId, 'cat_plumbing');
  assert.strictEqual(result.suggestedPriority, 'MEDIUM');
});

test('flags an emergency keyword as HIGH priority', async () => {
  const result = await triage.suggest('There is a gas leak smell near the meter, urgent please help', CATEGORIES);
  assert.strictEqual(result.suggestedPriority, 'HIGH');
});

test('flags a low-urgency phrase as LOW priority', async () => {
  const result = await triage.suggest('Minor scratch on the lobby wall paint, no rush to fix', CATEGORIES);
  assert.strictEqual(result.suggestedPriority, 'LOW');
});

test('falls back to Other category when no keywords match', async () => {
  const result = await triage.suggest('Something strange happened yesterday near the entrance', CATEGORIES);
  assert.strictEqual(result.suggestedCategoryId, 'cat_other');
});

test('returns null category if tenant has no Other category and nothing matches', async () => {
  const categoriesWithoutOther = CATEGORIES.filter((c) => c.name !== 'Other');
  const result = await triage.suggest('Completely unrelated text with zero keyword overlap', categoriesWithoutOther);
  assert.strictEqual(result.suggestedCategoryId, null);
});

test('confidence scales with number of keyword matches', async () => {
  const strong = await triage.suggest('electrical wire spark short circuit at the switch', CATEGORIES);
  const weak = await triage.suggest('the switch is a bit odd', CATEGORIES);
  assert.ok(strong.confidence > weak.confidence, `expected ${strong.confidence} > ${weak.confidence}`);
});

test('is case-insensitive', async () => {
  const result = await triage.suggest('WATER LEAK FROM THE PIPE', CATEGORIES);
  assert.strictEqual(result.suggestedCategoryId, 'cat_plumbing');
});
