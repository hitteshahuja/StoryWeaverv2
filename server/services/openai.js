const OpenAI = require('openai');
const { Portkey } = require('portkey-ai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// During testing, apiKey might be empty until mocked
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-tests' });
const portkey = new Portkey({
  apiKey: process.env.PORTKEY_API_KEY || 'pk-dummy-key-for-tests',
  virtualKey: process.env.PORTKEY_VIRTUAL_KEY,
  config: {
    cache: {
      mode: 'simple',
      max_age: 60 * 60 * 24 * 7,
    },
  },
});

// Model configuration from environment (defaults to current values)
const MODELS = {
  textGeneration: process.env.MODEL_TEXT_GENERATION || '@gemini/gemini-2.5-flash-lite',
  imageDescription: process.env.MODEL_IMAGE_DESCRIPTION || 'gpt-4o-mini',
  imageGeneration: process.env.MODEL_IMAGE_GENERATION || '@openai/gpt-image-1',
  tts: process.env.MODEL_TTS || 'tts-1',
  ttsVoice: process.env.MODEL_TTS_VOICE || 'nova',
  moderation: process.env.MODEL_MODERATION || '@gemini/gemini-2.0-flash-lite',
  themeAnalysis: process.env.MODEL_THEME_ANALYSIS || '@gemini/gemini-2.0-flash-lite',
};

/**
 * Attempt to repair truncated JSON from AI model output.
 * Handles unclosed strings, arrays, and objects.
 */
function repairJSON(str) {
  let repaired = str.trim();
  // Count open/close brackets and braces
  let openBraces = 0, openBrackets = 0, inString = false, lastChar = '';
  for (let i = 0; i < repaired.length; i++) {
    const c = repaired[i];
    if (c === '"' && lastChar !== '\\') inString = !inString;
    if (!inString) {
      if (c === '{') openBraces++;
      if (c === '}') openBraces--;
      if (c === '[') openBrackets++;
      if (c === ']') openBrackets--;
    }
    lastChar = c;
  }
  // Close unclosed string
  if (inString) repaired += '"';
  // Remove trailing comma before closing
  repaired = repaired.replace(/,\s*$/, '');
  // Close unclosed brackets/braces
  while (openBrackets > 0) { repaired += ']'; openBrackets--; }
  while (openBraces > 0) { repaired += '}'; openBraces--; }
  return repaired;
}
const SYSTEM_PROMPT = `You are DreamWeaver, a gentle and creative bedtime storyteller for children ages 3-10.

STRICT RULES — you must follow every rule with no exceptions:
1. NEVER include violence, fighting, harm, injury, or anything scary.
2. NEVER include villains who cause real harm, death, or distress.
3. NEVER include adult themes, romance, or anything inappropriate for young children.
4. NEVER use frightening imagery, monsters that cause fear, or jump-scare elements.
5. ALWAYS give the story a warm, comforting, happy ending.
6. ALWAYS weave in age-appropriate themes of: wonder, kindness, friendship, curiosity, nature, and playful adventures suitable for the child's age.
7. ALWAYS end the story with the child (or animal character) feeling safe, loved, and gently drifting off to sleep.
8. Use soft, soothing, poetic language. Write with warmth and gentleness.
9. Keep stories age-appropriate: younger kids (3-5) need simpler words and shorter sentences; older kids (6-10) can handle richer vocabulary and gentle complexity.
10. Keep stories to approximately 250-300 words.
11. Write in second-person ("you") or third-person — never first-person.
12. Incorporate ALL character names provided, the location, and the specific theme.
13. If multiple characters are provided, the story MUST feature all of them. Show their unique friendship, teamwork, or bond. Give each character moments to shine.

Your stories should feel like a warm hug. Think friendly animals, curious exploration, cozy moments, starlit skies, and gentle adventures. Keep it playful and heartwarming, not magical or fantastical.`;

/**
 * Generate a bedtime story based on a photo description and optional details.
 */
async function generateStory(imageDescription, childName = '', location = '', theme = '', customPrompt = '') {
  let userMessage = `Create a bedtime story inspired by this photo: ${imageDescription}.`;

  if (childName) {
    const names = childName.split(/\s+and\s+|,\s*/i).map(n => n.trim()).filter(Boolean);
    if (names.length > 1) {
      userMessage += ` The main characters are: ${names.join(', ')}. The story MUST feature ALL of them — show their friendship, teamwork, and unique bond. Give each character moments to shine.`;
    } else {
      userMessage += ` The main character is a child named ${childName}.`;
    }
  }
  if (location) userMessage += ` The story takes place in or near ${location}.`;
  if (theme) userMessage += ` The story's theme should be: "${theme}".`;
  if (customPrompt) userMessage += ` Additional details from the parent: ${customPrompt}`;

  console.log(portkey);

  // Make the prompt creation call with the variables
  const promptCompletion = await portkey.prompts.completions.create({
    promptID: "pp-generatest-f1d282",
    variables: { "imageDescription": imageDescription }
  })


  const response = await portkey.chat.completions.create({
    model: MODELS.textGeneration,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 600,
    temperature: 0.8,
  });

  const rawContent = response.choices[0].message.content.trim();

  const lines = rawContent.split('\n').filter(Boolean);
  let title = 'A Magical Bedtime Story';
  let content = rawContent;

  if (lines[0].startsWith('#')) {
    title = lines[0].replace(/^#+\s*/, '').trim();
    content = lines.slice(1).join('\n').trim();
  } else if (lines[0].endsWith(':') && lines[0].length < 80) {
    title = lines[0].replace(':', '').trim();
    content = lines.slice(1).join('\n').trim();
  }

  return { title, content };
}

/**
 * Content moderation check using Portkey + Gemini 2.0 Flash-Lite.
 */
async function moderateContent(text) {
  try {
    const response = await portkey.chat.completions.create({
      model: MODELS.moderation,
      messages: [
        {
          role: 'system',
          content: 'You are a child safety moderator. Analyze the text for any violence, scary themes, or inappropriate content. If the text is perfectly safe for a 5-year-old, reply ONLY with the word "SAFE". If it is unsafe, reply with "UNSAFE:" followed by a brief explanation.'
        },
        { role: 'user', content: text }
      ],
      max_tokens: 256,
      temperature: 0,
    });

    const result = response.choices[0].message.content.trim();
    console.log('[MODERATION] Raw result:', result);

    // Reasoning models may wrap the answer in extra text — check if "SAFE" appears
    // and "UNSAFE" does NOT appear
    const upperResult = result.toUpperCase();
    const isSafe = upperResult.includes('SAFE') && !upperResult.includes('UNSAFE');

    if (!isSafe) {
      console.error('[MODERATION] Content flagged as unsafe:', result);
      throw new Error('Content moderation failed');
    }
  } catch (err) {
    if (err.message === 'Content moderation failed') throw err;
    console.warn('[MODERATION] Warning: Portkey moderation check failed/skipped:', err.message);
  }
}

/**
 * Describe an image using GPT-4o's vision capability.
 */
async function describeImage(imageUrl) {
  const visionUrl = await urlToDataUrl(imageUrl);
  const response = await portkey.chat.completions.create({
    model: MODELS.imageDescription,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe this image briefly in 1-2 sentences, focusing on what you see: people, animals, places, objects, and mood. Keep it child-friendly.',
          },
          { type: 'image_url', image_url: { url: visionUrl, detail: 'low' } },
        ],
      },
    ],
    max_tokens: 150,
  });

  const promptCompletion = await portkey.prompts.completions.create({
    promptID: "pp-describeim-6f84c2",
    variables: { "image_url": imageUrl }
  })
  return promptCompletion.choices[0].message.content.trim();
}

