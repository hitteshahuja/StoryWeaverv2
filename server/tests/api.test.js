const request = require('supertest');
const app = require('../index');

/**
 * API Suite
 * Equivalent to a PHPUnit TestCase
 */
describe('API Endpoints', () => {
  
  // Test Case 1: Health Check
  test('GET /api/health should return 200 and status ok', async () => {
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  // Test Case 2: 404 Handling
  test('GET /api/nonexistent should return 404', async () => {
    const response = await request(app).get('/api/nonexistent');
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Not found');
  });

  // Test Case 3: Public Uploads path (mocking empty dir)
  test('GET /uploads should return 404 for missing files', async () => {
    const response = await request(app).get('/uploads/this-file-does-not-exist.jpg');
    expect(response.status).toBe(404);
  });

});
