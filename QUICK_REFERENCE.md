# Quick Reference: PDF Borders & Font Size

## 🚀 Quick Start

### For Users
1. Create a new book in the app
2. Select **Text Size**: Small, Medium, or Large
3. Select **Decorative Border**: None, Classic, Floral, Stars, or Royal
4. Generate your book
5. Export to PDF - your selections will be applied!

### For Developers
```javascript
// Font sizes are automatically applied based on book.text_size
const fontSizes = getFontSizes(book.text_size);
// Returns: { title: 28, content: 16, dedication: 12, pageNumber: 10, conclusion: 20 }

// Borders are automatically drawn based on book.border_style
drawBorder(doc, book.border_style, pageWidth, pageHeight, margin);
```

---

## 📐 Font Size Mapping

| UI Selection | Database Value | Title | Content | Page# |
|--------------|----------------|-------|---------|-------|
| Small        | `'sm'`         | 24pt  | 14pt    | 9pt   |
| Medium       | `'md'`         | 28pt  | 16pt    | 10pt  |
| Large        | `'lg'`         | 32pt  | 18pt    | 11pt  |

**Default**: Medium (`'md'`)

---

## 🎨 Border Styles

| UI Selection | Database Value | Color     | Pattern              |
|--------------|----------------|-----------|----------------------|
| None         | `'None'`       | -         | No border            |
| Classic      | `'Classic'`    | Gray      | Double rectangle     |
| Floral       | `'Floral'`     | Lavender  | Rectangle + circles  |
| Stars        | `'Stars'`      | Gold      | Dashed + stars       |
| Royal        | `'Royal'`      | Brown     | Triple rectangle     |

**Default**: None (`'None'`)

---

## 🗄️ Database Schema

```sql
-- Books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS text_size VARCHAR(10) DEFAULT 'md';
-- border_style column already exists
```

---

## 🔧 API Request

```javascript
POST /api/books/generate
{
  "textSize": "lg",           // 'sm' | 'md' | 'lg'
  "borderStyle": "Floral",    // 'None' | 'Classic' | 'Floral' | 'Stars' | 'Royal'
  // ... other fields
}
```

---

## 📂 Files Modified

1. `client/src/utils/printHelpers.js` - Main PDF generation
2. `client/src/pages/AppPage.jsx` - In-app PDF generation
3. `server/services/print.js` - Server-side PDF (future)
4. `server/routes/books.js` - API endpoint
5. `server/db/schema.sql` - Database migration

---

## ✅ Testing Checklist (Minimal)

- [ ] Generate book with Small text → Export PDF → Verify smaller text
- [ ] Generate book with Large text → Export PDF → Verify larger text
- [ ] Generate book with Classic border → Export PDF → Verify gray double border
- [ ] Generate book with Stars border → Export PDF → Verify gold dashed border
- [ ] Open old book → Export PDF → Verify defaults (Medium, No border)
- [ ] Verify borders do NOT appear in in-app preview

---

## 🐛 Troubleshooting

### Border not appearing in PDF
- Check `book.border_style` is set in database
- Verify `drawBorder()` is called before content rendering
- Ensure border style name matches exactly (case-sensitive)

### Font size not changing
- Check `book.text_size` is set in database
- Verify `getFontSizes()` is called with correct parameter
- Ensure font sizes are applied to all text elements

### Database error
- Run migration: `ALTER TABLE books ADD COLUMN IF NOT EXISTS text_size VARCHAR(10) DEFAULT 'md';`
- Restart server to apply schema changes
- Check server logs for migration errors

---

## 📚 Full Documentation

- **Complete Guide**: `PDF_FEATURES_IMPLEMENTATION.md`
- **Border Reference**: `BORDER_STYLES_REFERENCE.md`
- **Test Checklist**: `PDF_FEATURES_TEST_CHECKLIST.md`
- **Summary**: `IMPLEMENTATION_SUMMARY.md`

---

## 💡 Tips

- Borders only appear in **PDF exports**, not in-app preview
- Font size affects **all text elements** proportionally
- Old books automatically use **Medium text** and **No border**
- Border is drawn **behind content** (won't cover text/images)
- Watermark still appears **on top of border**

---

**Status**: ✅ Ready for Testing
**Last Updated**: May 2, 2026
