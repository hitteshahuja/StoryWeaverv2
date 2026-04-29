import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Download, X, Loader2, RefreshCw } from 'lucide-react';
import { booksAPI, resolveImageUrl } from '../lib/api';
import { getFontById } from '../config/fonts';
import { TEXT_SIZES, DEFAULT_TEXT_SIZE } from '../config/fonts';

const ENABLE_TTS = false; // Feature flag - set to true to enable text-to-speech

export default function BookPreview({ book, onPrint, onClose, onRefreshImage, credits, textSize }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [pendingRefreshPage, setPendingRefreshPage] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [currentImageSrc, setCurrentImageSrc] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const pages = book.pages || [];
  const totalSpreads = pages.length;
  const current = pages[currentPage];
  const allImagesReady = pages.length > 0 && pages.every(p => p.ai_image_url || !p.image_url);

  const fontConfig = getFontById(book.font);
  const textSizeClasses = TEXT_SIZES.find(s => s.id === (textSize || DEFAULT_TEXT_SIZE))?.classes ?? 'text-xl md:text-2xl';

  useEffect(() => {
    const imageUrl = current?.ai_image_url || current?.image_url;
    if (imageUrl) {
      setImageLoading(true);
      resolveImageUrl(imageUrl).then((src) => {
        setCurrentImageSrc(src);
        setImageLoading(false);
      });
    } else {
      setCurrentImageSrc(null);
      setImageLoading(false);
    }
  }, [current?.ai_image_url, current?.image_url]);

  // TTS state
  const [ttsLoading, setTtsLoading] = useState(false);
  const [playingPage, setPlayingPage] = useState(null);
  const [refreshingPage, setRefreshingPage] = useState(null);
  const audioRef = useRef(null);
  const audioCache = useRef({});

  const nextSpread = useCallback(() => {
    if (currentPage < totalSpreads - 1) setCurrentPage(prev => prev + 1);
  }, [currentPage, totalSpreads]);

  const prevSpread = useCallback(() => {
    if (currentPage > 0) setCurrentPage(prev => prev - 1);
  }, [currentPage]);

  // Stop any playing audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingPage(null);
  }, []);

  // Play TTS for current page
  const handlePlayTTS = useCallback(async () => {
    if (!current?.content || current?.type === 'title') return;

    // If already playing this page, stop
    if (playingPage === currentPage) {
      stopAudio();
      return;
    }

    stopAudio();
    setTtsLoading(true);

    try {
      // Check client-side cache first
      if (audioCache.current[currentPage]) {
        playAudio(audioCache.current[currentPage], currentPage);
        return;
      }

      const result = await booksAPI.tts({
        text: current.content,
        bookId: book.id,
        pageNumber: current.page_number,
      });

      audioCache.current[currentPage] = result.audioUrl;
      playAudio(result.audioUrl, currentPage);
    } catch (err) {
      console.error('TTS failed:', err);
    } finally {
      setTtsLoading(false);
    }
  }, [current, currentPage, playingPage, book?.id, stopAudio]);

  const playAudio = (url, pageNum) => {
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingPage(pageNum);
    audio.play();
    audio.onended = () => {
      setPlayingPage(null);
      audioRef.current = null;
    };
  };

  // Stop audio when page changes
  useEffect(() => {
    if (playingPage !== null && playingPage !== currentPage) {
      stopAudio();
    }
  }, [currentPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAudio();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') nextSpread();
      if (e.key === 'ArrowLeft') prevSpread();
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextSpread, prevSpread, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const getFilterStyle = () => {
    return { filter: book.style_filter || '' };
  };

  const getBorderStyle = (style) => {
    switch (style) {
      case 'Classic':
        return {
          left: 'p-[10px] bg-gradient-to-br from-gray-200/60 to-gray-300/60 dark:from-white/10 dark:to-white/5',
          right: 'p-[10px] bg-gradient-to-br from-gray-200/60 to-gray-300/60 dark:from-white/10 dark:to-white/5',
        };
      case 'Floral':
        return {
          left: 'p-[14px] bg-gradient-to-br from-pink-100/50 to-purple-100/50 dark:from-dream-500/15 dark:to-purple-500/15',
          right: 'p-[14px] bg-gradient-to-br from-pink-100/50 to-purple-100/50 dark:from-dream-500/15 dark:to-purple-500/15',
        };
      case 'Stars':
        return {
          left: 'p-[12px] bg-gradient-to-br from-purple-200/40 to-indigo-200/40 dark:from-purple-500/20 dark:to-indigo-500/20',
          right: 'p-[12px] bg-gradient-to-br from-purple-200/40 to-indigo-200/40 dark:from-purple-500/20 dark:to-indigo-500/20',
        };
      case 'Royal':
        return {
          left: 'p-[12px] bg-gradient-to-br from-amber-100/50 to-yellow-100/50 dark:from-amber-500/15 dark:to-yellow-500/15',
          right: 'p-[12px] bg-gradient-to-br from-amber-100/50 to-yellow-100/50 dark:from-amber-500/15 dark:to-yellow-500/15',
        };
      default:
        return { left: '', right: '' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-night-950/95 backdrop-blur-md animate-in fade-in duration-300">
      {/* SVG Filters */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <filter id="watercolor-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="crayon-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" />
            <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
          </filter>
        </defs>
      </svg>

      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-lg font-bold text-white truncate">
            {book.title}
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-dream-500/20 text-dream-300 text-[10px] font-bold uppercase tracking-wider border border-dream-500/30 flex-shrink-0">
            {book.style}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onPrint}
            disabled={!allImagesReady}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white/70 border border-white/10 hover:bg-white/15 hover:text-white transition-colors text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/10"
            title={allImagesReady ? 'Download PDF' : 'Waiting for AI images to finish...'}
          >
            <Download className="w-4 h-4" /> PDF{!allImagesReady && ' (generating...)'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 text-white/70 border border-white/10 hover:bg-red-500/20 hover:text-red-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Book Area */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-4 min-h-0">
        <div className="relative w-full max-w-6xl h-full max-h-[calc(100vh-160px)]">
          <div className="w-full h-full bg-white dark:bg-night-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex">

            {/* Left Page (Image) */}
            <div className={`w-1/2 h-full relative overflow-hidden ${getBorderStyle(book.border_style).left}`}>
              <div className="w-full h-full relative bg-gray-50 dark:bg-night-950 overflow-hidden">
                <div className="paper-texture opacity-20" />

                <div className="light-leak" style={{ '--x': '10%', '--y': '10%' }} />
                <div className="sparkle" style={{ '--delay': '0.5s', top: '20%', left: '30%' }} />
                <div className="sparkle" style={{ '--delay': '1.2s', top: '60%', left: '70%' }} />
                <div className="sparkle" style={{ '--delay': '2.1s', top: '40%', left: '20%' }} />

                {book.border_style === 'Floral' && <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/floral-paper.png')]" />}
                {book.border_style === 'Stars' && <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />}

                {currentImageSrc ? (
                  <div className="w-full h-full relative overflow-hidden">
                    <img
                      src={currentImageSrc}
                      alt={`Page ${current.page_number}`}
                      className={`w-full h-full ${current.type === 'title' ? 'object-contain' : 'object-cover'} animate-fade-in transition-all duration-700 relative z-0`}
                      style={getFilterStyle()}
                      key={`img-${currentPage}`}
                    />

                    {imageLoading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-4 border-dream-400 border-t-transparent rounded-full animate-spin" />
                          <p className="text-white text-sm font-bold uppercase tracking-widest animate-pulse">Loading image...</p>
                        </div>
                      </div>
                    )}

                    {!current.ai_image_url && current.image_url && current.type !== 'title' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-4 border-dream-400 border-t-transparent rounded-full animate-spin" />
                          <p className="text-white text-sm font-bold uppercase tracking-widest animate-pulse">AI is painting this page...</p>
                        </div>
                      </div>
                    )}

                    {current.ai_image_url && current.type !== 'title' && current.type !== 'conclusion' && (
                      <button
                        onClick={() => {
                          if (credits >= 2) {
                            setPendingRefreshPage(current.page_number);
                            setCustomPrompt('');
                            setShowRefreshConfirm(true);
                          } else if (onRefreshImage) {
                            onRefreshImage(current.page_number);
                          }
                        }}
                        disabled={refreshingPage === current.page_number}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-white/80 hover:bg-dream-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed z-20 shadow-lg border border-white/10"
                        title={credits >= 2 ? 'Regenerate image (2 credits)' : 'Need 2 credits to refresh'}
                      >
                        {refreshingPage === current.page_number ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {(book.style === 'Watercolor' || book.style === 'Oil Painting') && <div className="canvas-texture" />}
                  </div>
                ) : current?.type === 'conclusion' ? (
                  <div className="w-full h-full flex items-center justify-center p-8 text-center bg-gradient-to-br from-dream-50 to-purple-50 dark:from-dream-900/20 dark:to-purple-900/20">
                    <div className="space-y-4">
                      <p className="text-4xl md:text-5xl text-dream-400 dark:text-dream-300 font-serif italic">The End</p>
                      <div className="w-12 h-1 bg-dream-500 mx-auto rounded-full" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dream-50 to-purple-50 dark:from-dream-900/20 dark:to-purple-900/20">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto rounded-full bg-dream-100 dark:bg-dream-500/20 flex items-center justify-center mb-4">
                        <Loader2 className="w-8 h-8 text-dream-400 animate-spin" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-white/50 font-medium">Generating illustration...</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 text-[10px] font-bold text-black/20 dark:text-white/20 uppercase tracking-widest z-10">
                  AI DreamWeaver Books
                </div>
              </div>
            </div>

            {/* Right Page (Text) */}
            <div className={`w-1/2 h-full relative overflow-hidden ${getBorderStyle(book.border_style).right}`}>
              <div
                className="w-full h-full p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white dark:bg-night-900 relative overflow-hidden"
                style={{ fontFamily: fontConfig.cssFontFamily }}
              >
                <div className="paper-texture opacity-10" />
                <div className="light-leak" style={{ '--x': '80%', '--y': '80%' }} />

                {book.border_style === 'Floral' && <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/floral-paper.png')]" />}
                {book.border_style === 'Stars' && <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />}

                <div className="max-w-lg mx-auto space-y-6 animate-fade-in relative z-10" key={`text-${currentPage}`}>
                  {current?.type === 'title' ? (
                    <div className="text-center space-y-8">
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight">
                        {current.content}
                      </h1>
                      <div className="w-16 h-1 bg-dream-500 mx-auto rounded-full" />
                      {current.dedication && (
                        <p className="text-sm text-gray-500 dark:text-white/40 font-medium italic">
                          {current.dedication}
                        </p>
                      )}
                    </div>
                  ) : current?.type === 'conclusion' ? (
                    <div className="text-center space-y-8">
                      <span className="badge-dream">Page {current.page_number}</span>
                      <p className="text-2xl md:text-3xl text-gray-700 dark:text-white/90 leading-relaxed font-serif italic">
                        "{current.content}"
                      </p>
                    </div>
                  ) : (
                    <>
                      <span className="badge-dream">Page {current.page_number}</span>
                      <p className={`${textSizeClasses} text-gray-700 dark:text-white/90 leading-relaxed font-serif italic text-center`}>
                        "{current.content}"
                      </p>
                    </>
                  )}
                </div>

                {/* TTS Button - for story and conclusion pages */}
                {ENABLE_TTS && current?.type !== 'title' && current?.content && (
                  <button
                    onClick={handlePlayTTS}
                    className="absolute bottom-4 right-4 p-2.5 rounded-full bg-dream-500/10 border border-dream-500/20 text-dream-500 dark:text-dream-300 hover:bg-dream-500/20 transition-all hover:scale-110 active:scale-95 z-10"
                    title={playingPage === currentPage ? 'Stop reading' : 'Read aloud'}
                  >
                    {ttsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : playingPage === currentPage ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <button
            onClick={prevSpread}
            disabled={currentPage === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 sm:-translate-x-7 p-3 rounded-full bg-white dark:bg-night-800 shadow-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white disabled:opacity-0 transition-all hover:scale-110 active:scale-95 z-20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSpread}
            disabled={currentPage === totalSpreads - 1}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 sm:translate-x-7 p-3 rounded-full bg-white dark:bg-night-800 shadow-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white disabled:opacity-0 transition-all hover:scale-110 active:scale-95 z-20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Bottom Bar — Page Dots */}
      <div className="flex items-center justify-center gap-4 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer hover:opacity-80 ${i === currentPage ? 'w-8 bg-dream-500' : 'w-2 bg-white/20'}`}
            />
          ))}
        </div>
      </div>

      {/* Refresh Confirmation Modal */}
      {showRefreshConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-night-800 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl border border-gray-200 dark:border-white/10">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-dream-100 dark:bg-dream-500/20 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-dream-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Refresh this image?</h3>
              <p className="text-sm text-gray-500 dark:text-white/60 mb-4">
                Regenerate this illustration for <span className="font-semibold text-dream-500">2 credits</span>.
                Your current image will be replaced.
              </p>
              <div className="mb-4">
                <label className="block text-left text-xs font-medium text-gray-500 dark:text-white/50 mb-1">
                  How would you like to change the image? (optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Make the background brighter, add more flowers, change the colors to warmer tones..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-night-900 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-dream-500 resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRefreshConfirm(false);
                    setPendingRefreshPage(null);
                    setCustomPrompt('');
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowRefreshConfirm(false);
                    if (pendingRefreshPage && onRefreshImage) {
                      setRefreshingPage(pendingRefreshPage);
                      try {
                        await onRefreshImage(pendingRefreshPage, customPrompt);
                      } finally {
                        setRefreshingPage(null);
                        setPendingRefreshPage(null);
                        setCustomPrompt('');
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-dream-500 text-white hover:bg-dream-600 transition-colors font-medium"
                >
                  Refresh (2 credits)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
