// Error categories for better organization and reporting
const ErrorCategories = {
  VALIDATION: 'VALIDATION',
  MODERATION: 'MODERATION',
  DATABASE: 'DATABASE',
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE',
  SYSTEM: 'SYSTEM'
};

// Specific error codes with descriptions
const ErrorCodes = {
  // Validation errors (1000-1999)
  INVALID_REQUEST_BODY: {
    code: 1000,
    category: ErrorCategories.VALIDATION,
    message: 'Invalid request body format'
  },
  MISSING_URL: {
    code: 1001,
    category: ErrorCategories.VALIDATION,
    message: 'URL is required for URL type uploads'
  },
  MISSING_CONTENT: {
    code: 1002,
    category: ErrorCategories.VALIDATION,
    message: 'Content is required for text type uploads'
  },
  INVALID_URL_PROTOCOL: {
    code: 1003,
    category: ErrorCategories.VALIDATION,
    message: 'Invalid URL protocol. Only HTTP(S) URLs are allowed'
  },

  // Moderation errors (2000-2999)
  MODERATION_FAILED: {
    code: 2000,
    category: ErrorCategories.MODERATION,
    message: 'Content moderation check failed'
  },
  CONTENT_REJECTED: {
    code: 2001,
    category: ErrorCategories.MODERATION,
    message: 'Content rejected by moderation'
  },

  // Database errors (3000-3999)
  DB_CONNECTION_ERROR: {
    code: 3000,
    category: ErrorCategories.DATABASE,
    message: 'Database connection error'
  },
  DB_WRITE_ERROR: {
    code: 3001,
    category: ErrorCategories.DATABASE,
    message: 'Failed to write to database'
  },

  // External service errors (4000-4999)
  METADATA_FETCH_ERROR: {
    code: 4000,
    category: ErrorCategories.EXTERNAL_SERVICE,
    message: 'Failed to fetch URL metadata'
  },
  DISCORD_CDN_ERROR: {
    code: 4001,
    category: ErrorCategories.EXTERNAL_SERVICE,
    message: 'Failed to process Discord CDN URL'
  },
  FILE_STORAGE_ERROR: {
    code: 4002,
    category: ErrorCategories.EXTERNAL_SERVICE,
    message: 'Failed to store file'
  },

  // System errors (5000-5999)
  INTERNAL_ERROR: {
    code: 5000,
    category: ErrorCategories.SYSTEM,
    message: 'Internal server error'
  }
};

// Helper function to create error response
function createErrorResponse(errorCode, details = null, statusCode = 400) {
  const error = ErrorCodes[errorCode];
  if (!error) {
    throw new Error(`Unknown error code: ${errorCode}`);
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      error: {
        code: error.code,
        category: error.category,
        message: error.message,
        details: details || undefined,
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(2, 15)
      }
    })
  };
}

// Helper function to log errors with consistent format
function logError(errorCode, error, context = {}) {
  const errorInfo = ErrorCodes[errorCode];
  console.error({
    timestamp: new Date().toISOString(),
    errorCode: errorInfo.code,
    category: errorInfo.category,
    message: errorInfo.message,
    error: error?.message,
    stack: error?.stack,
    context
  });
}

module.exports = {
  ErrorCategories,
  ErrorCodes,
  createErrorResponse,
  logError
};
