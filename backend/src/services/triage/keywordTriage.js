// Deterministic keyword heuristic -- the default triage strategy because it
// costs nothing to run and needs no API key, which matters given the
// AWS-Free-Tier / no-budget constraint from Phase 1. Swappable for a real
// LLM call (llmTriage.js) the moment there's a budget for one -- same
// Strategy pattern as storage/email, selected via env var in index.js.

const CATEGORY_KEYWORDS = {
  Plumbing: ['leak', 'pipe', 'water', 'tap', 'drain', 'toilet', 'flush', 'seepage', 'overflow'],
  Electrical: ['spark', 'wire', 'wiring', 'switch', 'power', 'socket', 'short circuit', 'mcb', 'shock', 'fuse'],
  Cleaning: ['garbage', 'trash', 'dirty', 'sweep', 'clean', 'waste', 'smell', 'stink'],
  Security: ['theft', 'stranger', 'suspicious', 'unlock', 'break-in', 'cctv', 'stolen', 'trespass'],
  'Lift/Elevator': ['lift', 'elevator', 'stuck between floors'],
};

const HIGH_PRIORITY_KEYWORDS = ['fire', 'gas leak', 'urgent', 'emergency', 'danger', 'smoke', 'shock', 'flood', 'burst', 'collapse'];
const LOW_PRIORITY_KEYWORDS = ['minor', 'small', 'whenever', 'no rush', 'not urgent'];

function suggest(description, availableCategories) {
  const text = description.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter((kw) => text.includes(kw)).length;
    if (matches > bestScore) {
      bestScore = matches;
      bestMatch = categoryName;
    }
  }

  // Match the keyword-map label against the TENANT's actual categories --
  // categories are tenant-scoped and admin-editable (Phase 4), so this
  // never assumes the default seed set is still intact or unrenamed.
  const matchedCategory = bestMatch
    ? availableCategories.find((c) => c.name.toLowerCase() === bestMatch.toLowerCase())
    : null;
  const fallbackCategory = availableCategories.find((c) => c.name.toLowerCase() === 'other');

  const chosenCategory = matchedCategory || fallbackCategory || null;

  let suggestedPriority = 'MEDIUM';
  if (HIGH_PRIORITY_KEYWORDS.some((kw) => text.includes(kw))) suggestedPriority = 'HIGH';
  else if (LOW_PRIORITY_KEYWORDS.some((kw) => text.includes(kw))) suggestedPriority = 'LOW';

  // Confidence is a plain function of how many keywords fired -- not a
  // real probability, and deliberately not presented as one to the
  // frontend (labelled "suggestion," never "AI prediction: 92% sure").
  const confidence = bestScore >= 2 ? 0.8 : bestScore === 1 ? 0.55 : 0.2;

  return Promise.resolve({
    suggestedCategoryId: chosenCategory?.id || null,
    suggestedCategoryName: chosenCategory?.name || null,
    suggestedPriority,
    confidence,
  });
}

module.exports = { suggest };
