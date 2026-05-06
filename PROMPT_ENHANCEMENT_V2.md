# Prompt Enhancement V2 - Reducing Mechanical Repetition

## Problem Identified

**User Feedback on Story:**
```
Shake, shake, shake! Maya holds a bright toy. The beads go swish-swish.
The fuzzy bear sits on the warm rug. The golden dog wags his long tail.
Cling, clang, tap! Maya hits a green bell.
Tap, tap, hum. Hush, shush, slow.
```

**Issues:**
- ❌ Excessive mechanical repetition ("Shake, shake, shake!", "swish-swish", "Cling, clang, tap!")
- ❌ Lists of disconnected observations
- ❌ Repetitive sentence structure
- ❌ Lacks internal experience (WHY is Maya doing this?)
- ❌ No cause-and-effect connections

**Note:** User is using **Gemini 3 Pro Preview**, not GPT-4o-mini (via .env override)

---

## Enhancements Made

### 1. Added Concrete Examples to LITERARY_CRAFT_RULES ✅

**Before:**
```
- ONOMATOPOEIA: Include gentle, interactive sounds
- INTERNAL EXPERIENCE: Show thoughts, feelings, reactions
```

**After:**
```
- ONOMATOPOEIA: Use sparingly and naturally - ONE sound effect per page maximum
  * BAD: "Shake, shake, shake! Swish-swish. Cling, clang, tap!"
  * GOOD: "The maraca made a gentle swish as Maya shook it."

- INTERNAL EXPERIENCE: Show thoughts, feelings, and reactions
  * BAD: "Maya hits a bell. The sound is clear. Maya spins around."
  * GOOD: "Maya wondered what the green bell would sound like. When she tapped it, 
           the clear, sweet note made her want to spin and dance."

- INTEGRATE descriptions into action rather than listing them separately
  * BAD: "The bear is fuzzy. The rug is warm. The dog is golden. Maya smiles."
  * GOOD: "Maya's fuzzy bear watched from the warm rug while the golden dog 
           wagged his tail in time with her music."
```

---

### 2. Enhanced WRITING_STYLE_RULES with Examples ✅

**Added Section:**
```
CRITICAL - AVOID THESE PATTERNS:
❌ "X did this. Then X did that. Then X did another thing."
❌ "The [noun] is [adjective]. The [noun] is [adjective]."
❌ "Verb, verb, verb! Sound-sound-sound!"
❌ Starting multiple sentences with "The" in a row

INSTEAD, USE THESE PATTERNS:
✅ "X discovered Y, which made them feel Z, so they decided to..."
✅ "When X happened, Y's heart [emotion], because..."
✅ "X wondered about Y. As they explored, they realized..."
✅ Integrate descriptions into action

EXAMPLES OF GOOD WRITING:
"Maya discovered a bright maraca on the shelf. When she shook it, the beads 
danced inside with a cheerful swish that made her smile. The sound was so 
delightful that she wanted to make more music, so she reached for the green bell."

EXAMPLES OF BAD WRITING:
"Maya holds a bright toy. The beads go swish-swish. Maya has a big smile. 
The bear sits on the rug. The rug is warm. Maya is happy."
```

---

### 3. Strengthened SYSTEM_PROMPT_STORY ✅

**Added Section:**
```
STORYTELLING TECHNIQUES:
- ONE sound effect per page maximum - integrate it naturally into the prose

CRITICAL - AVOID THESE COMMON MISTAKES:
❌ Lists of disconnected observations: "The X is Y. The A is B. The C is D."
❌ Repetitive sentence patterns: "Subject + Verb + Object" over and over
❌ Mechanical repetition: "Shake, shake, shake! Swish-swish! Cling, clang, tap!"
❌ Flat emotional tone throughout with no progression
❌ Events that don't connect or build on each other
❌ Describing the scene without showing the character's experience of it

INSTEAD, DO THIS:
✅ Integrate descriptions into action and emotion
✅ Show WHY characters do things, not just WHAT they do
✅ Connect each moment to the next with cause-and-effect
✅ Build emotional depth through the character's internal experience
✅ Use sound effects sparingly and naturally (one per page max)
```

---

## Key Changes Summary

### 1. Sound Effects Limit
**Before:** Encouraged onomatopoeia
**After:** ONE sound effect per page maximum, integrated naturally

### 2. Concrete Examples
**Before:** Abstract rules ("show don't tell")
**After:** Specific BAD vs GOOD examples for every rule

