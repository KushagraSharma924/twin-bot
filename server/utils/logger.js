/**
 * Enhanced logging utility for the application
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  
  // Foreground colors
  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    crimson: "\x1b[38m"
  },
  
  // Background colors
  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
    crimson: "\x1b[48m"
  }
};

/**
 * Format the current timestamp
 */
const timestamp = () => {
  const now = new Date();
  return now.toISOString();
};

/**
 * Log a message with a specific level
 */
const log = (level, message, data = null) => {
  let color;
  let prefix;
  
  switch (level.toLowerCase()) {
    case 'info':
      color = colors.fg.green;
      prefix = 'INFO';
      break;
    case 'warn':
      color = colors.fg.yellow;
      prefix = 'WARN';
      break;
    case 'error':
      color = colors.fg.red;
      prefix = 'ERROR';
      break;
    case 'debug':
      color = colors.fg.cyan;
      prefix = 'DEBUG';
      break;
    default:
      color = colors.reset;
      prefix = 'LOG';
  }
  
  const formattedMessage = `${color}[${prefix}]${colors.reset} ${colors.dim}${timestamp()}${colors.reset} ${message}`;
  
  console.log(formattedMessage);
  
  if (data) {
    console.log(data);
  }
};

/**
 * Log an informational message
 */
export const info = (message, data = null) => {
  log('info', message, data);
};

/**
 * Log a warning message
 */
export const warn = (message, data = null) => {
  log('warn', message, data);
};

/**
 * Log an error message
 */
export const error = (message, data = null) => {
  log('error', message, data);
};

/**
 * Log a debug message (only in development)
 */
export const debug = (message, data = null) => {
  if (process.env.NODE_ENV !== 'production') {
    log('debug', message, data);
  }
};

export default {
  info,
  warn,
  error,
  debug
}; 