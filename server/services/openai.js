const OpenAI = require('openai');
const { Portkey } = require('portkey-ai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const portkey = new Portkey({
  apiKey: process.env.PORTKEY_API_KEY,

})

// Model configuration from environment (defaults to current values)
const MODELS = {
  textGeneration: process.env.MODEL_TEXT_GENERATION || '@gemini/gemini-2.5-flash-lite',
  imageDescription: process.env.MODEL_IMAGE_DESCRIPTION || 'gpt-4o-mini',
  imageGeneration: process.env.MODEL_IMAGE_GENERATION || '@openai/gpt-image-1',
  tts: process.env.MODEL_TTS || 'tts-1',
  ttsVoice: process.env.MODEL_TTS_VOICE || 'nova',
};
const SYSTEM_PROMPT = `You are DreamWeaver, a magical and gentle bedtime storyteller for children under 10 years old.

STRICT RULES — you must follow every rule with no exceptions:
1. NEVER include violence, fighting, harm, injury, or anything scary.
2. NEVER include villains who cause real harm, death, or distress.
3. NEVER include adult themes, romance, or anything inappropriate for young children.
4. NEVER use frightening imagery, monsters that cause fear, or jump-scare elements.
5. ALWAYS give the story a warm, comforting, happy ending.
6. ALWAYS weave in themes of: wonder, kindness, friendship, nature, and magical adventures.
7. ALWAYS end the story with the child (or animal character) feeling safe, loved, and gently drifting off to sleep.
8. Use soft, soothing, poetic language. Write with warmth and gentleness.
9. Keep stories to approximately 250-300 words.
10. Write in second-person ("you") or third-person — never first-person.
11. Incorporate ALL character names provided, the location, and the specific theme.
12. If multiple characters are provided, the story MUST feature all of them. Show their unique friendship, teamwork, or bond. Give each character moments to shine.

Your stories should feel like a warm hug. Think fireflies, moonbeams, friendly animals, cozy beds, and starlit skies.`;

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
  if (theme) userMessage += ` The story's magical theme should be: "${theme}".`;
  if (customPrompt) userMessage += ` Additional details from the parent: ${customPrompt}`;

  console.log(portkey);

  // Make the prompt creation call with the variables
  const promptCompletion = await portkey.prompts.completions.create({
    promptID: "pp-generatest-f1d282",
    variables: { "imageDescription": imageDescription }
  })


  /*   const response = await portkey.chat.completions.create({
      model: MODELS.textGeneration,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 600,
      temperature: 0.8,
    }); */

  const rawContent = promptCompletion.choices[0].message.content.trim();

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
 * Secondary content moderation check using OpenAI Moderation API.
 */
