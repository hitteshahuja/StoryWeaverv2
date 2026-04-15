module.exports = {
  // Use the Node-specific environment for backend tests
  testEnvironment: 'node',
  
  // Handle ESM modules like 'uuid' by telling Jest to map them to their CJS versions
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid'),
  },

  // Automatically load .env for tests
  setupFiles: ['dotenv/config'],
  
  // Display individual test results
  verbose: true,
};