/**
 * Extract detailed physical features and personality from a child's photo.
 * Returns a rich description that can be used for story and image generation.
 */
async function extractChildFeatures(imageUrls, childName = 'the child', childAge = null) {
  // Parse multiple names
  const safeChildName = typeof childName === 'string' ? childName : 'the child';
  const names = safeChildName.split(/\s+(?:and|&)\s+|,\s*/i).map(n => n.trim()).filter(Boolean);
  const hasMultiple = names.length > 1;
  const nameList = hasMultiple ? names.join('", "') : safeChildName;
  const ageContext = childAge ? ` (Age: ${childAge})` : '';
  const nameRef = hasMultiple ? `these characters: "${nameList}"${ageContext}` : `the child named "${safeChildName}"${ageContext}`;

  const contentParts = [
    {
      type: 'text',
      text: `Look at the people/characters in these photos carefully. I need you to extract EXACT physical features and personality traits for ${nameRef}.

${hasMultiple ? `There are ${names.length} characters. For EACH character, extract their features separately. If a character named in the list is NOT visibly in the photos (e.g., an imaginary friend or stuffed animal), create a warm description based on what the name suggests.

Return a JSON object with these fields:
- "characters": An array of objects, one per character. Each object has:
  - "name": The character's name
  - "physical_description": A detailed 2-3 sentence description of their appearance: hair color, hair style, eye color, skin tone, approximate age, any distinctive features, body type/build. For non-human characters (animals, imaginary friends), describe their appearance creatively.
  - "clothing": Describe what they are wearing (colors, patterns, style). For non-human characters, describe any accessories or notable features.
  - "personality_traits": 3-4 personality traits based on facial expression, posture, body language, or inferred from context
  - "character_description": A rich, detailed 2-sentence description of how this character would appear as the protagonist of a heartwarming children's book, preserving their EXACT features in a warm, inviting style. MUST use the character's name.
- "group_description": A 1-2 sentence description of how ALL characters look together — their dynamic, relative sizes, and how they relate to each other
- "combined_character_description": A warm, vivid 2-3 sentence description of ALL characters together in a heartwarming scene, suitable for use in image generation prompts. Include each character's name and key features.

IMPORTANT: Be extremely specific about physical features for each visible character. Generic descriptions are NOT acceptable.` : `Return a JSON object with these fields:
- "physical_description": A detailed 2-3 sentence description of the child's appearance: hair color, hair style, eye color, skin tone, approximate age, any distinctive features (dimples, freckles, glasses, etc.), body type/build
- "clothing": Describe what the child is wearing in detail (colors, patterns, style)
- "personality_traits": Based on facial expression, posture, and body language, describe 3-4 personality traits you observe (e.g., adventurous, curious, joyful, shy, energetic)
- "interests": Based on the photo context (background, props, clothing), suggest 2-3 things the child might be interested in
- "character_description": Write a rich, detailed 2-sentence description of how "${safeChildName}" would appear as the protagonist of a heartwarming children's book. This should paint a vivid picture that preserves their EXACT features in a warm, inviting style. Be very specific about physical appearance. You MUST use the name "${safeChildName}" in this description — do NOT invent a different name.

IMPORTANT: Be extremely specific about physical features. Generic descriptions like "a young child" are NOT acceptable. Describe exact colors, shapes, and distinguishing characteristics. This will be used to generate illustrations that must look like this specific child.`}`,
    }
  ];

  imageUrls.forEach(url => {
    contentParts.push({ type: 'image_url', image_url: { url, detail: 'high' } });
  });

  // Convert local URLs to data URLs for AI vision APIs
  for (let i = 1; i < contentParts.length; i++) {
    if (contentParts[i].type === 'image_url') {
      contentParts[i].image_url.url = await urlToDataUrl(contentParts[i].image_url.url);
    }
  }

  const response = await portkey.chat.completions.create({
    model: MODELS.themeAnalysis,
    messages: [
      {
        role: 'user',
        content: contentParts,
      },
    ],
    max_tokens: 16384,
    temperature: 0.3,
    metadata: { _cache: { mode: 'none' } },
  });
  console.log(response.choices[0].message.content)
  console.log('[extractChildFeatures] finish_reason:', response.choices[0]?.finish_reason, 'tokens:', response.usage);

  // If truncated, retry once with even higher limit
  if (response.choices[0]?.finish_reason === 'MAX_TOKENS' || response.choices[0]?.finish_reason === 'length') {
    console.warn('[extractChildFeatures] Output truncated, retrying with higher max_tokens...');
    response = await portkey.chat.completions.create({
      model: MODELS.textGeneration,
      messages: [{ role: 'user', content: contentParts }],
      max_tokens: 32768,
      temperature: 0.3,
      metadata: { _cache: { mode: 'none' } },
    });
    console.log('[extractChildFeatures] Retry finish_reason:', response.choices[0]?.finish_reason, 'tokens:', response.usage);
  }
  const raw = response.choices[0].message.content.trim();
  try {
    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    let cleaned = raw.replace(/^```(?:json)?\n?\n?/i, '').replace(/\n?```\s*$/i, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    let jsonStr = jsonMatch ? jsonMatch[0] : cleaned;
    try {
      const result = JSON.parse(jsonStr);
      
      // Normalize personality_traits to always be an array
      const normalizeTraits = (traits) => {
        if (!traits) return [];
        if (Array.isArray(traits)) return traits;
        if (typeof traits === 'string') {
          return traits.split(',').map(t => t.trim()).filter(Boolean);
        }
        return [];
      };
      
      if (result.personality_traits) {
        result.personality_traits = normalizeTraits(result.personality_traits);
      }
      if (result.characters) {
        result.characters = result.characters.map(c => ({
          ...c,
          personality_traits: normalizeTraits(c.personality_traits)
        }));
      }
      
      return result;
    } catch (firstErr) {
      // Attempt to repair truncated JSON
      console.warn('[extractChildFeatures] JSON parse failed, attempting repair...', firstErr.message);
      const repaired = repairJSON(jsonStr);
      return JSON.parse(repaired);
    }
  } catch (e) {
    console.error('Failed to parse child features JSON', e, raw);
    const names = safeChildName.split(/\s+(?:and|&)\s+|,\s*/i).map(n => n.trim()).filter(Boolean);
    if (names.length > 1) {
      return {
        physical_description: 'A group of bright-eyed children with warm smiles',
        clothing: 'Colorful casual clothes',
        personality_traits: ['curious', 'adventurous', 'kind', 'imaginative'],
        interests: ['nature', 'animals', 'stories'],
        character_description: `Wonderful friends with sparkling eyes and kind hearts — ${names.join(' and ')} — ready for fun adventures together`,
        characters: names.map(name => ({
          name,
          physical_description: `A bright-eyed child named ${name} with a warm smile`,
          clothing: 'Colorful casual clothes',
          personality_traits: ['curious', 'adventurous', 'kind'],
          character_description: `${name}, a bright-eyed child with a warm smile and kind heart`
        })),
        group_description: `${names.join(' and ')} standing together, ready for adventure`,
        combined_character_description: `${names.join(' and ')} their friendship lighting up the scene`
      };
    }
    return {
      physical_description: 'A bright-eyed child with a warm smile',
      clothing: 'Colorful casual clothes',
      personality_traits: ['curious', 'adventurous', 'kind', 'imaginative'],
      interests: ['nature', 'animals', 'stories'],
      character_description: 'A curious and kind child with sparkling eyes, ready for fun adventures',
      character_name_suggestion: 'The Little Explorer'
    };
  }
}

/**
 * Infer 3 child-friendly, age-appropriate story themes based on an image.
 * Avoid magical/fantasy elements — keep themes grounded in relatable, heartwarming childhood experiences.
 */
async function analyzeImageForThemes(imageUrl, childName = '', location = '') {
  let contextHint = 'Look at this image.';
  if (childName) {
    const names = childName.split(/\s+(?:and|&)\s+|,\s*/i).map(n => n.trim()).filter(Boolean);
    if (names.length > 1) {
      contextHint += ` The story's main characters are ${names.join(' and ')}. Themes should involve their friendship, curiosity, or playful adventure together.`;
    } else {
      contextHint += ` The story's main character is named ${childName}.`;
    }
  }
  if (location) contextHint += ` The story is set in or near ${location}.`;

  const visionUrl = await urlToDataUrl(imageUrl);

  const response = await portkey.chat.completions.create({
    model: MODELS.themeAnalysis,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${contextHint} Suggest exactly 3 child-friendly, age-appropriate bedtime story themes inspired by the image and context. AVOID magical or fantastical themes — focus on heartwarming, relatable themes like friendship, curiosity, exploration, kindness, nature, or cozy domestic adventures. Themes should feel warm and comforting, not fantastical. Return ONLY a JSON array of 3 strings.`,
          },
          { type: 'image_url', image_url: { url: visionUrl, detail: 'low' } },
        ],
      },
    ],
    max_tokens: 3000,
    temperature: 0.7,
  });

  const raw = response.choices[0].message.content.trim();
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
  } catch (e) {
    return ["A cozy backyard adventure", "Friendship in nature", "A gentle exploration"];
  }
}

/**
 * Suggest 3 visual styles/filters based on the image mood.
 */
async function suggestVisualStyles(imageUrl) {
  const visionUrl = await urlToDataUrl(imageUrl);
  const response = await portkey.chat.completions.create({
    model: MODELS.textGeneration,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Look at this image. Suggest exactly 3 visual art styles (like Watercolor, Pixar-style, etc.) that would match its mood. For each, provide a name, a brief 1-sentence description, an emoji icon, and a CSS filter string (e.g. saturate(1.2) contrast(0.9)). Return ONLY a JSON array of 3 objects with keys: name, description, icon, cssFilter.',
          },
          { type: 'image_url', image_url: { url: visionUrl, detail: 'low' } },
        ],
      },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  const raw = response.choices[0].message.content.trim();
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
  } catch (e) {
    return [
      { name: 'Watercolor', description: 'Soft, artistic & flowing', icon: '🎨', cssFilter: 'saturate(1.2) contrast(0.9)' },
      { name: 'Pixar-style', description: '3D animated & vibrant', icon: '🎬', cssFilter: 'saturate(1.3) contrast(1.1) brightness(1.05)' },
      { name: 'Classic Crayon', description: 'Hand-drawn with love', icon: '🖍️', cssFilter: 'contrast(1.1) grayscale(0.2)' },
    ];
  }
}

/**
 * Builds the feature block for the book generation prompt.
 * Handles both single-child and multi-child feature extraction results.
 */
function buildFeatureBlock(childFeatures, childName) {
  const ensureArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const names = childName.split(/\s+(?:and|&)\s+|,\s*/i).map(n => n.trim()).filter(Boolean);
  const hasMultiple = names.length > 1;

  if (hasMultiple && childFeatures.characters && childFeatures.characters.length > 0) {
    const charBlocks = childFeatures.characters.map((c, i) => `
CHARACTER ${i + 1} — ${c.name}:
- Physical: ${c.physical_description || 'Default child appearance'}
- Clothing: ${c.clothing || 'Colorful casual clothes'}
- Personality: ${ensureArray(c.personality_traits).join(', ')}
- Character Description: ${c.character_description || ''}`).join('\n');

    return `
CHARACTERS' EXTRACTED FEATURES (use these EXACTLY in every image_prompt):
${charBlocks}
${childFeatures.group_description ? `\n- Group Dynamic: ${childFeatures.group_description}` : ''}
${childFeatures.combined_character_description ? `\n- Combined Scene Description: ${childFeatures.combined_character_description}` : ''}

CRITICAL: ALL ${childFeatures.characters.length} characters MUST appear in EVERY image_prompt and EVERY story page. They are on this adventure TOGETHER.`;
  }

  // Single child fallback
  return `
CHILD'S EXTRACTED FEATURES (use these EXACTLY in every image_prompt):
- Physical: ${childFeatures.physical_description || 'Default child appearance'}
- Clothing: ${childFeatures.clothing || 'Colorful casual clothes'}
- Personality: ${ensureArray(childFeatures.personality_traits).join(', ')}
- Character Description: ${childFeatures.character_description || ''}
`;
}

/**
 * Generates a multi-page children's book based on a sequence of images
 */
async function generateBook(imageUrls,
  childName = 'the little explorer', location = 'a cozy home and garden',
  theme = 'adventure', style = 'Watercolor', pageCount = 10,
  childFeatures = null, childAge = null, customPrompt = '', dedicatedBy = 'Mummy and Daddy',
  coverImageUrl = null) {
  const age = childAge || 5; // Default to 5 if not provided

  // Age-appropriate writing guidelines
  let ageGuidelines = '';
  if (age <= 2) {
    ageGuidelines = `AGE-APPROPRIATE WRITING (age ${age} — toddler): Use VERY simple words (1-2 syllables). Short sentences (3-6 words). Focus on sounds, colors, animals, and repetition. E.g., "The bunny hops. Hop, hop, hop!"`;
  } else if (age <= 4) {
    ageGuidelines = `AGE-APPROPRIATE WRITING (age ${age} — preschooler): Use simple, familiar words. Short sentences (5-10 words). Include repetition, rhymes, and onomatopoeia. E.g., "Luna found a sparkly stone. It glowed like the moon!"`;
  } else if (age <= 6) {
    ageGuidelines = `AGE-APPROPRIATE WRITING (age ${age} — early reader): Use clear, engaging language. Medium sentences (8-15 words). Include simple dialogue and gentle humor. E.g., "'Look!' said Milo, pointing at the golden butterfly dancing through the trees."`;
  } else if (age <= 9) {
    ageGuidelines = `AGE-APPROPRIATE WRITING (age ${age} — middle childhood): Use richer vocabulary and varied sentence structure. Include descriptive details, character emotions, and light suspense. E.g., "Aria crept closer, her heart fluttering like a trapped bird. The ancient door creaked open, revealing a garden bathed in silver moonlight."`;
  } else {
    ageGuidelines = `AGE-APPROPRIATE WRITING (age ${age} — pre-teen): Use sophisticated vocabulary and complex sentence structures. Include deeper themes, nuanced emotions, and vivid imagery. E.g., "The forest whispered secrets only she could hear — ancient melodies woven through rustling leaves and dappled starlight."`;
  }

  const featureBlock = childFeatures ? buildFeatureBlock(childFeatures, childName) : '';

  // Determine protagonist text based on whether there are multiple characters
  const names = childName.split(/\s+(?:and|&)\s+|,\s*/i).map(n => n.trim()).filter(Boolean);
  const hasMultiple = names.length > 1;
  const protagonistLabel = hasMultiple ? 'Protagonists' : 'Protagonist';
  const protagonistNames = hasMultiple ? names.join('", "') : childName;
  const allNamesList = hasMultiple ? names.join(', ') : childName;
  const characterRef = hasMultiple ? `all ${names.length} characters (${names.join(', ')})` : childName;
  const closingLine = hasMultiple
    ? `And ${names.join(' and ')} drifted off to sleep, smiling softly after their wonderful day together...`
    : `And ${childName} drifted off to sleep, smiling softly after their wonderful day...`;

  const SYSTEM_PROMPT_BOOK = `You are a world-class children's book author and illustrator. 
${ageGuidelines}

${featureBlock}

Format your response as a JSON array of ${pageCount} objects. Each object must have:
- "page": Number (1 to ${pageCount})
- "type": "title" (page 1), "story" (pages 2 to ${pageCount - 1}), or "conclusion" (page ${pageCount}).
- "content": The text for that page. Story pages should be approx 40-60 words each. 
  STYLE: Write in simple, warm prose. Do NOT force rhymes. Do NOT use forward slashes (/) to separate lines — just use standard sentences.
- "image_prompt": A highly detailed prompt for DALL-E 3 that is a DIRECT VISUAL DEPICTION of the scene. Include the characters' full physical descriptions (hair color, hairstyle, eyes, clothing) in EVERY prompt.
  IMPORTANT: The title page (page 1) MUST have an image_prompt for a beautiful cover illustration. The conclusion page (page ${pageCount}) MUST have image_prompt set to null.

Structure:
- Page 1 (TITLE PAGE): 
  - "content": ONLY the book title (2-5 words, e.g. "${hasMultiple ? names.join(' & ') + "'s" : childName + "'s"} Great Quest").
  - "image_prompt": A stunning, centered book cover illustration. COMPOSITION: Keep main characters centered with plenty of space around the edges to avoid cropping. The cover should depict ${characterRef} in a warm, heartwarming scene related to "${theme}". Art style: "${style}". Theme: "${theme}".
  - "dedication": "Created by ${dedicatedBy}"
- Pages 2 to ${pageCount - 1} (STORY PAGES): The heart of the adventure. ${hasMultiple ? `Feature ALL characters: ${allNamesList}.` : `Show ${childName}'s personality.`}
- Page ${pageCount} (THE END PAGE):
  - "content": "${closingLine}"
  - "image_prompt": null

${protagonistLabel}: "${protagonistNames}". Use these exact names. Always include their physical traits from the description in every image prompt.
Setting: "${location}" with a theme of "${theme}".
Art Style: "${style}".

STRICT: Only return the JSON array. No other text.`;

  const userMessageContent = [
    {
      type: 'text',
      text: `Create a ${pageCount}-page book for "${allNamesList}" in a "${style}" style. 
The theme is "${theme}" and the story takes place in "${location}".
There are ${imageUrls.length} images to inspire the story journey. Spread the images across the story pages as appropriate.

CRITICAL: You are looking at photos of REAL ${hasMultiple ? 'people/characters' : 'child'}. You must:
1. Study their exact appearance from the photos (hair, eyes, face, build, clothing)
2. Use the pre-extracted feature description provided in the system prompt
3. Start EVERY image_prompt with the full physical description(s) so DALL-E 3 draws ${hasMultiple ? 'ALL the specific characters' : 'this SPECIFIC child'}
4. Make the story reflect the ${hasMultiple ? "characters'" : "child's"} actual personality traits, not generic traits
5. ${hasMultiple ? `The protagonists are "${allNamesList}" — you MUST use these exact names throughout the story text, in dialogue, narration, and descriptions. ALL characters must be present in EVERY scene. They are on this adventure TOGETHER.` : `The protagonist's name is "${childName}" — you MUST use this exact name throughout the story text, in dialogue, narration, and descriptions. Never use generic terms like "the child" or "the little one" when referring to the protagonist. Always use "${childName}".`}
${customPrompt ? `\n6. Additional instructions from the parent: ${customPrompt}` : ''}`
    }
  ];

  imageUrls.forEach(url => {
    userMessageContent.push({ type: 'image_url', image_url: { url, detail: 'high' } });
  });

  // Convert local URLs to data URLs for AI vision APIs
  // Limit to first 4 images to stay within proxy/model limits while still providing context
  const limitedImages = userMessageContent.slice(1, 5);
  for (let i = 0; i < limitedImages.length; i++) {
    if (limitedImages[i].type === 'image_url') {
      limitedImages[i].image_url.url = await urlToDataUrl(limitedImages[i].image_url.url);
      limitedImages[i].image_url.detail = 'low';
    }
  }

  const fullUserText = `${SYSTEM_PROMPT_BOOK}\n\nUSER REQUEST:\n${userMessageContent[0].text}`;
  const finalContent = [
    { type: 'text', text: fullUserText },
    ...limitedImages
  ];

  let response;
  try {
    response = await portkey.chat.completions.create({
      model: MODELS.textGeneration,
      messages: [{ role: 'user', content: finalContent }],
      max_tokens: 16384,
      temperature: 0.8,
    });
  } catch (err) {
    response = await portkey.chat.completions.create({
      model: MODELS.textGeneration,
      messages: [{ role: 'user', content: `${SYSTEM_PROMPT_BOOK}\n\nUSER REQUEST (Safe Fallback): ${userMessageContent[0].text}` }],
      max_tokens: 16384,
      temperature: 0.7,
    });
  }

  const raw = response.choices[0]?.message?.content || '';

  // Handle array content (Gemini multimodal responses)
  let rawText = '';
  if (typeof raw === 'string') {
    rawText = raw.trim();
  } else if (Array.isArray(raw)) {
    rawText = raw.filter(p => p.type === 'text').map(p => p.text).join('\n').trim();
  }

  let pages = [];
  try {
    // Robust JSON extraction: find the first '[' and the last ']'
    let cleaned = rawText.trim();
    const startIdx = cleaned.indexOf('[');
    const endIdx = cleaned.lastIndexOf(']');

    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
      console.error('[BOOK GEN] No JSON array found in output. Start:', startIdx, 'End:', endIdx);
      console.error('[BOOK GEN] Raw response snippet:', rawText.substring(0, 1000));
      throw new Error('No valid story content generated');
    }

    cleaned = cleaned.substring(startIdx, endIdx + 1);

    // Try to fix common JSON issues (like trailing commas before closing brackets)
    // This is simple but handles the most common AI JSON hallucination
    const fixableJson = cleaned
      .replace(/,\s*\]/g, ']')
      .replace(/,\s*\}/g, '}');

    pages = JSON.parse(fixableJson);
  } catch (e) {
    console.error('[BOOK GEN] JSON PARSE FAILED:', e.message);
    console.error('[BOOK GEN] Full raw output for debugging:', rawText);
    throw new Error('Book generation failed - Invalid format');
  }

  const sanitizedPages = pages.map((page, idx) => ({
    page: page.page || idx + 1,
    type: page.type || (page.page === 1 ? 'title' : (idx === pages.length - 1 ? 'conclusion' : 'story')),
    content: page.content || '',
    image_prompt: page.image_prompt || '',
    dedication: page.dedication || null,
  }));

  const clampedPages = sanitizedPages.slice(0, pageCount);
  let imgIdx = 0;
  const hasMultipleChars = childFeatures?.characters?.length > 1;
  let childDescPrefix = '';
  if (hasMultipleChars) {
    childDescPrefix = childFeatures.combined_character_description || childFeatures.characters.map(c => c.character_description).join('. ');
  } else if (childFeatures?.character_description) {
    childDescPrefix = childFeatures.character_description;
  }
  // Exclude cover image from story page pool if user selected one
  const storyImageUrls = coverImageUrl ? imageUrls.filter(u => u !== coverImageUrl) : imageUrls;

  return clampedPages.map(p => {
    // Sanitize type to match DB CHECK constraint
    let sanitizedType = 'story';
    const typeStr = (p.type || '').toLowerCase();
    if (typeStr.includes('title') || typeStr.includes('intro')) sanitizedType = 'title';
    else if (typeStr.includes('conclusion') || typeStr.includes('end')) sanitizedType = 'conclusion';

    // The End page: no image
    if (sanitizedType === 'conclusion') {
      return {
        ...p,
        type: sanitizedType,
        image_url: null,
        image_prompt: null,
        dedication: p.dedication || null
      };
    }

    // Title page: use selected cover image or generate AI cover
    if (sanitizedType === 'title') {
      let finalPrompt = p.image_prompt;
      if (!finalPrompt || finalPrompt.length < 50) {
        finalPrompt = `A beautiful book cover illustration in ${style} style for a children's storybook. The cover shows ${allNamesList} in a warm, heartwarming scene related to "${theme}". ${hasMultiple ? `All characters (${allNamesList}) must be visible together.` : ''} Child-friendly, vibrant, cozy.`;
      }
      return {
        ...p,
        type: sanitizedType,
        image_url: coverImageUrl || null,
        image_prompt: coverImageUrl ? null : finalPrompt,
        dedication: p.dedication || `Created by ${dedicatedBy}`
      };
    }

    // Story pages: build image prompt with child description alignment
    let finalPrompt = p.image_prompt;
    if (!finalPrompt || finalPrompt.length < 50) {
      finalPrompt = `${childDescPrefix ? childDescPrefix + ', ' : ''}${allNamesList} in this scene: ${p.content}`;
    } else if (childDescPrefix && !names.some(n => finalPrompt.toLowerCase().includes(n.toLowerCase()))) {
      finalPrompt = `${childDescPrefix}. Scene: ${finalPrompt}`;
    }

    const contentSummary = p.content.substring(0, 150);
    finalPrompt = `${finalPrompt}. This illustration shows: ${contentSummary}`;

    if (imgIdx < storyImageUrls.length) {
      return {
        ...p,
        type: sanitizedType,
        image_url: storyImageUrls[imgIdx++],
        image_prompt: finalPrompt
      };
    }
    return {
      ...p,
      type: sanitizedType,
      image_prompt: finalPrompt
    };
  });
}