### 3. Pattern Recognition
**Before:** General "avoid repetition"
**After:** Explicit patterns to avoid with ❌ markers

### 4. Integration Focus
**Before:** "Use sensory details"
**After:** "Integrate descriptions into action" with examples

### 5. Internal Experience
**Before:** "Show feelings"
**After:** "Show WHY they do things, not just WHAT" with examples

---

## Expected Improvements

### Before Enhancement:
```
Shake, shake, shake! Maya holds a bright toy. The beads go swish-swish. 
The fuzzy bear sits on the warm rug. The golden dog wags his long tail. 
Maya has a big, happy smile. The fun show starts now!
```

**Issues:**
- 3 sound effects in one paragraph
- List of observations
- No internal experience
- No cause-and-effect

### After Enhancement (Expected):
```
Maya discovered a bright maraca on the shelf, its colorful beads catching 
the light. When she gave it a gentle shake, the beads danced inside with 
a soft swish that made her smile. Her fuzzy bear and golden dog seemed to 
watch from the warm rug, as if waiting for the show to begin. Maya's heart 
felt light and happy—it was time to make some music!
```

**Improvements:**
- ✅ ONE sound effect, integrated naturally
- ✅ Descriptions woven into action
- ✅ Internal experience ("heart felt light and happy")
- ✅ Cause-and-effect flow
- ✅ Varied sentence structure

---

## Files Modified

1. **`server/config/prompts.js`**
   - Enhanced `SYSTEM_PROMPT_STORY` with explicit examples
   - Enhanced `LITERARY_CRAFT_RULES` with BAD vs GOOD examples
   - Enhanced `WRITING_STYLE_RULES` with pattern guidance

---

## Testing Recommendations

### 1. Generate New Stories
Create stories with the same photos/settings and compare:
- Count sound effects per page (should be ≤1)
- Check for list-like observations
- Verify cause-and-effect connections
- Look for internal experience

### 2. Quality Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Sound effects per page | 3-5 | 0-1 |
| Disconnected observations | Many | None |
| Cause-effect connections | Few | Every transition |
| Internal experience | Minimal | Every page |
| Sentence variety | Low | High |

### 3. Specific Checks

**Sound Effects:**
- [ ] No more than ONE sound effect per page
- [ ] Sound effects integrated into prose, not standalone
- [ ] No "Verb, verb, verb!" patterns

**Observations:**
- [ ] No lists of "The X is Y. The A is B."
- [ ] Descriptions integrated into action
- [ ] No multiple sentences starting with "The"

**Internal Experience:**
- [ ] Character's thoughts/feelings shown
- [ ] WHY they do things, not just WHAT
- [ ] Emotional progression across pages

**Cause-Effect:**
- [ ] Events connected with "because," "so," "which made"
- [ ] Each moment leads naturally to the next
- [ ] Clear narrative flow

---

## Model Clarification

**User's Actual Setup:**
```bash
# .env file
MODEL_TEXT_GENERATION=@gemini/gemini-3-pro-preview
```

**Not using GPT-4o-mini** - using Gemini 3 Pro Preview via Portkey

**Why this matters:**
- Gemini models respond differently to prompts than GPT models
- Concrete examples are especially important for Gemini
- Pattern-based guidance works well with Gemini
- These enhancements are optimized for Gemini's behavior

---

## Rollback Instructions

If the new prompts cause issues, revert to previous version:

```bash
git diff server/config/prompts.js
git checkout HEAD -- server/config/prompts.js
```

Or manually remove the "CRITICAL - AVOID" and "EXAMPLES" sections.

---

## Next Steps

1. **Test Generation**: Create 2-3 new books
2. **Compare Quality**: Check against the metrics above
3. **Iterate**: If still seeing issues, add more specific examples
4. **Consider Model**: If Gemini still struggles, try `gemini-2.0-flash-thinking-exp`

---

## Success Criteria

✅ **Sound Effects**: ≤1 per page, naturally integrated
✅ **No Lists**: Descriptions woven into narrative
✅ **Internal Experience**: Character's thoughts/feelings present
✅ **Cause-Effect**: Clear connections between events
✅ **Varied Structure**: Mix of sentence lengths and patterns
✅ **Emotional Arc**: Clear progression from curiosity to contentment

---

**Enhancement Date**: May 2, 2026
**Target Model**: Gemini 3 Pro Preview (via Portkey)
**Focus**: Reduce mechanical repetition, add internal experience
**Status**: Implemented and Ready for Testing
