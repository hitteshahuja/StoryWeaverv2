require('dotenv').config();
const { Portkey } = require('portkey-ai');
const portkey = new Portkey({
  apiKey: process.env.PORTKEY_API_KEY,
});

async function testModerate() {
  console.log('--- STARTING MODERATION TEST ---');
  const text = "Maya goes to the garden. She sees a bunny. Hop, hop, hop!";
  try {
    const result = await portkey.moderations.create({ 
      input: text,
      provider: 'openai'
    });
    console.log('--- SUCCESS ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('--- FAILURE ---');
    console.error(err);
  }
}

testModerate();
