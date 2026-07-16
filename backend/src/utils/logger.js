// Minimal structured logger. Swappable for pino/winston in a larger deployment,
// but this keeps the dependency footprint small while still giving JSON lines
// that a log aggregator (or `heroku logs`, Render's dashboard, etc.) can parse.

function log(level, message, meta = {}) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else console.log(line);
}

module.exports = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};
