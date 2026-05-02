# DreamWeaver AI Prompts - Central Configuration

## Overview

All AI prompts for DreamWeaver are now centralized in `server/config/prompts.js` for easy access, updates, and maintenance.

## Why Centralize Prompts?

**Before:** Prompts were scattered throughout `server/services/openai.js`, making them:
- Hard to find
- Difficult to update
- Easy to lose track of
- Prone to inconsistencies

**After:** All prompts are in one dedicated file:
- ✅ Easy to locate and update
- ✅ Version controlled separately
- ✅ Can be reviewed without reading code
- ✅ Consistent formatting
- ✅ Well-documented

## File Structure

```
server/config/
├── prompts.js          # All AI prompts (centralized)
├── PROMPTS_README.md   # This file (documentation)
└── fonts.js            # Font configuration
```

## Available Prompts

### Story Generation
- `SYSTEM_PROMPT_STORY` - Main storytelling system prompt
- `AGE_GUIDELINES` - Age-appropriate writing guidelines (toddler → pre-teen)

### Book Generation
- `SYSTEM_PROMPT_BOOK_BASE` - Base system prompt for books
- `LITERARY_CRAFT_RULES` - Literary techniques (narrative taper, sensory anchoring, etc.)
- `WRITING_STYLE_RULES` - Writing style guidelines
- `NARRATIVE_STRUCTURE_RULES` - Story coherence and continuity
- `IMAGE_PROMPT_RULES` - Rules for generating image prompts

### User Message Templates
- `NARRATIVE_COHERENCE_RULES` - Setting continuity rules
- `VISUAL_CONSISTENCY_RULES` - Size/scale consistency
- `CHARACTER_APPEARANCE_CONSISTENCY_RULES` - Character appearance rules
- `PHOTO_OBSERVATION_RULES` - Real photo context observation

### Image Generation
- `IMAGE_GENERATION_PROMPT` - Template for AI image generation

### Other Prompts
- `MODERATION_PROMPT` - Content safety moderation
- `IMAGE_DESCRIPTION_PROMPT` - Photo description
- `FEATURE_EXTRACTION_PROMPT_SINGLE` - Character feature extraction

## How to Update Prompts

### 1. Open the prompts file:
```bash
code server/config/prompts.js
```

### 2. Find the prompt you want to update:
All prompts are clearly labeled with comments like:
```javascript
// ============================================================================
// STORY GENERATION PROMPTS
// ============================================================================
```

### 3. Edit the prompt:
```javascript
const SYSTEM_PROMPT_STORY = `You are DreamWeaver...
[Your updated prompt here]
`;
```

### 4. Save and test:
Restart your server to apply changes:
```bash
cd server && npm run dev
```

## Common Updates

### Adding a New Rule
```javascript
const SYSTEM_PROMPT_STORY = `You are DreamWeaver...

STRICT RULES:
1. Existing rule...
2. Existing rule...
15. NEW RULE: Your new rule here

Your stories should feel like a warm hug...`;
```

### Modifying Age Guidelines
```javascript
const AGE_GUIDELINES = {
  toddler: (age) => `AGE-APPROPRIATE WRITING (age ${age} — toddler): 
    [Your updated guidelines]`,
  // ... other age groups
};
```

### Updating Image Generation Rules
```javascript
const IMAGE_GENERATION_PROMPT = (style, prompt) => `
A beautiful children's book illustration...

CRITICAL - NEW RULE:
- Your new rule here

SCENE DETAILS: ${prompt}`;
```

## Integration with Code

The prompts are imported and used in `server/services/openai.js`:

```javascript
// At the top of openai.js (future implementation)
const {
  SYSTEM_PROMPT_STORY,
  AGE_GUIDELINES,
  IMAGE_GENERATION_PROMPT,
  // ... other prompts
} = require('../config/prompts');

// Then use them in functions
async function generateStory(...) {
  const response = await portkey.chat.completions.create({
    model: MODELS.textGeneration,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_STORY },
      { role: 'user', content: userMessage },
    ],
    // ...
  });
}
```

## Best Practices

### 1. Keep Prompts Focused
Each prompt should have a single, clear purpose.

### 2. Use Clear Section Headers
```javascript
// ============================================================================
// YOUR SECTION NAME
// ============================================================================
```

### 3. Document Complex Prompts
Add comments explaining why specific rules exist:
```javascript
// This rule prevents the AI from generating duplicate children
// See: https://github.com/yourrepo/issues/123
const CHARACTER_COUNT_RULE = ...
```

### 4. Version Control
Commit prompt changes with clear messages:
```bash
git commit -m "prompts: strengthen character consistency rules"
```

### 5. Test After Changes
Always generate a test book after updating prompts to ensure:
- No syntax errors
- Rules are being followed
- Quality hasn't degraded

## Troubleshooting

### Prompt Not Taking Effect
1. Check if you saved the file
2. Restart the server
3. Clear any caches (Redis)
4. Verify the prompt is being imported correctly

### AI Not Following Rules
1. Make rules more explicit
2. Add examples
3. Use stronger language ("MUST", "NEVER", "CRITICAL")
4. Move important rules to the top

### Conflicting Rules
1. Review all related prompts
2. Ensure consistency across sections
3. Remove or clarify contradictions

## Future Improvements

### Planned Features
- [ ] Prompt versioning system
- [ ] A/B testing framework
- [ ] Prompt analytics (which rules work best)
- [ ] User-customizable prompts
- [ ] Prompt templates for different genres

### Migration Plan
Currently, prompts are still embedded in `openai.js`. Future work will:
1. Import prompts from `prompts.js`
2. Replace inline prompts with imported constants
3. Remove duplicate prompt definitions
4. Add unit tests for prompt generation

## Contributing

When adding new prompts:
1. Add them to the appropriate section in `prompts.js`
2. Export them at the bottom
3. Document their purpose
4. Update this README
5. Test thoroughly

## Questions?

If you have questions about prompts:
1. Check this README first
2. Review the comments in `prompts.js`
3. Look at existing prompt examples
4. Test changes in a development environment

---

**Last Updated:** 2026-05-02  
**Maintainer:** DreamWeaver Team
