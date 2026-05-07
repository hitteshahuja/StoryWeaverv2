const OpenAI = require('openai');
const { Portkey } = require('portkey-ai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Import centralized prompts
const {
  SYSTEM_PROMPT_STORY,
  AGE_GUIDELINES,
  MODERATION_PROMPT,
  IMAGE_DESCRIPTION_PROMPT,
  FEATURE_EXTRACTION_PROMPT_SINGLE,
  IMAGE_GENERATION_PROMPT,
} = require('../config/prompts');

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
  textGeneration: process.env.MODEL_TEXT_GENERATION || 'gpt-4o-mini', // Upgraded from gemini-2.5-flash-lite for better storytelling
  imageDescription: process.env.MODEL_IMAGE_DESCRIPTION || 'gpt-4o-mini',
  imageGeneration: process.env.MODEL_IMAGE_GENERATION || '@openai/gpt-image-1',
  tts: process.env.MODEL_TTS || 'tts-1',
  ttsVoice: process.env.MODEL_TTS_VOICE || 'nova',
  moderation: process.env.MODEL_MODERATION || '@gemini/gemini-3-flash-preview',
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

// SYSTEM_PROMPT is now imported from prompts.js

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
      { role: 'system', content: SYSTEM_PROMPT_STORY },
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
          content: MODERATION_PROMPT
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
            text: IMAGE_DESCRIPTION_PROMPT,
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
- "setting_context": Describe the actual location/setting visible in the photos (e.g., "museum with exhibits and statues", "beach with sand and ocean", "park with trees and playground", "home with furniture"). Be specific and accurate — this will help the story match the real environment.
- "character_description": Write a rich, detailed 2-sentence description of how "${safeChildName}" would appear as the protagonist of a heartwarming children's book. This should paint a vivid picture that preserves their EXACT features in a warm, inviting style. Be very specific about physical appearance. You MUST use the name "${safeChildName}" in this description — do NOT invent a different name.

IMPORTANT: Be extremely specific about physical features. Generic descriptions like "a young child" are NOT acceptable. Describe exact colors, shapes, and distinguishing characteristics. This will be used to generate illustrations that must look like this specific child. Also, accurately identify the setting — don't guess or invent locations.`}`,
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
    max_tokens: 10000,
    temperature: 0.3,
    metadata: { _cache: { mode: 'none' } },
  });
  console.log(response.choices[0].message.content)

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
${childFeatures.setting_context ? `\n- ACTUAL PHOTO SETTING: ${childFeatures.setting_context} — The story MUST respect this real-world context. Do not misidentify objects or locations.` : ''}

CRITICAL: ALL ${childFeatures.characters.length} characters MUST appear in EVERY image_prompt and EVERY story page. They are on this adventure TOGETHER.`;
  }

  // Single child fallback
  return `
