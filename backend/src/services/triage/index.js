const env = require('../../config/env');

const providers = {
  keyword: require('./keywordTriage'),
  llm: require('./llmTriage'),
};

module.exports = providers[env.triageProvider] || providers.keyword;
