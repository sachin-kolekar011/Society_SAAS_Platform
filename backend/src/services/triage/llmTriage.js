// Not wired in by default -- same reasoning as s3Storage.js: proves the
// interface holds against a second, real implementation, without costing
// anything until STORAGE_PROVIDER-style env var flips it on.
//
// Would use the Anthropic SDK directly, since this project already has an
// obvious relationship to Claude:
//
// const Anthropic = require('@anthropic-ai/sdk');
// const client = new Anthropic({ apiKey: env.anthropicApiKey });
//
// async function suggest(description, availableCategories) {
//   const categoryNames = availableCategories.map((c) => c.name).join(', ');
//   const response = await client.messages.create({
//     model: 'claude-haiku-4-5-20251001', // cheapest model -- this is a
//                                          // small classification task,
//                                          // not a reasoning-heavy one
//     max_tokens: 100,
//     messages: [{
//       role: 'user',
//       content: `Categorize this complaint into one of [${categoryNames}] ` +
//         `and suggest a priority (LOW/MEDIUM/HIGH). Respond as JSON only: ` +
//         `{"category":"...","priority":"...","confidence":0.0-1.0}\n\n` +
//         `Complaint: ${description}`,
//     }],
//   });
//   const parsed = JSON.parse(response.content[0].text);
//   const matched = availableCategories.find((c) => c.name === parsed.category);
//   return {
//     suggestedCategoryId: matched?.id || null,
//     suggestedCategoryName: matched?.name || null,
//     suggestedPriority: parsed.priority,
//     confidence: parsed.confidence,
//   };
// }

module.exports = {
  suggest: () => { throw new Error('LLM triage not yet wired -- see comment in this file'); },
};
