const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');

app.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port} (${env.nodeEnv})`);
});
