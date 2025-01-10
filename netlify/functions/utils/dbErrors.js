const { MongoError } = require('mongodb');

// Error categories for MongoDB issues
const DbErrorCategories = {
  CONNECTION: 'CONNECTION',
  AUTHENTICATION: 'AUTHENTICATION',
  OPERATION: 'OPERATION',
  VALIDATION: 'VALIDATION',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN'
};

// Specific error codes with descriptions
const DbErrorCodes = {
  // Connection errors (1000-1999)
  CONNECTION_FAILED: {
    code: 1000,
    category: DbErrorCategories.CONNECTION,
    message: 'Failed to connect to MongoDB'
  },
  CONNECTION_TIMEOUT: {
    code: 1001,
    category: DbErrorCategories.CONNECTION,
    message: 'Connection timed out'
  },
  CONNECTION_CLOSED: {
    code: 1002,
    category: DbErrorCategories.CONNECTION,
    message: 'Connection was closed'
  },

  // Authentication errors (2000-2999)
  AUTH_FAILED: {
    code: 2000,
    category: DbErrorCategories.AUTHENTICATION,
    message: 'Authentication failed'
  },
  UNAUTHORIZED: {
    code: 2001,
    category: DbErrorCategories.AUTHENTICATION,
    message: 'Unauthorized access'
  },

  // Operation errors (3000-3999)
  WRITE_ERROR: {
    code: 3000,
    category: DbErrorCategories.OPERATION,
    message: 'Write operation failed'
  },
  READ_ERROR: {
    code: 3001,
    category: DbErrorCategories.OPERATION,
    message: 'Read operation failed'
  },
  DUPLICATE_KEY: {
    code: 3002,
    category: DbErrorCategories.OPERATION,
    message: 'Duplicate key error'
  },

  // Validation errors (4000-4999)
  VALIDATION_ERROR: {
    code: 4000,
    category: DbErrorCategories.VALIDATION,
    message: 'Document validation failed'
  },
  SCHEMA_ERROR: {
    code: 4001,
    category: DbErrorCategories.VALIDATION,
    message: 'Schema validation error'
  },

  // Timeout errors (5000-5999)
  OPERATION_TIMEOUT: {
    code: 5000,
    category: DbErrorCategories.TIMEOUT,
    message: 'Operation timed out'
  }
};

// Map MongoDB error codes to our error codes
const mongoErrorMap = {
  // Connection errors
  'ECONNREFUSED': DbErrorCodes.CONNECTION_FAILED,
  'ETIMEDOUT': DbErrorCodes.CONNECTION_TIMEOUT,
  'ECONNRESET': DbErrorCodes.CONNECTION_CLOSED,
  
  // Authentication errors
  18: DbErrorCodes.AUTH_FAILED, // Authentication failed
  13: DbErrorCodes.UNAUTHORIZED, // Unauthorized

  // Operation errors
  11000: DbErrorCodes.DUPLICATE_KEY, // Duplicate key error
  50: DbErrorCodes.OPERATION_TIMEOUT, // Operation timeout
  
  // Validation errors
  121: DbErrorCodes.VALIDATION_ERROR, // Document failed validation
  'ValidationError': DbErrorCodes.SCHEMA_ERROR
};

// Helper function to create error response
function createDbErrorResponse(error, details = null) {
  let errorCode;
  let statusCode = 500;

  if (error instanceof MongoError) {
    errorCode = mongoErrorMap[error.code] || DbErrorCodes.UNKNOWN;
    
    // Adjust status code based on error category
    switch (errorCode.category) {
      case DbErrorCategories.CONNECTION:
      case DbErrorCategories.TIMEOUT:
        statusCode = 503; // Service Unavailable
        break;
      case DbErrorCategories.AUTHENTICATION:
        statusCode = 401; // Unauthorized
        break;
      case DbErrorCategories.VALIDATION:
        statusCode = 400; // Bad Request
        break;
    }
  } else {
    errorCode = DbErrorCodes.UNKNOWN;
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      error: {
        code: errorCode.code,
        category: errorCode.category,
        message: errorCode.message,
        details: details || error.message,
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(2, 15)
      }
    })
  };
}

// Helper function to log database errors
function logDbError(error, context = {}) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    errorCode: error.code,
    errorName: error.name,
    message: error.message,
    stack: error.stack,
    context: {
      ...context,
      collection: context.collection,
      operation: context.operation,
      query: context.query
    }
  };

  // Log to console (in production this might go to a logging service)
  console.error('[DATABASE_ERROR]', JSON.stringify(errorInfo, null, 2));

  return errorInfo;
}

// Helper function to test database connection and operations
async function testDatabaseHealth(client) {
  const tests = [
    {
      name: 'Connection Test',
      run: async () => {
        await client.db().admin().ping();
        return { status: 'passed', message: 'Successfully connected to database' };
      }
    },
    {
      name: 'Write Test',
      run: async () => {
        const collection = client.db().collection('health_checks');
        const result = await collection.insertOne({ 
          timestamp: new Date(),
          type: 'health_check'
        });
        await collection.deleteOne({ _id: result.insertedId });
        return { status: 'passed', message: 'Write operations working correctly' };
      }
    },
    {
      name: 'Read Test',
      run: async () => {
        const collection = client.db().collection('memories');
        await collection.find().limit(1).toArray();
        return { status: 'passed', message: 'Read operations working correctly' };
      }
    },
    {
      name: 'Index Test',
      run: async () => {
        const collection = client.db().collection('memories');
        await collection.indexes();
        return { status: 'passed', message: 'Index operations working correctly' };
      }
    }
  ];

  const results = [];
  let allPassed = true;

  for (const test of tests) {
    try {
      const result = await test.run();
      results.push({
        name: test.name,
        status: result.status,
        message: result.message
      });
      if (result.status !== 'passed') {
        allPassed = false;
      }
    } catch (error) {
      results.push({
        name: test.name,
        status: 'failed',
        error: error.message
      });
      allPassed = false;
      // Log the error but continue with other tests
      logDbError(error, { test: test.name });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    overall_status: allPassed ? 'healthy' : 'unhealthy',
    tests: results
  };
}

module.exports = {
  DbErrorCategories,
  DbErrorCodes,
  createDbErrorResponse,
  logDbError,
  testDatabaseHealth
};
