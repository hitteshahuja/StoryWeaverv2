# PDF Border Styles - Visual Reference

## Border Style Specifications

### 1. None
```
No border applied - clean, minimal look
```

### 2. Classic
```
┌─────────────────────────────────┐
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │        Page Content         │ │
│ │                             │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```
- **Color**: Gray (RGB: 100, 100, 100)
- **Style**: Double rectangle
- **Line Width**: 2pt
- **Spacing**: 5pt between rectangles
- **Use Case**: Professional, traditional storybooks

### 3. Floral
```
●─────────────────────────────────●
│                                 │
│        Page Content             │
│                                 │
●─────────────────────────────────●
```
- **Color**: Purple/Lavender (RGB: 180, 140, 220)
- **Style**: Single rectangle with corner circles
- **Line Width**: 3pt (thicker)
- **Corner Decorations**: 8pt radius circles (filled)
- **Use Case**: Whimsical, fairy tale stories

### 4. Stars
```
★- - - - - - - - - - - - - - - - -★
:                                 :
:        Page Content             :
:                                 :
★- - - - - - - - - - - - - - - - -★
```
- **Color**: Gold (RGB: 255, 215, 0)
- **Style**: Dashed rectangle with corner stars
- **Line Width**: 2pt
- **Dash Pattern**: 10pt dash, 5pt gap
- **Corner Decorations**: 6pt radius circles (filled)
- **Use Case**: Magical, adventure stories

### 5. Royal
```
╔═════════════════════════════════╗
║ ╔═════════════════════════════╗ ║
║ ║ ┌─────────────────────────┐ ║ ║
║ ║ │                         │ ║ ║
║ ║ │    Page Content         │ ║ ║
║ ║ │                         │ ║ ║
║ ║ └─────────────────────────┘ ║ ║
║ ╚═════════════════════════════╝ ║
╚═════════════════════════════════╝
```
- **Color**: Brown/Gold (RGB: 139, 69, 19)
- **Style**: Triple nested rectangles
- **Line Widths**: 1pt (outer), 1pt (middle), 2pt (inner)
- **Spacing**: 3pt, then 4pt between rectangles
- **Use Case**: Elegant, formal, classic literature style

## Border Positioning

All borders are positioned:
- **15pt outside** the content margin
- **35pt from page edge** (since content margin is 50pt)
- **Drawn first** so they appear behind all content
- **Applied to all pages** (title, story, conclusion)

## Color Palette Summary

| Style   | Color Name    | RGB Values      | Hex Code |
|---------|---------------|-----------------|----------|
| Classic | Gray          | 100, 100, 100   | #646464  |
| Floral  | Lavender      | 180, 140, 220   | #B48CDC  |
| Stars   | Gold          | 255, 215, 0     | #FFD700  |
| Royal   | Brown/Gold    | 139, 69, 19     | #8B4513  |

## Implementation Notes

### Drawing Order
1. Border (drawn first - background layer)
2. Images (middle layer)
3. Text (top layer)
4. Watermark (overlay)

### Border Margins
```
Page Edge (0pt)
    ↓
    ├─ 35pt ─┤ Border starts here
    │        │
    ├─ 50pt ─┤ Content margin starts here
    │        │
    │ Content │
    │        │
    └────────┘
```

### Compatibility
- Works with all font sizes (sm, md, lg)
- Works with all font types
- Works with all page types (title, story, conclusion)
- Does not interfere with watermark
- Does not interfere with images

## User Experience

### In UI
- User sees border options with icons:
  - ⬜ None
  - 🖼️ Classic
  - 🌸 Floral
  - ✨ Stars
  - 👑 Royal

### In PDF
- Border appears on every page
- Border is consistent throughout the book
- Border does not appear in in-app preview (PDF only)
- Border respects page boundaries
- Border does not cover content

## Code Reference

### Drawing Function Signature
```javascript
drawBorder(doc, borderStyle, pageWidth, pageHeight, margin)
```

### Usage Example
```javascript
// At the start of each page loop, after doc.addPage()
drawBorder(doc, selectedBook.border_style, pageWidth, pageHeight, margin);
```

### Switch Statement Structure
```javascript
switch (borderStyle) {
  case 'Classic':  // Double rectangle
  case 'Floral':   // Rectangle + corner circles
  case 'Stars':    // Dashed rectangle + corner stars
  case 'Royal':    // Triple nested rectangles
  default:         // No border
}
```
