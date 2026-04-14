import React, { useState, useEffect } from 'react';
import he from 'he';
import { BookOpen, Calendar, ArrowRight, Star, Heart } from 'lucide-react';
import { resolveImageUrl } from '../lib/api';

export default function BookCard({ book, onClick, onToggleFavorite }) {
  const firstImage = book.pages?.find(p => p.ai_image_url)?.ai_image_url;
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (firstImage) {
      resolveImageUrl(firstImage).then(setImageSrc);
    }
  }, [firstImage]);

  const getFilterStyle = (style) => {
    switch (style) {
      case 'Watercolor':
        return { filter: 'saturate(1.1) contrast(0.9) url(#watercolor-card-filter)' };
      case 'Classic Crayon':
        return { filter: 'url(#crayon-card-filter)' };
      default:
        return {};
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite();
  };

  return (
    <div
      onClick={onClick}
      className="card group cursor-pointer hover:border-dream-400 transition-all duration-300 animate-slide-up"
    >
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <filter id="watercolor-card-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="crayon-card-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="5" result="noise" />
            <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
          </filter>
        </defs>
      </svg>

      <div className="flex gap-4">
        {/* Thumbnail Stack Effect */}
        <div className="relative w-24 h-32 flex-shrink-0">
          <div className="absolute inset-0 bg-gray-200 dark:bg-white/5 rounded-lg rotate-3 translate-x-1" />
          <div className="absolute inset-0 bg-white dark:bg-night-800 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden z-10">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={book.title}
                className="w-full h-full object-cover transition-all duration-500"
                style={getFilterStyle(book.style)}
              />
            ) : firstImage ? (
              <div className="w-full h-full flex items-center justify-center bg-dream-50 dark:bg-dream-500/10">
                <div className="w-6 h-6 border-2 border-dream-300 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-dream-50 dark:bg-dream-500/10">
                <BookOpen className="w-8 h-8 text-dream-300" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 py-1 flex flex-col justify-between">
          <div>
<div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-dream-500/10 text-dream-600 dark:text-dream-400 text-[10px] font-bold uppercase tracking-wider border border-dream-500/20">
                {book.page_count}-Page Book
              </span>
              {onToggleFavorite && (
                <button
                  onClick={handleFavoriteClick}
                  className={`p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${book.is_favorite ? 'text-red-500' : 'text-gray-300 dark:text-gray-600 hover:text-red-500'}`}
                >
                  <Heart className={`w-4 h-4 ${book.is_favorite ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-dream-600 dark:group-hover:text-dream-400 transition-colors">
              {book.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-white/40 mt-1 ">
              Starring {he.decode(book.protagonist_name || 'a little explorer')}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-white/20">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(book.created_at).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1 text-dream-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
              Read <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
