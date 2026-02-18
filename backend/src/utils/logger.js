//src/utils/logger.js
const logger = {
  error: (context, error, details = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      context,
      message: error.message || error,
      stack: error.stack,
      ...details
    }
    console.error(JSON.stringify(logEntry))
  },
  
  info: (context, message, details = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO', 
      context,
      message,
      ...details
    }
    console.log(JSON.stringify(logEntry))
  },

  warn: (context, message, details = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      context,
      message,
      ...details
    }
    console.warn(JSON.stringify(logEntry))
  },

  debug: (context, message, details = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      context,
      message,
      ...details
    }
    console.debug(JSON.stringify(logEntry))
  }
}

module.exports = logger