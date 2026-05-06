# PDF Features - Testing Checklist

## Pre-Testing Setup

### Database Migration
- [ ] Restart server to apply `text_size` column migration
- [ ] Verify migration ran successfully (check server logs)
- [ ] Confirm existing books have default `text_size='md'`

### Code Verification
- [ ] All modified files have no syntax errors
- [ ] Client builds successfully (`npm run build` in client/)
- [ ] Server starts without errors (`npm run dev` in server/)

---

## Feature 1: Font Size Selection

### Small Text Size (sm)
- [ ] Generate a new book with "Small" text size selected
- [ ] Export to PDF
- [ ] Verify title page title is 24pt (smaller than default)
- [ ] Verify story content is 14pt (smaller than default)
- [ ] Verify page numbers are 9pt
- [ ] Verify dedication text is 10pt
- [ ] Verify conclusion text is 18pt
- [ ] Confirm text doesn't look cramped or hard to read

### Medium Text Size (md) - Default
- [ ] Generate a new book with "Medium" text size selected
- [ ] Export to PDF
- [ ] Verify title page title is 28pt
- [ ] Verify story content is 16pt
- [ ] Verify page numbers are 10pt
- [ ] Verify dedication text is 12pt
- [ ] Verify conclusion text is 20pt
- [ ] Confirm this matches the previous default appearance

### Large Text Size (lg)
- [ ] Generate a new book with "Large" text size selected
- [ ] Export to PDF
- [ ] Verify title page title is 32pt (larger than default)
- [ ] Verify story content is 18pt (larger than default)
- [ ] Verify page numbers are 11pt
- [ ] Verify dedication text is 14pt
- [ ] Verify conclusion text is 22pt
- [ ] Confirm text doesn't overflow page boundaries
- [ ] Check that large text still fits within margins

### Edge Cases - Font Size
- [ ] Generate book without selecting text size (should default to 'md')
- [ ] Open an old book (created before this feature) and export to PDF (should use 'md')
- [ ] Try all three sizes with a 12-page book (maximum pages)
- [ ] Try all three sizes with a 3-page book (minimum pages)

---

## Feature 2: Decorative Borders

### None Border (Default)
- [ ] Generate a new book with "None" border selected
- [ ] Export to PDF
- [ ] Verify NO border appears on any page
- [ ] Confirm clean, minimal appearance

### Classic Border
- [ ] Generate a new book with "Classic" border selected
- [ ] Export to PDF
- [ ] Verify gray double-rectangle border appears on ALL pages
- [ ] Check border is 15pt outside content margin
- [ ] Verify border doesn't overlap with content
- [ ] Confirm border is behind images and text (not covering them)
- [ ] Check border appears on: title page, story pages, conclusion page

### Floral Border
- [ ] Generate a new book with "Floral" border selected
- [ ] Export to PDF
- [ ] Verify purple/lavender border appears on ALL pages
- [ ] Check corner decorations (circles) are visible
- [ ] Verify thicker line width (3pt) is noticeable
- [ ] Confirm whimsical, fairy-tale appearance

### Stars Border
- [ ] Generate a new book with "Stars" border selected
- [ ] Export to PDF
- [ ] Verify gold dashed border appears on ALL pages
- [ ] Check corner stars (circles) are visible
- [ ] Verify dashed pattern (10pt dash, 5pt gap) is visible
- [ ] Confirm magical, adventure-story appearance

### Royal Border
- [ ] Generate a new book with "Royal" border selected
- [ ] Export to PDF
- [ ] Verify brown/gold triple-line border appears on ALL pages
- [ ] Check all three nested rectangles are visible
- [ ] Verify elegant, formal appearance
- [ ] Confirm different line widths create depth effect

### Edge Cases - Borders
- [ ] Generate book without selecting border (should default to 'None')
- [ ] Open an old book (created before this feature) and export to PDF (should have no border)
- [ ] Try each border with different page counts (3, 6, 12 pages)
- [ ] Verify borders work with cover images
- [ ] Verify borders work with pages that have no images

---

## Feature 3: Combined Testing

### Font Size + Border Combinations
- [ ] Small text + Classic border
- [ ] Small text + Floral border
- [ ] Medium text + Stars border
- [ ] Large text + Royal border
- [ ] Large text + None border

