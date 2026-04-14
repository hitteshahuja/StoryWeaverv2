import React, { useEffect, useState } from 'react';
import { booksAPI, resolveUrl } from '../lib/api';
import { Sparkles, ArrowRight, BrainCircuit, BookOpen } from 'lucide-react';

/**
 * RelatedBooks Component
 * 
 * Fetches and displays books similar to the current one using RAG.
 */
export default function RelatedBooks({ currentBookId }) {
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    if (!currentBookId) return;

    const fetchRelated = async () => {
      setLoading(true);
      try {
        const data = await booksAPI.related(currentBookId);
        setRelated(data);
      } catch (err) {
        console.error('Failed to fetch related books:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
  }, [currentBookId]);

  const handleBookClick = (bookId) => {
    // Analytics Log for recommendation tuning
    console.log(`[Recommender] User selected related book: ${bookId} from seed: ${currentBookId}`);
    // Here you could trigger a modal or navigation
    alert("This is a preview of a public book! Discovery mode enabled.");
  };

  if (!loading && related.length === 0) return null;

  return (
    <div className="mt-20 pt-10 border-t border-gray-100 dark:border-white/5">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <BrainCircuit className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Discover Similar Books</h3>
            <p className="text-sm text-gray-500 dark:text-white/40">AI-powered discovery based on your library</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-dream-500/10 border border-dream-500/20 text-[10px] font-bold text-dream-600 dark:text-dream-300 uppercase tracking-wider">
          <Sparkles className="w-3 h-3" /> Powered by RAG
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          // Skeleton Loader
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 p-4 animate-pulse">
              <div className="aspect-[4/5] bg-gray-200 dark:bg-white/10 rounded-xl mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
            </div>
          ))
        ) : (
          related.map((book) => (
            <button
              key={book.id}
              onClick={() => handleBookClick(book.id)}
              className="group text-left rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 p-4 transition-all duration-300 hover:shadow-xl hover:shadow-dream-500/5 hover:border-dream-500/30 hover:-translate-y-1"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl mb-4 shadow-sm group-hover:shadow-md transition-shadow">
                {book.image_url ? (
                  <img
                    src={resolveUrl(book.image_url)}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-dream-500/10 text-dream-400">
                    <BookOpen className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                  {Math.round(book.similarity)}% Match
                </div>
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-1 group-hover:text-dream-600 transition-colors">
                {book.title}
              </h4>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-[11px] font-medium text-gray-500 dark:text-white/30 uppercase tracking-tighter">Public Collection</span>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-dream-500 transition-all group-hover:translate-x-1" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
