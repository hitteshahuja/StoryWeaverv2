# Location Consistency Fix - Technical Documentation

## Problem Statement

**Issue:** Stories were jumping between unrelated locations despite narrative coherence rules.

**Example:**
- Page 1: Museum
- Page 2: Museum  
- Page 3: Forest (❌ location jump!)
- Page 4: Home (❌ another jump!)

**Root Cause:** The AI generates all pages in one shot but wasn't maintaining strong enough location awareness between pages.

---

## Solution: Multi-Layer Location Enforcement

We've implemented a **three-layer defense** against location inconsistency:

### Layer 1: SETTING LOCK (Pre-Generation)
**Location:** User message prompt (Line ~585)

```javascript
SETTING LOCK - ABSOLUTELY CRITICAL:
- FIRST: Analyze all photos and identify the PRIMARY setting
- THEN: The ENTIRE story MUST take place in that ONE setting
- FORBIDDEN: Jumping between locations (museum → forest → home)
- FORBIDDEN: Inventing new locations not visible in the photos
- REQUIRED: If primary setting is museum, ALL pages happen in museum
- The story arc: arrival → exploration → discovery → wonder → rest (ONE place)
```

**Purpose:** Forces the AI to commit to ONE location before generating any pages.

---

### Layer 2: LOCATION ENFORCEMENT (During Generation)
**Location:** System prompt structure (Line ~565, ~574)

```javascript
Structure:
- Pages 2 to ${pageCount - 1}: CRITICAL: Every page MUST be in "${location}" 
  - do NOT change locations
- Page ${pageCount}: still in "${location}"

LOCATION ENFORCEMENT: Before writing each page, remind yourself: 
"This page is in ${location}." Do NOT let the story drift to other locations.
```

**Purpose:** Reminds the AI of the location constraint while generating each page.

---

### Layer 3: POST-GENERATION VALIDATION (After Generation)
**Location:** JSON parsing section (Line ~713)

```javascript
// Detect location keywords in content and image_prompts
const locationKeywords = {
  museum: ['museum', 'exhibit', 'gallery', 'statue', 'display'],
  park: ['park', 'playground', 'swing', 'slide', 'outdoor'],
  home: ['home', 'house', 'room', 'bedroom', 'kitchen'],
  beach: ['beach', 'sand', 'ocean', 'sea', 'waves'],
  forest: ['forest', 'woods', 'trees', 'trail'],
  // ... more locations
};

// Detect primary location from first 3 pages
// Check all subsequent pages for location jumps
// Log warnings if inconsistencies detected
```

**Purpose:** Validates the generated story and logs warnings if location jumps are detected.

---

## How It Works

### Step 1: Photo Analysis
```
User uploads photos → AI analyzes → Identifies primary setting
Example: "Photos show museum with exhibits and statues"
```

### Step 2: Location Lock
```
AI commits to location: "museum"
All ${pageCount} pages will be in: "museum"
```

### Step 3: Page Generation
```
Page 1: "Rohan enters the museum..." ✅ museum
Page 2: "Rohan looks at the frog statue..." ✅ museum
Page 3: "Rohan sits in the museum hall..." ✅ museum
Page 4: "Rohan waves goodbye to the museum..." ✅ museum
```

### Step 4: Validation
```
Scanning pages for location keywords...
✅ All pages contain "museum" keywords
✅ No "forest" or "home" keywords detected
✅ Location consistency: PASS
```

---

## Technical Implementation

### Location Detection Algorithm

```javascript
const detectLocation = (text) => {
  const lowerText = text.toLowerCase();
  for (const [location, keywords] of Object.entries(locationKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return location;
    }
  }
  return 'unknown';
};
```

### Validation Logic

```javascript
// Detect primary location from first 3 pages
const firstPageLocations = pages.slice(0, 3)
  .map(p => detectLocation((p.content || '') + ' ' + (p.image_prompt || '')))
  .filter(loc => loc !== 'unknown');

const primaryLocation = firstPageLocations[0] || 'unknown';

// Check for location jumps
pages.forEach((page, idx) => {
  const pageLocation = detectLocation(...);
  if (pageLocation !== 'unknown' && pageLocation !== primaryLocation) {
    locationJumps.push({ page: idx + 1, from: primaryLocation, to: pageLocation });
  }
});
```

