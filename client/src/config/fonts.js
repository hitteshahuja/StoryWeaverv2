export const FONTS = [
  { 
    id: 'system', 
    name: 'System Default', 
    description: 'Uses your device\'s default font',
    css: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
    pdf: 'helvetica',
    cssFontFamily: 'inherit'
  },
  { 
    id: 'serif', 
    name: 'Classic Serif', 
    description: 'Elegant traditional serif font',
    css: 'Georgia, "Times New Roman", serif', 
    pdf: 'times',
    cssFontFamily: 'Georgia, serif'
  },
  { 
    id: 'lora', 
    name: 'Lora', 
    description: 'Beautiful contemporary serif',
    css: '"Lora", Georgia, serif', 
    pdf: 'times',
    googleFont: 'Lora',
    cssFontFamily: '"Lora", serif'
  },
  { 
    id: 'pacifico', 
    name: 'Pacifico', 
    description: 'Playful handwritten cursive',
    css: '"Pacifico", cursive', 
    pdf: 'helvetica',
    googleFont: 'Pacifico',
    cssFontFamily: '"Pacifico", cursive'
  },
  { 
    id: 'comic', 
    name: 'Comic Sans', 
    description: 'Friendly and approachable',
    css: '"Comic Neue", "Comic Sans MS", cursive', 
    pdf: 'helvetica',
    googleFont: 'Comic+Neue',
    cssFontFamily: '"Comic Neue", cursive'
  },
  { 
    id: 'quicksand', 
    name: 'Quicksand', 
    description: 'Rounded friendly sans-serif',
    css: '"Quicksand", "Segoe UI", sans-serif', 
    pdf: 'helvetica',
    googleFont: 'Quicksand',
    cssFontFamily: '"Quicksand", sans-serif'
  },
  { 
    id: 'crimson', 
    name: 'Crimson Text', 
    description: 'Classic book-style serif',
    css: '"Crimson Text", Georgia, serif', 
    pdf: 'times',
    googleFont: 'Crimson+Text',
    cssFontFamily: '"Crimson Text", serif'
  },
  { 
    id: 'balsamiq', 
    name: 'Balsamiq Sans', 
    description: 'Casual hand-drawn feel',
    css: '"Balsamiq Sans", cursive', 
    pdf: 'helvetica',
    googleFont: 'Balsamiq+Sans',
    cssFontFamily: '"Balsamiq Sans", cursive'
  },
];

export const DEFAULT_FONT = 'system';

export const getFontById = (id) => {
  const font = FONTS.find(f => f.id === id);
  return font || FONTS.find(f => f.id === DEFAULT_FONT);
};

export const getGoogleFontsUrl = (fontIds) => {
  const fonts = fontIds.map(id => getFontById(id)).filter(f => f.googleFont);
  if (fonts.length === 0) return '';
  const families = fonts.map(f => `${f.googleFont}:400,700`).join('&family=');
  return `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
};
