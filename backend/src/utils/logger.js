const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  constructor(level = 'info') {
    this.level = logLevels[level] || logLevels.info;
  }

  _log(level, message, meta = {}) {
    if (logLevels[level] > this.level) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
    };

    console[level === 'error' ? 'error' : 'log'](JSON.stringify(logEntry));
  }

  error(message, meta) {
    this._log('error', message, meta);
  }

  warn(message, meta) {
    this._log('warn', message, meta);
  }

  info(message, meta) {
    this._log('info', message, meta);
  }

  debug(message, meta) {
    this._log('debug', message, meta);
  }
}

export const logger = new Logger(process.env.LOG_LEVEL || 'info');