async function moderateContent(text) {
  const result = await portkey.moderations.create({ input: text });
  const flagged = result.results[0]?.flagged;
  if (flagged) {
    throw new Error('Content moderation failed');
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
async function extractChildFeatures(imageUrls, childName = 'the child') {
  // Parse multiple names
  const names = childName.split(/\s+and\s+|,\s*/i).map(n => n.trim()).filter(Boolean);
  const hasMultiple = names.length > 1;
  const nameList = hasMultiple ? names.join('", "') : childName;
  const nameRef = hasMultiple ? `these characters: "${nameList}"` : `the child named "${childName}"`;

  const contentParts = [
    {
      type: 'text',
      text: `Look at the people/characters in these photos carefully. I need you to extract EXACT physical features and personality traits for ${nameRef}.

${hasMultiple ? `There are ${names.length} characters. For EACH character, extract their features separately. If a character named in the list is NOT visibly in the photos (e.g., an imaginary friend or stuffed animal), create a fitting fantasy description based on what the name suggests.

Return a JSON object with these fields:
- "characters": An array of objects, one per character. Each object has:
  - "name": The character's name
  - "physical_description": A detailed 2-3 sentence description of their appearance: hair color, hair style, eye color, skin tone, approximate age, any distinctive features, body type/build. For non-human characters (animals, imaginary friends), describe their appearance creatively.
  - "clothing": Describe what they are wearing (colors, patterns, style). For non-human characters, describe any accessories or notable features.
  - "personality_traits": 3-4 personality traits based on facial expression, posture, body language, or inferred from context
  - "fantasy_character_description": A rich, detailed 2-sentence description of how this character would appear in a fantasy children's book, preserving their EXACT features while adding magical elements. MUST use the character's name.
- "group_description": A 1-2 sentence description of how ALL characters look together — their dynamic, relative sizes, and how they relate to each other
- "combined_fantasy_description": A vivid 2-3 sentence description of ALL characters together in a fantasy scene, suitable for use in image generation prompts. Include each character's name and key features.

IMPORTANT: Be extremely specific about physical features for each visible character. Generic descriptions are NOT acceptable.` : `Return a JSON object with these fields:
- "physical_description": A detailed 2-3 sentence description of the child's appearance: hair color, hair style, eye color, skin tone, approximate age, any distinctive features (dimples, freckles, glasses, etc.), body type/build
- "clothing": Describe what the child is wearing in detail (colors, patterns, style)
- "personality_traits": Based on facial expression, posture, and body language, describe 3-4 personality traits you observe (e.g., adventurous, curious, joyful, shy, energetic)
- "interests": Based on the photo context (background, props, clothing), suggest 2-3 things the child might be interested in
- "fantasy_character_description": Write a rich, detailed 2-sentence description of how "${childName}" would appear as the protagonist of a fantasy children's book. This should paint a vivid picture that preserves their EXACT features while adding magical/fantasy elements. Be very specific about physical appearance. You MUST use the name "${childName}" in this description — do NOT invent a different name.

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
    model: MODELS.textGeneration,
    messages: [
      {
        role: 'user',
        content: contentParts,
      },
    ],
    max_tokens: 800,
    temperature: 0.3,
  });
  console.log(response);
  const raw = response.choices[0].message.content.trim();
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (e) {
    console.error('Failed to parse child features JSON', e, raw);
    const names = childName.split(/\s+and\s+|,\s*/i).map(n => n.trim()).filter(Boolean);
    if (names.length > 1) {
      return {
        physical_description: 'A group of bright-eyed children with warm smiles',
        clothing: 'Colorful casual clothes',
        personality_traits: ['curious', 'adventurous', 'kind', 'imaginative'],
        interests: ['nature', 'animals', 'stories'],
        fantasy_character_description: `Young heroes with sparkling eyes and brave hearts — ${names.join(' and ')} — ready for magical adventures together`,
        characters: names.map(name => ({
          name,
          physical_description: `A bright-eyed child named ${name} with a warm smile`,
          clothing: 'Colorful casual clothes',
          personality_traits: ['curious', 'adventurous', 'kind'],
          fantasy_character_description: `${name}, a young hero with sparkling eyes and a brave heart`
        })),
        group_description: `${names.join(' and ')} standing together, ready for adventure`,
        combined_fantasy_description: `${names.join(' and ')} together in a magical world, their friendship lighting up the scene`
      };
    }
    return {
      physical_description: 'A bright-eyed child with a warm smile',
      clothing: 'Colorful casual clothes',
      personality_traits: ['curious', 'adventurous', 'kind', 'imaginative'],
      interests: ['nature', 'animals', 'stories'],
      fantasy_character_description: 'A young hero with sparkling eyes and a brave heart, ready for magical adventures',
      character_name_suggestion: 'The Little Explorer'
    };
  }
}

/**
 * Infer 3 magical story themes based on an image.
 */
async function analyzeImageForThemes(imageUrl, childName = '', location = '') {
  let contextHint = 'Look at this image.';
  if (childName) {
    const names = childName.split(/\s+and\s+|,\s*/i).map(n => n.trim()).filter(Boolean);
    if (names.length > 1) {
      contextHint += ` The story's main characters are ${names.join(' and ')}. Themes should involve their friendship or adventure together.`;
    } else {
      contextHint += ` The story's main character is named ${childName}.`;
    }
  }
  if (location) contextHint += ` The story is set in or near ${location}.`;

  const visionUrl = await urlToDataUrl(imageUrl);

  const response = await portkey.chat.completions.create({
    model: MODELS.textGeneration,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${contextHint} Suggest exactly 3 magical, child-friendly bedtime story themes inspired by the image and context. Return ONLY a JSON array of 3 strings.`,
          },
          { type: 'image_url', image_url: { url: visionUrl, detail: 'low' } },
        ],
      },
    ],
    max_tokens: 100,
    temperature: 0.7,
  });

  const raw = response.choices[0].message.content.trim();
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (e) {
    return ["A magical forest adventure", "Journey to the clouds", "A sleepy animal's quest"];
  }
}

/**
 * Builds the feature block for the book generation prompt.
 * Handles both single-child and multi-child feature extraction results.
 */
function buildFeatureBlock(childFeatures, childName) {
  const names = childName.split(/\s+and\s+|,\s*/i).map(n => n.trim()).filter(Boolean);
  const hasMultiple = names.length > 1;

  if (hasMultiple && childFeatures.characters && childFeatures.characters.length > 0) {
    const charBlocks = childFeatures.characters.map((c, i) => `
CHARACTER ${i + 1} — ${c.name}:
- Physical: ${c.physical_description}
- Clothing: ${c.clothing || 'Colorful casual clothes'}
- Personality: ${(c.personality_traits || []).join(', ')}
- Fantasy Description: ${c.fantasy_character_description}`).join('\n');

    return `
CHARACTERS' EXTRACTED FEATURES (use these EXACTLY in every image_prompt):
${charBlocks}
${childFeatures.group_description ? `\n- Group Dynamic: ${childFeatures.group_description}` : ''}
${childFeatures.combined_fantasy_description ? `\n- Combined Scene Description: ${childFeatures.combined_fantasy_description}` : ''}

CRITICAL: ALL ${childFeatures.characters.length} characters MUST appear in EVERY image_prompt and EVERY story page. They are on this adventure TOGETHER.`;
  }

  // Single child fallback
  return `
CHILD'S EXTRACTED FEATURES (use these EXACTLY in every image_prompt):
- Physical: ${childFeatures.physical_description}
- Clothing: ${childFeatures.clothing}
- Personality: ${(childFeatures.personality_traits || []).join(', ')}
- Fantasy Description: ${childFeatures.fantasy_character_description}
`;
}

/**
 * Generates a multi-page children's book based on a sequence of images
 */
async function generateBook(imageUrls,
  childName = 'the little explorer', location = 'a magical land',
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
  const names = childName.split(/\s+and\s+|,\s*/i).map(n => n.trim()).filter(Boolean);
  const hasMultiple = names.length > 1;
  const protagonistLabel = hasMultiple ? 'Protagonists' : 'Protagonist';
  const protagonistNames = hasMultiple ? names.join('", "') : childName;
  const characterRef = hasMultiple ? `all ${names.length} characters (${names.join(', ')})` : childName;
  const allNamesList = hasMultiple ? names.join(', ') : childName;
  const closingLine = hasMultiple
    ? `And ${names.join(' and ')} drifted off to sleep, dreaming of magical adventures together...`
    : `And ${childName} drifted off to sleep, dreaming of magical adventures...`;

  const SYSTEM_PROMPT_BOOK = `You are a world-class children's book author and illustrator. 
Your task is to create a cohesive ${pageCount}-page story based on the provided images.
The book has a visual style of "${style}". Use descriptive language that evokes this style (e.g., if watercolor, use words like "fluid", "soft", "colorful washes").

${ageGuidelines}

${featureBlock}

Format your response as a JSON array of ${pageCount} objects. Each object must have:
- "page": Number (1 to ${pageCount})
- "type": "title" (page 1), "story" (pages 2 to ${pageCount - 1}), or "conclusion" (page ${pageCount}).
- "content": The text for that page. Story pages should be approx 40-60 words each. ALL story and conclusion pages MUST be written in rhyming verse — use AABB or ABAB rhyme schemes with simple, catchy rhymes that a child would love. The rhymes should flow naturally and feel musical when read aloud. Example: "The little bear climbed up the hill, / The wind was warm, the air was still. / He found a cave with stars inside, / And spread his golden wings to glide."
- "image_prompt": A highly detailed prompt for DALL-E 3 that is a DIRECT VISUAL DEPICTION of the scene described in the "content" for this page. The image_prompt must show EXACTLY what is happening in the story text — the same actions, setting, emotions, objects, and characters described in the content. Do NOT generate a generic scene.
  IMPORTANT: The title page (page 1) MUST have an image_prompt for a beautiful, magical book cover illustration. The conclusion page (page ${pageCount}) MUST have image_prompt set to null — no image for "The End" page.

Structure:
- Page 1 (TITLE PAGE): 
  - "content" must be ONLY the book title. The title MUST be short — 2 to 5 words maximum (e.g. "${hasMultiple ? names.join(' & ') + "'s" : childName + "'s"} Starry Adventure", "The Enchanted Garden"). Do NOT write a full sentence or paragraph — just the title.
  - "image_prompt": A stunning book cover illustration for a children's book. The cover should depict ${characterRef} in a magical scene that represents the story's theme "${theme}". Use the "${style}" art style. This is a cover image, not a story scene.${hasMultiple ? ` ALL ${names.length} characters must be visible on the cover, showing their friendship.` : ''}
  - Include a separate field "dedication": "Created by ${dedicatedBy}"
- Pages 2 to ${pageCount - 1} (STORY PAGES): The heart of the adventure. ${hasMultiple ? `The story MUST feature ALL characters: ${allNamesList}. Show their unique friendship, teamwork, and bond. Give each character moments to shine and dialogue. They should interact with each other naturally.` : `The child's personality should drive the plot.`} Each page 40-60 words with a matching image_prompt.
- Page ${pageCount} (THE END PAGE):
  - "content": A short, warm closing line like "${closingLine}"
  - "image_prompt": null (no image for this page)

${protagonistLabel}: "${protagonistNames}". You MUST use these exact names throughout ALL story content, dialogue, and narration. ${hasMultiple ? `Every story page MUST include all ${names.length} characters interacting together. Never have one character disappear or be absent from a scene — they are always together on this adventure.` : `Never refer to the protagonist generically — always use the name "${childName}".`} Their appearance and personality must stay 100% consistent with the extracted features above.
Setting: "${location}" with a theme of "${theme}".
Visual Aesthetic: "${style}".

ABSOLUTE RULES FOR IMAGE PROMPTS:
1. Every image_prompt MUST begin with the full physical description(s) of ${characterRef} so DALL-E draws ${hasMultiple ? 'ALL' : 'THIS'} specific ${hasMultiple ? 'characters' : 'child'}.
2. Every image_prompt MUST visually depict the EXACT scene described in that page's "content" — same actions, same setting, same objects, same emotions. The image is an illustration of the story text, not a separate scene.
3. ${hasMultiple ? `ALL characters must appear in EVERY image_prompt (except the conclusion page). They must look IDENTICAL across all pages (same hair, eyes, clothing, build for each).` : `The child must look IDENTICAL on every page (same hair, eyes, clothing, build).`}
4. Never use generic descriptions. Be specific and scene-accurate.

STRICT: Only return the JSON array. No other text or markdown tags.`;

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
  for (let i = 1; i < userMessageContent.length; i++) {
    if (userMessageContent[i].type === 'image_url') {
      userMessageContent[i].image_url.url = await urlToDataUrl(userMessageContent[i].image_url.url);
    }
  }

  const response = await portkey.chat.completions.create({
    model: MODELS.textGeneration,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_BOOK },
      { role: 'user', content: userMessageContent },
    ],
    max_tokens: 4000,
    temperature: 0.8,
  });

  const raw = response.choices[0].message.content.trim();
  let pages = [];
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    pages = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (e) {
    console.error('Failed to parse book JSON', e, raw);
    throw new Error('Book generation failed - Invalid format');
  }

  // Clamp to requested page count in case AI generated extra pages
  const clampedPages = pages.slice(0, pageCount);

  // Interleave images into 'story' pages & Sanitize types for DB constraints
  let imgIdx = 0;
  // Build character description for image prompts
  const hasMultipleChars = childFeatures?.characters?.length > 1;
  let childDescPrefix = '';
  if (hasMultipleChars) {
    childDescPrefix = childFeatures.combined_fantasy_description || childFeatures.characters.map(c => c.fantasy_character_description).join('. ');
  } else if (childFeatures?.fantasy_character_description) {
    childDescPrefix = childFeatures.fantasy_character_description;
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
        finalPrompt = `A beautiful magical book cover illustration in ${style} style for a children's storybook. The cover shows ${allNamesList} in a whimsical scene related to "${theme}". ${hasMultiple ? `All characters (${allNamesList}) must be visible together.` : ''} Child-friendly, vibrant, enchanting.`;
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
 * Generate a brand-new AI image based on a prompt (DALL-E 3)
 */
async function generateAIImage(prompt, style = 'Watercolor') {
  try {
    const response = await portkey.images.generate({
      model: MODELS.imageGeneration,
      prompt: `${prompt}. Art style: ${style}. Vibrant, child-friendly, consistent children's book illustration. All characters must maintain identical physical features throughout. No text, no words, no letters in the image.`,
      response_format: "b64_json" // Explicitly request b64_json to avoid temporary URLs that expire
    });

    // Support both direct data (as in standard SDK) and nested body (as in user's reported case)
    const data = response.data || (response.body && response.body.data);

    if (!data || !data[0]) {
      throw new Error('Incomplete image generation response');
    }

    const firstImage = data[0];

    // If it's a URL, return it (e.g., if response_format was 'url')
    if (firstImage.url) {
      return firstImage.url;
    }

    // If it's base64, save to persistent storage (R2)
    if (firstImage.b64_json) {
      const filename = `${uuidv4()}.png`;
      return await saveBase64(firstImage.b64_json, 'generated', filename);
    }

    return null;
  } catch (err) {
    console.error('[OPENAI IMAGE GEN ERROR]', err);
    return null; // Fallback to original photo
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
  generateAIImage,
  generateSpeech
};
