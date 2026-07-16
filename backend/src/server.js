const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`Finance Tracker API listening on port ${PORT}`, { env: process.env.NODE_ENV || 'development' });
});
