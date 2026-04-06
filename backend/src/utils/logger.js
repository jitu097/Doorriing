const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const levelColors = {
  error: colors.red,
  warn: colors.yellow,
  info: colors.green,
  debug: colors.blue,
};

class Logger {
  constructor(level = 'info') {
    this.level = logLevels[level] || logLevels.info;
  }

  _log(level, message, meta = {}) {
    if (logLevels[level] > this.level) return;

    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });

    // JSON log with full metadata
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...meta,
    };

    // Console output: Pretty colored format
    const colorCode = levelColors[level] || colors.reset;
    const prettyLog = `${colors.gray}[${timestamp}]${colors.reset} ${colorCode}${colors.bold}[${level.toUpperCase().padEnd(5)}]${colors.reset} ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      const metaStr = Object.entries(meta)
        .map(([key, value]) => {
          if (typeof value === 'object') {
            return `${key}: ${JSON.stringify(value)}`;
          }
          return `${key}: ${value}`;
        })
        .join(' | ');
      console[level === 'error' ? 'error' : 'log'](`${prettyLog} ${colors.gray}${metaStr}${colors.reset}`);
    } else {
      console[level === 'error' ? 'error' : 'log'](prettyLog);
    }

    // Optional: Also log JSON format to a file or service in production
    if (process.env.NODE_ENV === 'production') {
      console[level === 'error' ? 'error' : 'log'](JSON.stringify(logEntry));
    }
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