### With Other Features
- [ ] Border + Watermark (verify watermark still appears correctly)
- [ ] Border + Different fonts (system, serif, Lora, Pacifico, etc.)
- [ ] Border + Different art styles (Watercolor, Pixar, Crayon)
- [ ] Large text + Border + 12 pages (stress test)

### In-App vs PDF
- [ ] Verify borders do NOT appear in in-app book preview
- [ ] Verify borders ONLY appear in exported PDF
- [ ] Confirm text size in app matches text size in PDF (proportionally)

---

## Feature 4: Backward Compatibility

### Existing Books
- [ ] Open a book created before this feature was added
- [ ] Export to PDF
- [ ] Verify it uses default values (md text size, no border)
- [ ] Confirm no errors or crashes

### Database
- [ ] Check that `text_size` column exists in `books` table
- [ ] Verify existing books have `text_size='md'` (default)
- [ ] Confirm new books save `text_size` correctly

---

## Feature 5: Error Handling

### Invalid Values
- [ ] Try sending invalid `textSize` value via API (should default to 'md')
- [ ] Try sending invalid `borderStyle` value (should handle gracefully)
- [ ] Try generating PDF with missing `text_size` in book object (should default to 'md')
- [ ] Try generating PDF with missing `border_style` in book object (should show no border)

### Edge Cases
- [ ] Very long book title with large text size (check overflow)
- [ ] Very long story content with large text size (check pagination)
- [ ] Book with only title page (no story pages)
- [ ] Book with maximum pages (12) + large text + border

---

## Visual Quality Checks

### Text Readability
- [ ] Small text is still readable (not too small)
- [ ] Large text doesn't look oversized or childish
- [ ] Text spacing is appropriate for each size
- [ ] Line height adjusts properly with font size

### Border Aesthetics
- [ ] Borders are visually appealing
- [ ] Border colors match the descriptions
- [ ] Borders don't distract from content
- [ ] Corner decorations are well-positioned
- [ ] Borders look professional and polished

### Overall Layout
- [ ] Content is well-centered within borders
- [ ] Images don't overlap with borders
- [ ] Watermark is still visible with borders
- [ ] Page numbers are positioned correctly
- [ ] Dedication text is properly placed

---

## Performance Testing

### PDF Generation Speed
- [ ] Time PDF generation with no border (baseline)
- [ ] Time PDF generation with border (should be negligible difference)
- [ ] Time PDF generation with large text (should be same speed)
- [ ] Confirm no noticeable slowdown

### File Size
- [ ] Check PDF file size with no border
- [ ] Check PDF file size with border (should be minimal increase)
- [ ] Confirm file sizes are reasonable (<5MB for typical book)

---

## User Experience Testing

### UI Flow
- [ ] Text size selection is intuitive
- [ ] Border selection is intuitive
- [ ] Icons for borders are clear and descriptive
- [ ] Selected options are visually highlighted
- [ ] Options persist when navigating away and back

### Feedback
- [ ] User understands borders only apply to PDF
- [ ] User can preview text size effect (in-app)
- [ ] User receives confirmation after PDF generation
- [ ] Error messages are clear if something fails

---

## Regression Testing

### Existing Features Still Work
- [ ] Photo upload works
- [ ] Theme selection works
- [ ] Art style selection works
- [ ] Font selection works
- [ ] Story generation works
- [ ] AI image generation works
- [ ] Audio generation works
- [ ] In-app book preview works
- [ ] Favorite/unfavorite works
- [ ] Book library works
- [ ] Credit system works
- [ ] Watermark still appears

---

## Sign-Off

### Developer Checklist
- [ ] All code changes committed
- [ ] Documentation updated
- [ ] No console errors in browser
- [ ] No server errors in logs
- [ ] Database migration successful

### QA Checklist
- [ ] All test cases passed
- [ ] No critical bugs found
- [ ] User experience is smooth
- [ ] Visual quality is acceptable
- [ ] Performance is acceptable

### Product Owner Checklist
- [ ] Feature meets requirements
- [ ] Borders only apply to PDF (as requested)
- [ ] Font size is respected in PDF (as requested)
- [ ] Ready for production deployment

---

## Notes

**Test Environment:**
- Browser: _____________
- OS: _____________
- Server: _____________
- Database: _____________

**Issues Found:**
1. _____________
2. _____________
3. _____________

**Additional Comments:**
_____________________________________________
_____________________________________________
_____________________________________________
