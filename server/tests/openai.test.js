const { Portkey } = require('portkey-ai');

// ─── Global Mock Setup ───────────────────────────────────────
// We must mock the library BEFORE we require the service file
jest.mock('portkey-ai');

// This is our high-level mock structure
const mockPortkey = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

// Ensure the Portkey constructor always returns our mock
Portkey.mockImplementation(() => mockPortkey);

// NOW we can safely require the service we are testing
const { generateBook } = require('../services/openai');

describe('OpenAI Service - generateBook', () => {

  beforeEach(() => {
    // Clear history between tests so counters (toHaveBeenCalledTimes) are accurate
    jest.clearAllMocks();
    
    // Default "Green Path" response
    mockPortkey.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify([
            { page: 1, type: 'title', content: 'Mock Title', image_prompt: 'Mock Image' },
            { page: 2, type: 'story', content: 'Mock Story', image_prompt: 'Mock Image 2' }
          ])
        }
      }]
    });
  });

  test('should generate a book with the correct number of pages', async () => {
    // Input parameters
    const imageUrls = ['http://example.com/photo.jpg'];
    const childName = 'Timmy';
    const location = 'Mars';
    const theme = 'Space';
    const style = 'Watercolor';
    const pageCount = 2;

    const result = await generateBook(imageUrls, childName, location, theme, style, pageCount);

    // Assertions
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('content', 'Mock Title');
    expect(result[1]).toHaveProperty('type', 'story');
    
    // Safety check: Ensure the AI was called at least once
    expect(mockPortkey.chat.completions.create).toHaveBeenCalled();
  });

  test('should handle AI parsing failure gracefully', async () => {
    // Simulate the AI returning gibberish that isn't JSON
    mockPortkey.chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: 'This is not JSON!' } }]
    });

    // We expect it to throw our custom error
    await expect(generateBook([], 'Timmy', 'Mars', 'Space', 'Watercolor', 2))
      .rejects.toThrow('Book generation failed - Invalid format');
  });

});