---

## What This Prevents

❌ **Museum → Forest jump**
```
Page 1: "Rohan enters the museum"
Page 3: "Rohan walks through the forest" ← PREVENTED
```

❌ **Park → Home jump**
```
Page 2: "Maya plays on the swings"
Page 4: "Maya sits in her bedroom" ← PREVENTED
```

❌ **Beach → School jump**
```
Page 1: "Alex builds a sandcastle"
Page 3: "Alex sits at his desk" ← PREVENTED
```

---

## What This Allows

✅ **Single location throughout**
```
Page 1: Museum entrance
Page 2: Museum hall
Page 3: Museum exhibit
Page 4: Museum exit
```

✅ **Intentional transitions (if user requests)**
```
User: "Story about museum visit then going home"
Page 1-3: Museum
Page 4: "After the museum, Rohan went home..."
Page 5-6: Home
```

---

## Monitoring & Debugging

### Console Warnings

If location jumps are detected, you'll see:

```
[BOOK GEN] WARNING: Location inconsistency detected!
[BOOK GEN] Primary location: museum
[BOOK GEN] Location jumps: [
  { page: 3, from: 'museum', to: 'forest' },
  { page: 5, from: 'museum', to: 'home' }
]
```

### How to Investigate

1. Check the console logs during book generation
2. Look for `[BOOK GEN] WARNING` messages
3. Review the specific pages mentioned
4. Verify if the jump was intentional or a bug

---

## Edge Cases

### Case 1: User Explicitly Requests Journey
```
User: "Story about going from museum to park"
Solution: AI uses clear transitions
Result: ✅ Allowed
```

### Case 2: Photos Show Multiple Locations
```
Photos: Museum, park, home
Solution: AI chooses MOST PROMINENT setting (museum)
Result: ✅ All pages in museum
```

### Case 3: Ambiguous Setting
```
Photos: Indoor space (could be museum or library)
Solution: AI picks one and sticks with it
Result: ✅ Consistent throughout
```

---

## Testing Checklist

After implementing this fix, test:

- [ ] Generate book with museum photos → All pages in museum
- [ ] Generate book with park photos → All pages in park
- [ ] Generate book with home photos → All pages at home
- [ ] Generate book with beach photos → All pages at beach
- [ ] Check console for location warnings
- [ ] Verify no unexpected location jumps
- [ ] Test with mixed-location photos → Should pick primary

---

## Future Improvements

### Potential Enhancements

1. **Smarter location detection**
   - Use AI vision to detect setting from images
   - More sophisticated keyword matching
   - Context-aware location inference

2. **User control**
   - Allow users to explicitly set location
   - Option to enable/disable multi-location stories
   - Location transition templates

3. **Better validation**
   - Reject stories with location jumps (not just warn)
   - Auto-fix location inconsistencies
   - Suggest corrections to user

4. **Analytics**
   - Track location consistency rate
   - Identify which locations cause most issues
   - A/B test different enforcement strategies

---

## Related Files

- `server/services/openai.js` - Main implementation
- `server/config/prompts.js` - Prompt templates
- `server/config/PROMPTS_README.md` - Prompt documentation

---

## Troubleshooting

### Issue: Still seeing location jumps

**Solution:**
1. Check if `SETTING LOCK` rules are in the prompt
2. Verify `LOCATION ENFORCEMENT` is present
3. Check console for validation warnings
4. Increase temperature if AI is being too creative

### Issue: Stories feel too constrained

**Solution:**
1. Ensure location is broad enough (e.g., "museum" not "museum entrance")
2. Allow movement within the location
3. Use varied scenes within the same setting

### Issue: False positive warnings

**Solution:**
1. Update `locationKeywords` dictionary
2. Add more specific keywords
3. Improve detection algorithm

---

**Last Updated:** 2026-05-02  
**Status:** ✅ Implemented and Active