CHILD'S EXTRACTED FEATURES (use these EXACTLY in every image_prompt):
- Physical: ${childFeatures.physical_description || 'Default child appearance'}
- Clothing: ${childFeatures.clothing || 'Colorful casual clothes'}
- Personality: ${ensureArray(childFeatures.personality_traits).join(', ')}
- Character Description: ${childFeatures.character_description || ''}
${childFeatures.setting_context ? `\n- ACTUAL PHOTO SETTING: ${childFeatures.setting_context} — The story MUST respect this real-world context. Do not misidentify objects or locations.` : ''}
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
    ageGuidelines = `AGE-APPROPRIATE WRITING (age ${age} — toddler): Use VERY simple words (1-2 syllables). Short sentences (3-6 words). Focus on sounds, colors, animals, and natural rhythm. Use gentle action words. E.g., "The bunny hops. Maya claps. The sun is warm."`;
  } else if (age <= 4) {
    ageGuidelines = `AGE-APPROPRIATE WRITING (age ${age} — preschooler): Use simple, familiar words. Short sentences (5-10 words). Include natural rhythm and occasional rhymes. Use sensory details (soft, cold, bright). E.g., "Luna found a sparkly stone. It glowed like the moon. She held it close and smiled."`;
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

const SYSTEM_PROMPT_BOOK = `Act as a world-class children's book author specializing in 'read-aloud' bedtime stories for toddlers and preschoolers.
${ageGuidelines}

${featureBlock}
Your goal is to turn image descriptions into a lyrical, sensory-rich journey. Instead of just listing actions, use sensory language from ${theme}.

LITERARY CRAFT RULES:
- THE NARRATIVE TAPER: The story must physically slow down. Pages 2-3 should be active and curious; the final pages should use shorter, softer, and more rhythmic sentences to mimic the transition to sleep.
- SENSORY ANCHORING: Use the 'Rule of Three' for descriptions (e.g., "The moss was soft, springy, and emerald green").
- ONOMATOPOEIA: Include gentle, interactive sounds (e.g., "Squelch-squelch," "Ribbit-tap," or "Hush-shush") that a parent and child can mimic together.
- EMOTIONAL ARC: Ensure ${childName} has an internal feeling—curiosity, wonder, or a desire for friendship—rather than just performing tasks.
- AVOID mechanical repetition or formulaic "The [Subject] [Verb]" structures.

WRITING STYLE RULES:
- Write like a real published children's book — natural, flowing prose.
- Use varied sentence structures and natural rhythm suitable for reading aloud.
- Focus on textures (fuzzy, cool, crinkly) and atmosphere (shimmering, golden, quiet).
- Keep language age-appropriate but literary, not clinical or simplistic.

NARRATIVE STRUCTURE & CONTINUITY:
- Create ONE cohesive story with a clear beginning, middle, and end
- Maintain setting continuity — the story should take place in ONE primary location
- Do NOT jump between unrelated locations (museum → park → bedroom) without clear transitions
- Each page should flow naturally to the next, building a unified narrative arc
- If photos show different settings, choose the MOST PROMINENT one and keep the story there
- The story should feel like one complete adventure, not disconnected scenes

Format your response as a JSON array of ${pageCount} objects. Each object must have:
- "page": Number (1 to ${pageCount})
- "type": "title", "story", or "conclusion".
- "content": The text for that page. Story pages should be 40-60 words of warm, evocative prose.
- "image_prompt": A ONE-SENTENCE description of a single frozen moment. 
  STRICT RULES:
  1. Exactly ONE sentence. Focus on a single state (e.g., "${childName} is peering into the water").
  2. ABSOLUTELY NO TEXT IN ILLUSTRATIONS: The image_prompt must NEVER request text, words, letters, captions, labels, speech bubbles, or any written language. Illustrations are pure visual art only. Text will be added separately on the page layout. If you include text requests in image_prompt, the illustration will fail.
  3. CHARACTER APPEARANCE CONSISTENCY - CRITICAL: ${childName} MUST look IDENTICAL in EVERY illustration. You MUST include these EXACT details in EVERY SINGLE image_prompt:
     - Hair: [exact color, style, length from extracted features]
     - Eyes: [exact color from extracted features]
     - Clothing: [EXACT outfit - if wearing a black tiger shirt and blue shorts on page 1, MUST wear the SAME black tiger shirt and blue shorts on ALL pages]
     - Skin tone: [exact description from extracted features]
     - Distinctive features: [glasses, freckles, dimples, etc. from extracted features]
     DO NOT change clothing colors, patterns, or styles between pages. DO NOT add or remove accessories. The character must be visually identical across all illustrations.
  4. ${hasMultiple ? `CHARACTER COUNT: Show ALL ${names.length} characters together.` : `CHARACTER COUNT: Show ONLY ${childName}.`}
  5. OBJECT & PROP CONSISTENCY - CRITICAL: If a specific object appears in the story (toy truck, stuffed animal, musical instrument, hat, etc.), it MUST maintain IDENTICAL appearance across ALL pages where it appears:
     - Colors: If a truck is green and blue on page 1, it MUST be green and blue on ALL subsequent pages
     - Design: If a toy has specific features (dump truck bed, wheels, patterns), maintain those EXACT features
     - DO NOT introduce new objects that weren't mentioned in previous pages
     - DO NOT change object colors, shapes, or designs between pages
     - If an object is described on page 1 (e.g., "green and blue toy truck"), include that EXACT description in image_prompts for ALL pages where it appears
     - Track ALL recurring objects and maintain their visual identity throughout the entire story
  6. SIZE & SCALE CONSISTENCY: If an object is described as "giant", "huge", "towering", or "massive" in one page, it MUST remain that size in ALL subsequent pages. Do NOT make a giant frog suddenly small or a towering statue suddenly tiny. Maintain relative proportions throughout the story. If the child is looking UP at something, it should stay large enough to look up at.
  7. ART STYLE CONSISTENCY: The art style "${style}" MUST be applied to ALL illustrations INCLUDING THE TITLE PAGE. Every page should have the same visual style. Do NOT use a different style for the cover/title page.

Structure:
- Page 1 (TITLE PAGE): 
  - "content": ONLY the book title (e.g. "${childName}'s Secret Garden").
  - "image_prompt": One-sentence cover depicting ${characterRef} centered and happy in "${location}". Art Style: "${style}".
  - "dedication": "Created by ${dedicatedBy}"
- Pages 2 to ${pageCount - 1} (STORY PAGES): One-sentence description of the character in a single pose. CRITICAL: Every page MUST be in "${location}" - do NOT change locations.
- Page ${pageCount} (THE END PAGE):
  - "content": A final, whispering closing line like "${closingLine}" - still in "${location}".
  - "image_prompt": null

${protagonistLabel}: "${protagonistNames}". Repeat physical traits and current outfit in EVERY image_prompt.
Setting: "${location}" - EVERY SINGLE PAGE must be in this location. Do NOT introduce forest, home, park, or any other location.
Art Style: "${style}".

LOCATION ENFORCEMENT: Before writing each page, remind yourself: "This page is in ${location}." Do NOT let the story drift to other locations.

STRICT: Only return the JSON array. Every image_prompt MUST be exactly one single sentence describing a single frozen moment. Any multi-sentence prompt or list of actions is a failure.`;

  const userMessageContent = [
    {
      type: 'text',
      text: `Create a ${pageCount}-page book for "${allNamesList}" in a "${style}" style. 
The theme is "${theme}" and the story takes place in "${location}".
There are ${imageUrls.length} images to inspire the story journey.

SETTING LOCK - ABSOLUTELY CRITICAL:
- FIRST: Analyze all photos and identify the PRIMARY setting (museum, park, home, beach, etc.)
- THEN: The ENTIRE story MUST take place in that ONE setting
- FORBIDDEN: Jumping between locations (museum → forest → home)
- FORBIDDEN: Inventing new locations not visible in the photos
- REQUIRED: If the primary setting is a museum, ALL ${pageCount} pages happen in the museum
- REQUIRED: If the primary setting is a park, ALL ${pageCount} pages happen in the park
- EXCEPTION: Only if the user explicitly requests a journey (e.g., "museum then home"), use clear transitions
- The story arc should be: arrival → exploration → discovery → wonder → rest (all in ONE place)

NARRATIVE COHERENCE RULES:
- The story MUST have a clear beginning, middle, and end in ONE primary setting
- Each page must reference the SAME location established on page 1
- Do NOT introduce new locations after page 1
- Maintain logical flow: each page should naturally lead to the next IN THE SAME PLACE
- The story should feel like ONE cohesive adventure in ONE location

VISUAL CONSISTENCY RULES:
- Maintain SIZE and SCALE consistency for all objects throughout the story
- If something is "giant", "huge", "towering", or "massive" on one page, it stays that size on ALL pages
- Do NOT make a giant frog suddenly small, or a towering statue suddenly tiny
- Keep relative proportions consistent: if the child looks UP at something, it should remain large enough to look up at
VISUAL CONSISTENCY RULES:
- Maintain SIZE and SCALE consistency for all objects throughout the story
- If something is "giant", "huge", "towering", or "massive" on one page, it stays that size on ALL pages
- Do NOT make a giant frog suddenly small, or a towering statue suddenly tiny
- Keep relative proportions consistent: if the child looks UP at something, it should remain large enough to look up at
- Important objects (statues, animals, landmarks) should maintain their visual prominence across all illustrations

OBJECT & PROP CONSISTENCY - CRITICAL:
- Track ALL recurring objects (toys, animals, instruments, accessories) and maintain their EXACT appearance across pages
- If a toy truck is green and blue on page 1, it MUST be green and blue on ALL pages
- If a character has a stuffed bear, it must look the same in every illustration
- DO NOT introduce random new objects (hats, toys, accessories) that weren't mentioned in the story
- DO NOT change object colors, patterns, or designs between pages
- When describing objects in image_prompts, use the EXACT SAME description from the first page where they appeared
- Example: If page 1 says "green and blue toy dump truck", ALL subsequent pages must say "green and blue toy dump truck"
- This applies to: toys, stuffed animals, musical instruments, accessories, vehicles, and any other props

CHARACTER APPEARANCE CONSISTENCY - ABSOLUTELY CRITICAL:
- ${childName} MUST look IDENTICAL in every single illustration
- CLOTHING: If ${childName} wears a black tiger shirt and blue shorts on page 1, they wear the EXACT SAME black tiger shirt and blue shorts on ALL pages
- DO NOT change shirt color (black → gray), pattern changes, or add/remove clothing items
- DO NOT change shorts style (solid → striped) or add/remove shoes/socks
- HAIR: Must be the exact same color, style, and length in every image
- EYES: Must be the exact same color in every image
- SKIN TONE: Must be consistent across all illustrations
- ACCESSORIES: If present on page 1 (glasses, hat, etc.), must be present on ALL pages
- Every image_prompt MUST explicitly describe the COMPLETE outfit to ensure consistency

CRITICAL: You are looking at photos of REAL ${hasMultiple ? 'people/characters' : 'child'}. You must:
1. Study their exact appearance from the photos (hair, eyes, face, build, clothing)
2. Use the pre-extracted feature description provided in the system prompt
3. ${hasMultiple ? `Start EVERY image_prompt with descriptions of ALL characters so the AI draws all of them together` : `Start EVERY image_prompt with the child's physical description so the AI draws THIS SPECIFIC CHILD (not multiple copies)`}
4. Make the story reflect the ${hasMultiple ? "characters'" : "child's"} actual personality traits, not generic traits
5. ${hasMultiple ? `The protagonists are "${allNamesList}" — you MUST use these exact names throughout the story text, in dialogue, narration, and descriptions. ALL characters must be present in EVERY scene. They are on this adventure TOGETHER.` : `The protagonist's name is "${childName}" — you MUST use this exact name throughout the story text, in dialogue, narration, and descriptions. Never use generic terms like "the child" or "the little one" when referring to the protagonist. Always use "${childName}". IMPORTANT: Show ONLY ${childName} in the illustrations — do not create duplicate children or imaginary friends unless explicitly mentioned in the story.`}
6. OBSERVE THE ACTUAL SETTING: Look carefully at the background, environment, and objects in the photos. If ${childName} is in a museum, library, park, beach, or specific location, the story MUST accurately reflect that real setting. Do NOT invent a different setting or misidentify objects (e.g., don't call a statue a "toy" or a museum exhibit a "playground item"). The story should feel authentic to where the photos were actually taken.
${customPrompt ? `\n7. Additional instructions from the parent: ${customPrompt}` : ''}`
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
      max_tokens: 8192,
      temperature: 0.8,
    });
  } catch (err) {
    response = await portkey.chat.completions.create({
      model: MODELS.textGeneration,
      messages: [{ role: 'user', content: `${SYSTEM_PROMPT_BOOK}\n\nUSER REQUEST (Safe Fallback): ${userMessageContent[0].text}` }],
      max_tokens: 10000,
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
    
    // LOCATION CONSISTENCY VALIDATION
    // Check if pages are jumping between different locations
    const locationKeywords = {
      museum: ['museum', 'exhibit', 'gallery', 'statue', 'display'],
      park: ['park', 'playground', 'swing', 'slide', 'outdoor', 'trees', 'grass'],
      home: ['home', 'house', 'room', 'bedroom', 'kitchen', 'living room'],
      beach: ['beach', 'sand', 'ocean', 'sea', 'waves', 'shore'],
      forest: ['forest', 'woods', 'trees', 'trail', 'nature'],
      library: ['library', 'books', 'shelves', 'reading'],
      school: ['school', 'classroom', 'desk', 'teacher']
    };
    
    const detectLocation = (text) => {
      const lowerText = text.toLowerCase();
      for (const [location, keywords] of Object.entries(locationKeywords)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          return location;
        }
      }
      return 'unknown';
    };
    
    // Detect primary location from first few pages
    const firstPageLocations = pages.slice(0, 3).map(p => 
      detectLocation((p.content || '') + ' ' + (p.image_prompt || ''))
    ).filter(loc => loc !== 'unknown');
    
    const primaryLocation = firstPageLocations[0] || 'unknown';
    
    // Check for location jumps
    const locationJumps = [];
    pages.forEach((page, idx) => {
      if (idx === 0) return; // Skip title page
      const pageLocation = detectLocation((page.content || '') + ' ' + (page.image_prompt || ''));
      if (pageLocation !== 'unknown' && pageLocation !== primaryLocation) {
        locationJumps.push({ page: idx + 1, from: primaryLocation, to: pageLocation });
      }
    });
    
    if (locationJumps.length > 0) {
      console.warn('[BOOK GEN] WARNING: Location inconsistency detected!');
      console.warn('[BOOK GEN] Primary location:', primaryLocation);
      console.warn('[BOOK GEN] Location jumps:', locationJumps);
      // Log but don't fail - the story might have intentional transitions
    }
    
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

    // Title page: always generate an AI cover image
    // image_url holds the user's uploaded photo temporarily (shown during generation),
    // but it will be deleted after AI processing — ai_image_url is the permanent cover.
    if (sanitizedType === 'title') {
      let finalPrompt = p.image_prompt;
      if (!finalPrompt || finalPrompt.length < 50) {
        // Include character description in title page prompt for consistency
        const charDesc = childDescPrefix ? `${childDescPrefix}, ` : '';
        finalPrompt = `${charDesc}${allNamesList} on a beautiful book cover in ${style} art style. The cover shows ${allNamesList} in a warm, heartwarming scene related to "${theme}". ${hasMultiple ? `All characters (${allNamesList}) must be visible together.` : ''} Child-friendly, vibrant, cozy. Art style: ${style}.`;
      } else if (!finalPrompt.toLowerCase().includes(style.toLowerCase())) {
        // Ensure style is mentioned in the prompt
        finalPrompt = `${finalPrompt} Art style: ${style}.`;
      }
      return {
        ...p,
        type: sanitizedType,
        image_url: coverImageUrl || null,
        image_prompt: finalPrompt,
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
 * @param {string} prompt - The image description
 * @param {string} style - The art style (e.g., 'Pixar-style', 'Watercolor')
 * @param {number} seed - Optional seed for consistency across images in the same book
 */
async function generateAIImage(prompt, style = 'Watercolor', seed = null) {
  const fullPrompt = IMAGE_GENERATION_PROMPT(style, prompt);
  
  // Add seed to prompt for consistency if provided
  const promptWithSeed = seed 
    ? `${fullPrompt}\n\nSTYLE CONSISTENCY SEED: ${seed} - Use this seed to maintain visual consistency with other illustrations in this book.`
    : fullPrompt;

  try {
    // Gemini image models — use Google SDK directly
    if (MODELS.imageGeneration.includes('gemini') || MODELS.imageGeneration.includes('imagen')) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const modelName = MODELS.imageGeneration.replace(/^@[^/]+\//, '');
      const model = genAI.getGenerativeModel({ model: modelName });
      console.log('[IMAGE GEN] Generating with Gemini:', modelName, seed ? `(Seed: ${seed})` : '');
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          const result = await model.generateContent(promptWithSeed);
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
      prompt: promptWithSeed,
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