const { v4: uuidv4 } = require('uuid');
const { saveBase64, urlToDataUrl } = require('./localStorage');

/**
 * Generate a brand-new AI image based on a prompt.
 * Supports Gemini image models (via Google SDK) and OpenAI DALL-E (via Portkey).
 */
async function generateAIImage(prompt, style = 'Watercolor') {
  const fullPrompt = `A beautiful children's book illustration in the precise art style of: ${style}. Vibrant, child-friendly, consistent. NO text, no words, no letters in the image. SCENE DETAILS: ${prompt}. All characters must maintain identical physical features throughout.`;

  try {
    // Gemini image models — use Google SDK directly
    if (MODELS.imageGeneration.includes('gemini') || MODELS.imageGeneration.includes('imagen')) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const modelName = MODELS.imageGeneration.replace(/^@[^/]+\//, '');
      const model = genAI.getGenerativeModel({ model: modelName });

      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          const result = await model.generateContent(fullPrompt);
          const response = await result.response;
          const parts = response.candidates?.[0]?.content?.parts;

          if (parts) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                const mime = part.inlineData.mimeType || 'image/png';
                const ext = mime.includes('jpeg') ? 'jpg' : 'png';
                const folder = 'generated/images';
                return await saveBase64(`data:${mime};base64,${part.inlineData.data}`, folder, `${uuidv4()}.${ext}`);
              }
            }
          }
          break; // If we got here but no image, model didn't return one (don't retry unless it's a fetch error)
        } catch (err) {
          attempts++;
          if (attempts >= maxAttempts) throw err;
          console.warn(`[IMAGE GEN] Attempt ${attempts} failed, retrying in 2s...`, err.message);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.error('[IMAGE GEN] No image in Gemini response');
      return null;
    }

    // OpenAI DALL-E uses images.generate via Portkey
    const response = await portkey.images.generate({
      model: MODELS.imageGeneration,
      prompt: fullPrompt,
      response_format: 'b64_json',
    });

    const data = response.data || (response.body && response.body.data);
    if (!data || !data[0]) throw new Error('Incomplete image generation response');

    const firstImage = data[0];
    if (firstImage.url) return firstImage.url;
    if (firstImage.b64_json) {
      return await saveBase64(firstImage.b64_json, 'generated/images', `${uuidv4()}.png`);
    }

    return null;
  } catch (err) {
    console.error('[IMAGE GEN ERROR]', err.message || err);
    return null;
  }
}

/**
 * Generate speech audio from text using OpenAI TTS.
 * Returns a Buffer of MP3 audio data.
 */
async function generateSpeech(text) {
  const response = await openai.audio.speech.create({
    model: MODELS.tts,
    voice: MODELS.ttsVoice,
    input: text,
    response_format: 'mp3',
  });
  return Buffer.from(await response.arrayBuffer());
}

module.exports = {
  generateStory,
  generateBook,
  moderateContent,
  describeImage,
  analyzeImageForThemes,
  extractChildFeatures,
  suggestVisualStyles,
  generateAIImage,
  generateSpeech,
  generateEmbedding
};

/**
 * Generate an embedding vector for text using Gemini's text-embedding-004.
 * @param {string} text 
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          outputDimensionality: 768
        })
      }
    );
    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.embedding.values;
  } catch (err) {
    console.error('[GEMINI EMBEDDING ERROR]', err);
    return null;
  }
}
