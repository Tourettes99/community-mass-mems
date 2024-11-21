const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

function formatError(error) {
  return {
    message: error.message,
    stack: error.stack,
    code: error.code,
    name: error.name,
    ...(error.response && {
      status: error.response.status,
      statusText: error.response.statusText,
      responseData: error.response.data
    })
  };
}

function formatMessage(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  return {
    timestamp,
    level,
    message,
    context: {
      environment: process.env.NODE_ENV || 'development',
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'local',
      ...context
    }
  };
}

const logger = {
  error(message, error = null, context = {}) {
    const logMessage = formatMessage(LOG_LEVELS.ERROR, message, {
      ...context,
      ...(error && { error: formatError(error) })
    });
    console.error(JSON.stringify(logMessage, null, 2));
    return logMessage;
  },

  warn(message, context = {}) {
    const logMessage = formatMessage(LOG_LEVELS.WARN, message, context);
    console.warn(JSON.stringify(logMessage, null, 2));
    return logMessage;
  },

  info(message, context = {}) {
    const logMessage = formatMessage(LOG_LEVELS.INFO, message, context);
    console.log(JSON.stringify(logMessage, null, 2));
    return logMessage;
  },

  debug(message, context = {}) {
    if (process.env.NODE_ENV !== 'production') {
      const logMessage = formatMessage(LOG_LEVELS.DEBUG, message, context);
      console.log(JSON.stringify(logMessage, null, 2));
      return logMessage;
    }
  }
};

module.exports = logger;
