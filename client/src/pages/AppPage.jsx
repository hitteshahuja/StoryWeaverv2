import { useState, useEffect } from 'react';
import { RedirectToSignIn, useAuth } from '@clerk/clerk-react';
import { Sparkles, Loader2, WandSparkles, BookOpen, PlusCircle, X, Maximize2, RefreshCw } from 'lucide-react';
import PhotoUpload from '../components/PhotoUpload';
import Storyboard from '../components/Storyboard';
import BookPreview from '../components/BookPreview';
import UpsellModal from '../components/UpsellModal';
import CreditModal from '../components/CreditModal';
import StarField from '../components/StarField';
import { Zap } from 'lucide-react';
import { booksAPI } from '../lib/api';
import { useDbUser } from '../context/UserContext';
import { FONTS, DEFAULT_FONT, getFontById } from '../config/fonts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function AppPage() {
  const { isSignedIn } = useAuth();
  const { dbUser, refreshUser } = useDbUser();
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [dedicatedBy, setDedicatedBy] = useState('');
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [availableStyles, setAvailableStyles] = useState([
    { name: 'Watercolor', description: 'Soft, artistic & flowing', icon: '🎨', cssFilter: 'saturate(1.2) contrast(0.9)' },
    { name: 'Pixar-style', description: '3D animated & vibrant', icon: '🎬', cssFilter: 'saturate(1.3) contrast(1.1) brightness(1.05)' },
    { name: 'Classic Crayon', description: 'Hand-drawn with love', icon: '🖍️', cssFilter: 'contrast(1.1) grayscale(0.2)' },
  ]);
  const [selectedStyle, setSelectedStyle] = useState(availableStyles[0].name);
  const [styleFilter, setStyleFilter] = useState(availableStyles[0].cssFilter);
  const [pageCount, setPageCount] = useState(10);
  const [selectedBorder, setSelectedBorder] = useState('None');
  const [selectedFont, setSelectedFont] = useState(DEFAULT_FONT);
  const [childFeatures, setChildFeatures] = useState(null);
  const [extractingFeatures, setExtractingFeatures] = useState(false);
  const [showBookPreview, setShowBookPreview] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [isCustomTheme, setIsCustomTheme] = useState(false);
  const [customThemeInput, setCustomThemeInput] = useState('');

  const BORDERS = [
    { name: 'None', icon: '⬜' },
    { name: 'Classic', icon: '🖼️' },
    { name: 'Floral', icon: '🌸' },
    { name: 'Stars', icon: '✨' },
    { name: 'Royal', icon: '👑' },
  ];

  // Pre-populate from profile settings
  useEffect(() => {
    if (dbUser) {
      if (dbUser.child_name && !childName) setChildName(dbUser.child_name);
      if (dbUser.child_age && !childAge) setChildAge(String(dbUser.child_age));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbUser]);

  // Clamp page count to valid range
  useEffect(() => {
    const maxPages = Math.max(photos.length, 12);
    if (pageCount > maxPages) setPageCount(maxPages);
    if (pageCount < 3) setPageCount(3);
  }, [photos.length]);

  const credits = dbUser?.credits ?? 0;
  const canGenerate = credits >= pageCount && photos.length > 0 && !loading && !analyzing;
  const canRefresh = credits >= 1 && !analyzing && !extractingFeatures;

  const handleUpload = async (newPhotos) => {
    const updated = [...photos, ...newPhotos];
    setPhotos(updated);

    // Analyze first photo for themes and AI filters if we haven't yet
    if (newPhotos.length > 0) {
      setAnalyzing(true);
      if (!location && newPhotos[0].location) setLocation(newPhotos[0].location);
      try {
        const [themeRes, styleRes] = await Promise.all([
          booksAPI.analyze({ imageUrl: newPhotos[0].url }),
          booksAPI.suggestFilters({ imageUrl: newPhotos[0].url })
        ]);

        setThemes(themeRes.themes || []);
        if (themeRes.themes?.length > 0) setSelectedTheme(themeRes.themes[0]);

        if (styleRes.styles?.length > 0) {
          setAvailableStyles(styleRes.styles);
          setSelectedStyle(styleRes.styles[0].name);
          setStyleFilter(styleRes.styles[0].cssFilter);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setAnalyzing(false);
      }

      // Extract child features from ALL uploaded photos (runs in parallel with above)
      setExtractingFeatures(true);
      try {
        const allImageUrls = updated.map(p => p.url);
        const featureRes = await booksAPI.extractFeatures({
          imageUrls: allImageUrls,
          childName,
          childAge: childAge ? parseInt(childAge, 10) : undefined
        });
        if (featureRes.features) {
          setChildFeatures(featureRes.features);
        }
      } catch (err) {
        console.error('Feature extraction failed:', err);
      } finally {
        setExtractingFeatures(false);
      }
    }
  };

  const handleRefreshThemes = async () => {
    if (photos.length === 0) return;

    // Show confirmation if user has credits
    if (!showRefreshConfirm) {
      setShowRefreshConfirm(true);
      return;
    }
    setShowRefreshConfirm(false);

    if (credits < 1) {
      setShowCreditModal(true);
      return;
    }

    setAnalyzing(true);
    setExtractingFeatures(true);
    try {
      const result = await booksAPI.refresh({
        imageUrl: photos[0].url,
        imageUrls: photos.map(p => p.url),
        childName,
        childAge: childAge ? parseInt(childAge, 10) : undefined,
        location
      });

      setThemes(result.themes || []);
      if (result.themes?.length > 0) setSelectedTheme(result.themes[0]);
      setIsCustomTheme(false);
      setCustomThemeInput('');

      if (result.features) {
        setChildFeatures(result.features);
      }

      await refreshUser();
    } catch (err) {
      console.error('Refresh failed:', err);
      if (err.response?.status === 402) {
        setShowCreditModal(true);
      }
    } finally {
      setAnalyzing(false);
      setExtractingFeatures(false);
    }
  };

  const handleGenerate = async () => {
    if (photos.length === 0) { setError('Please upload some photos first.'); return; }
    if (credits < pageCount) { setShowCreditModal(true); return; }

    // Show confirmation on first click
    if (!showGenerateConfirm) {
      setShowGenerateConfirm(true);
      return;
    }
    setShowGenerateConfirm(false);

    setLoading(true);
    setError('');
    setBook(null);

    try {
      const result = await booksAPI.generate({
        imageUrls: photos.map(p => p.url),
        childName,
        childAge: childAge ? parseInt(childAge, 10) : undefined,
        location,
        theme: selectedTheme,
        style: selectedStyle,
        styleFilter,
        borderStyle: selectedBorder,
        font: selectedFont,
        pageCount,
        customPrompt,
        dedicatedBy: dedicatedBy || undefined,
        childFeatures: childFeatures || undefined,
        coverImageUrl: coverImage || undefined
      });

      const fullBook = await booksAPI.get(result.bookId);
      setBook(fullBook);
      await refreshUser();

      // Show upsell after 3 seconds
      setTimeout(() => setShowUpsell(true), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Book generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Polling for AI Transformation completion
  useEffect(() => {
    let interval;
    if (book && book.id && book.pages?.some(p => p.image_url && !p.ai_image_url)) {
      interval = setInterval(async () => {
        try {
          const updated = await booksAPI.get(book.id);
          setBook(updated); // Update to grab new images seamlessly

          if (!updated.pages?.some(p => p.image_url && !p.ai_image_url)) {
            clearInterval(interval);
          }
        } catch (err) {
          console.error('[Polling Error]', err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [book?.id]); // Restart polling when book ID changes

  const handlePrint = async () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    const getImageFormat = (dataUrl) => {
      if (dataUrl.startsWith('data:image/png')) return 'PNG';
      if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
      if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
      return 'PNG';
    };

    const fetchImageAsBase64 = async (url) => {
      try {
        const result = await booksAPI.proxyImage(url);
        return result.data;
      } catch (err) {
        console.error('Failed to load image:', url, err);
        return null;
      }
    };

    const getImageDimensions = (base64) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => resolve({ width: 100, height: 100 });
        img.src = base64;
      });
    };

    const imgInfos = await Promise.all(book.pages.map(async (p) => {
      const imgUrl = p.ai_image_url || p.image_url;
      if (!imgUrl) return null;
      const b64 = await fetchImageAsBase64(imgUrl);
      if (!b64) return null;
      const dims = await getImageDimensions(b64);
      return { b64, ...dims };
    }));

    for (let i = 0; i < book.pages.length; i++) {
      const page = book.pages[i];
      const imgInfo = imgInfos[i];

      if (i > 0) doc.addPage();

      if (page.type === 'title') {
        let titleYOffset = margin + 20;
        if (imgInfo) {
          const maxBox = Math.min(contentWidth, 350);
          const aspectRatio = imgInfo.width / imgInfo.height;
          let targetW = maxBox;
          let targetH = targetW / aspectRatio;

          if (targetH > maxBox) {
            targetH = maxBox;
            targetW = targetH * aspectRatio;
          }

          const imgX = (pageWidth - targetW) / 2;
          doc.addImage(imgInfo.b64, getImageFormat(imgInfo.b64), imgX, margin + 20, targetW, targetH);
          titleYOffset = margin + 20 + targetH + 40;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.setTextColor(50, 50, 50);
        const titleY = imgInfo ? titleYOffset : pageHeight / 2 - 40;
        const titleLines = doc.splitTextToSize(page.content, contentWidth);
        doc.text(titleLines, pageWidth / 2, titleY, { align: 'center', maxWidth: contentWidth });
        doc.setDrawColor(180, 140, 220);
        doc.setLineWidth(2);
        doc.line(pageWidth / 2 - 40, titleY + 20, pageWidth / 2 + 40, titleY + 20);

        if (page.dedication) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(12);
          doc.setTextColor(140, 140, 140);
          doc.text(page.dedication, pageWidth / 2, titleY + 45, { align: 'center' });
        }
      } else if (page.type === 'conclusion') {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(20);
        doc.setTextColor(80, 80, 80);
        const endLines = doc.splitTextToSize(page.content, contentWidth);
        doc.text(endLines, pageWidth / 2, pageHeight / 2, { align: 'center', maxWidth: contentWidth, lineHeightFactor: 1.6 });
      } else {
        let textStartY = margin + 40;
        if (imgInfo) {
          const maxHeight = 400;
          const aspectRatio = imgInfo.width / imgInfo.height;
          let targetW = contentWidth;
          let targetH = targetW / aspectRatio;

          if (targetH > maxHeight) {
            targetH = maxHeight;
            targetW = targetH * aspectRatio;
          }

          const imgX = margin + (contentWidth - targetW) / 2;
          doc.addImage(imgInfo.b64, getImageFormat(imgInfo.b64), imgX, margin, targetW, targetH);
          textStartY = margin + targetH + 30;
        }

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(16);
        doc.setTextColor(60, 60, 60);
        const textLines = doc.splitTextToSize(page.content, contentWidth);
        doc.text(textLines, margin, textStartY, { maxWidth: contentWidth, lineHeightFactor: 1.6 });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(160, 160, 160);
        doc.text(`Page ${page.page_number}`, pageWidth / 2, pageHeight - 30, { align: 'center' });
      }
    }

    doc.save(`${book.title.replace(/\s+/g, '_')}.pdf`);
  };

  const handleRefreshImage = async (pageNumber, customPrompt = '') => {
    if (credits < 2) {
      setShowCreditModal(true);
      return;
    }

    try {
      const result = await booksAPI.refreshImage(book.id, pageNumber, customPrompt);
      if (result.success && result.newImageUrl) {
        setBook(prev => ({
          ...prev,
          pages: prev.pages.map(p =>
            p.page_number === pageNumber
              ? { ...p, ai_image_url: result.newImageUrl }
              : p
          )
        }));
        await refreshUser();
      }
    } catch (err) {
      console.error('Failed to refresh image:', err);
      alert('Failed to refresh image. Please try again.');
    }
  };

  // Logic for favoriting is handled in LibraryPage for individual items

  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="relative min-h-screen">
      <StarField />
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex p-3 rounded-2xl bg-dream-500/10 border border-dream-500/20 mb-4 animate-float">
            <WandSparkles className="w-7 h-7 text-dream-300" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create a Story</h1>
          <p className="text-gray-500 dark:text-white/50">
            Upload photos and let the magic begin ·{' '}
            <span className={`font-semibold ${credits === 0 ? 'text-red-500 dark:text-red-400' : 'text-dream-600 dark:text-dream-300'}`}>
              {credits} credit{credits !== 1 ? 's' : ''} remaining
            </span>
          </p>
        </div>

        <div className="space-y-8">
          {/* Step 1: Photos & Storyboard */}
          <section className="space-y-6">
            <div className="card">
              <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
                <PlusCircle className="w-4 h-4" /> Step 1 — Upload Your Photos
              </p>
              <PhotoUpload onUpload={handleUpload} currentCount={photos.length} />
            </div>

            {photos.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Storyboard items={photos} setItems={setPhotos} filter={styleFilter} coverImage={coverImage} onSetCover={setCoverImage} />
              </div>
            )}
          </section>

          {/* Step 2: Story Details */}
          {photos.length > 0 && (
            <div className="card space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider">
                  Step 2 — Personalize the Story
                </p>
                <button
                  onClick={handleRefreshThemes}
                  disabled={!canRefresh}
                  className="flex items-center gap-1.5 text-xs font-medium text-dream-600 dark:text-dream-300 hover:text-dream-700 dark:hover:text-dream-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Regenerate themes and features (costs 1 credit)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${analyzing || extractingFeatures ? 'animate-spin' : ''}`} />
                  Refresh (1 credit)
                </button>
              </div>

              {/* Refresh Confirmation */}
              {showRefreshConfirm && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 space-y-3">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Refreshing your story will cost 1 credit. Continue?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRefreshThemes}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                    >
                      Yes, use 1 credit
                    </button>
                    <button
                      onClick={() => setShowRefreshConfirm(false)}
                      className="px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Child Features Display */}
              {extractingFeatures && (
                <div className="flex items-center gap-3 text-sm text-dream-600 dark:text-dream-300 bg-dream-50 dark:bg-dream-500/10 p-4 rounded-2xl border border-dream-200 dark:border-dream-500/20">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Studying your characters' unique features...
                </div>
              )}
              {childFeatures && !extractingFeatures && (
                <div className="bg-dream-50/50 dark:bg-dream-500/5 border border-dream-200/50 dark:border-dream-500/10 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-semibold text-dream-600 dark:text-dream-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> What the AI sees in your photos
                  </p>
                  {childFeatures.characters && childFeatures.characters.length > 1 ? (
                    <div className="space-y-4">
                      {childFeatures.characters.map((char, i) => (
                        <div key={i} className="space-y-2">
                          <p className="text-sm font-bold text-gray-800 dark:text-white/90">{char.name}</p>
                          <p className="text-xs text-gray-600 dark:text-white/70 leading-relaxed">
                            {char.fantasy_character_description}
                          </p>
                          {char.personality_traits?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {char.personality_traits.map((trait, j) => (
                                <span key={j} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-dream-100 dark:bg-dream-500/15 text-dream-700 dark:text-dream-300 border border-dream-200/50 dark:border-dream-500/10">
                                  {trait}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-700 dark:text-white/80 leading-relaxed">
                        {childFeatures.fantasy_character_description}
                      </p>
                      {childFeatures.personality_traits?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {childFeatures.personality_traits.map((trait, i) => (
                            <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-dream-100 dark:bg-dream-500/15 text-dream-700 dark:text-dream-300 border border-dream-200/50 dark:border-dream-500/10">
                              {trait}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white/70">Character Name(s)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Leo and Luna, or Leo and Mr. Buttons"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                  />
                  <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">Separate multiple names with "and" or commas</p>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white/70">Age</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 4"
                    min="1"
                    max="18"
                    value={childAge}
                    onChange={(e) => setChildAge(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white/70">Setting / Location</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. A magical forest"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-white/70">Pick a Magical Theme</label>
                {analyzing ? (
                  <div className="flex items-center gap-3 text-sm text-dream-600 dark:text-dream-300 bg-dream-50 dark:bg-dream-500/10 p-4 rounded-2xl border border-dream-200 dark:border-dream-500/20">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finding magic in your photos...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {themes.map((t, i) => (
                      <label key={i} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${selectedTheme === t ? 'border-dream-400 bg-dream-50 dark:bg-dream-500/10 shadow-sm' : 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'}`}>
                        <input
                          type="radio"
                          name="theme"
                          className="text-dream-400 focus:ring-dream-400/50 bg-white dark:bg-night-900 border-gray-300 dark:border-white/20 w-4 h-4 cursor-pointer"
                          checked={selectedTheme === t}
                          onChange={() => { setSelectedTheme(t); setIsCustomTheme(false); }}
                        />
                        <span className="text-gray-800 dark:text-white/90 text-sm font-medium">{t}</span>
                      </label>
                    ))}
                    <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${isCustomTheme ? 'border-dream-400 bg-dream-50 dark:bg-dream-500/10 shadow-sm' : 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'}`}>
                      <input
                        type="radio"
                        name="theme"
                        className="text-dream-400 focus:ring-dream-400/50 bg-white dark:bg-night-900 border-gray-300 dark:border-white/20 w-4 h-4 cursor-pointer"
                        checked={isCustomTheme}
                        onChange={() => setIsCustomTheme(true)}
                      />
                      <span className="text-gray-800 dark:text-white/90 text-sm font-medium">Write your own...</span>
                    </label>
                    {isCustomTheme && (
                      <input
                        type="text"
                        className="input ml-8"
                        placeholder="e.g. A friendly dragon who bakes cookies in the clouds"
                        value={customThemeInput}
                        onChange={(e) => { setCustomThemeInput(e.target.value); setSelectedTheme(e.target.value); }}
                        autoFocus
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-white/70">Image Rendering Style</label>
                <div className="grid grid-cols-2 gap-3">
                  {availableStyles.map((style) => (
                    <button
                      key={style.name}
                      onClick={() => {
                        setSelectedStyle(style.name);
                        setStyleFilter(style.cssFilter);
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300
                                  ${selectedStyle === style.name
                          ? 'border-dream-400 bg-dream-50 dark:bg-dream-500/10 ring-2 ring-dream-500/20 shadow-lg scale-[1.02]'
                          : 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                    >
                      <span className="text-3xl">{style.emoji || style.icon}</span>
                      <div className="text-center">
                        <p className={`text-sm font-bold ${selectedStyle === style.name ? 'text-dream-600 dark:text-dream-300' : 'text-gray-900 dark:text-white'}`}>
                          {style.name}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-white/40 mt-0.5 line-clamp-1">{style.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white/70">Number of Story Pages</label>
                  <span className="text-dream-600 dark:text-dream-300 font-bold text-sm bg-dream-500/10 px-3 py-1 rounded-full">{pageCount} Story Page{pageCount !== 1 ? 's' : ''} + Start & End</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={Math.max(photos.length, 12)}
                  step="1"
                  value={pageCount}
                  onChange={(e) => setPageCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-dream-500"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-400 dark:text-white/20 px-1">
                  <span>3 PAGES</span>
                  <span>{Math.max(photos.length, 12)} PAGES</span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-white/70">Decorative Border</label>
                <div className="flex flex-wrap gap-2">
                  {BORDERS.map((border) => (
                    <button
                      key={border.name}
                      onClick={() => setSelectedBorder(border.name)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-300 flex items-center gap-2
                                  ${selectedBorder === border.name
                          ? 'border-dream-400 bg-dream-50 dark:bg-dream-500/10 text-dream-600 dark:text-dream-300 shadow-sm'
                          : 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                    >
                      <span className="text-base">{border.icon}</span>
                      {border.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-white/70">Text Font</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FONTS.map((font) => (
                    <button
                      key={font.id}
                      onClick={() => setSelectedFont(font.id)}
                      className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-300 text-center
                                  ${selectedFont === font.id
                          ? 'border-dream-400 bg-dream-50 dark:bg-dream-500/10 text-dream-600 dark:text-dream-300 shadow-sm'
                          : 'border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                      style={{ fontFamily: font.cssFontFamily }}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Custom prompt */}
          {photos.length > 0 && (
            <div className="card space-y-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3">
                Step 3 — Extra Magical Details (Optional)
              </p>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-white/70">Created by</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Mummy and Daddy"
                  maxLength={100}
                  value={dedicatedBy}
                  onChange={(e) => setDedicatedBy(e.target.value)}
                />
              </div>
              <textarea
                className="input resize-none h-24"
                placeholder="e.g. Make it about a friendly giant who loves marshmallows..."
                maxLength={500}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={credits < pageCount ? () => setShowCreditModal(true) : handleGenerate}
            disabled={photos.length === 0 || loading || analyzing}
            className={`w-full py-5 rounded-2xl text-lg font-black transition-all duration-300 flex items-center justify-center gap-3 shadow-xl
                        ${canGenerate ? 'btn-primary hover:scale-[1.02] active:scale-95 shadow-gold/20' : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/20 cursor-not-allowed border border-gray-200 dark:border-white/10'}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Weaving {pageCount + 2} magical pages...
              </>
            ) : credits < pageCount ? (
              <>
                <Sparkles className="w-6 h-6" />
                Need {pageCount} credits — You have {credits}
                <a
                  onClick={() => setShowCreditModal(true)}
                  className="btn-secondary"
                >
                  <Zap className="w-4 h-4" /> Buy More Credits
                </a>

              </>
            ) : (
              <>
                <BookOpen className="w-6 h-6" />
                Generate My Book ({pageCount} credit{pageCount !== 1 ? 's' : ''})
              </>
            )}
          </button>

          {/* Generate Confirmation */}
          {showGenerateConfirm && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 space-y-3">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Generating a {pageCount}-page book will cost {pageCount} credit{pageCount !== 1 ? 's' : ''}. You have {credits} credit{credits !== 1 ? 's' : ''}.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerate}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  Yes, use {pageCount} credit{pageCount !== 1 ? 's' : ''}
                </button>
                <button
                  onClick={() => setShowGenerateConfirm(false)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-2">
              <X className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Result: Book Ready */}
          {book && (
            <div className="pt-12 border-t border-gray-100 dark:border-white/5 text-center space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-dream-500/10 border border-dream-500/20">
                <BookOpen className="w-8 h-8 text-dream-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your book is ready!</h3>
              <p className="text-sm text-gray-500 dark:text-white/40">{book.title} &middot; {book.pages?.length || 0} pages</p>
              <button
                onClick={() => setShowBookPreview(true)}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold bg-dream-500 text-white hover:bg-dream-600 transition-all shadow-lg shadow-dream-500/20 hover:scale-[1.02] active:scale-95"
              >
                <Maximize2 className="w-5 h-5" /> Read Your Book
              </button>
            </div>
          )}
        </div>
      </div>

      {showBookPreview && book && (
        <BookPreview
          book={book}
          onPrint={handlePrint}
          onClose={() => setShowBookPreview(false)}
          onRefreshImage={handleRefreshImage}
          credits={credits}
        />
      )}

      {showCreditModal && <CreditModal onClose={() => setShowCreditModal(false)} />}
      {showUpsell && <UpsellModal childName={childName || 'your child'} onClose={() => setShowUpsell(false)} />}
    </div>
  );
}
