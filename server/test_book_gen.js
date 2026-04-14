require('dotenv').config();
const { generateBook } = require('./services/openai');

async function test() {
  console.log('--- STARTING BOOK GEN TEST ---');
  const imageUrls = ['http://localhost:3001/uploads/user_3BPJpFmaBXxfUAyqw0O8kxCTkJT/1775078389962-21178b60.jpeg']; // User's failing image
  const childName = 'Leo';
  const location = 'a magical forest';
  const theme = 'finding a lost star';
  const style = 'Watercolor';
  const pageCount = 10; // Match user's count
  const childFeatures = {
    physical_description: 'A boy with curly blonde hair and blue eyes',
    fantasy_character_description: 'A young wizard with a glowing wand',
    characters: [
      {
        name: 'Leo',
        physical_description: 'A boy with curly blonde hair',
        fantasy_character_description: 'A young wizard'
      }
    ]
  };

  try {
    // Testing with larger max_tokens
    const pages = await generateBook(
      imageUrls,
      childName,
      location,
      theme,
      style,
      pageCount,
      childFeatures,
      5, // age
      '', // customPrompt
      'Mummy',
      null // coverImageUrl
    );

    console.log('--- SUCCESS ---');
    console.log(JSON.stringify(pages, null, 2));
  } catch (err) {
    console.error('--- FAILURE ---');
    console.error(err);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
  }
}

test();
