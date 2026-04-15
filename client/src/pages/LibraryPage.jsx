import { useEffect, useState } from 'react';
import { RedirectToSignIn, useAuth } from '@clerk/clerk-react';
import { BookOpen, Heart, Loader2, BookMarked, ChevronLeft, ChevronRight } from 'lucide-react';
import RelatedBooks from '../components/RelatedBooks';
import BookCard from '../components/BookCard';
import BookPreview from '../components/BookPreview';
import StarField from '../components/StarField';
import Footer from '../components/Footer';
import { booksAPI } from '../lib/api';
import { handlePrint as generatePDF } from '../utils/printHelpers';

const PAGE_SIZE = 9;

export default function LibraryPage() {
  const { isSignedIn } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'favorites'
  const [selectedBook, setSelectedBook] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!isSignedIn) return;
    const load = async () => {
      setLoading(true);
      try {
        const booksRes = filter === 'favorites' 
          ? await booksAPI.favorites(page, PAGE_SIZE) 
          : await booksAPI.list(page, PAGE_SIZE);

        const books = Array.isArray(booksRes) ? booksRes : (booksRes.books || []);
        
        setItems(books.map(b => ({ ...b, itemType: 'book' })));
        
        const totalBooks = Array.isArray(booksRes) ? books.length : (booksRes.total || 0);
        setTotalCount(totalBooks);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filter, isSignedIn, page]);

  if (!isSignedIn) return <RedirectToSignIn />;

  const handleBookClick = async (id) => {
    setPreviewLoading(true);
    try {
      const book = await booksAPI.get(id);
      setSelectedBook(book);
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFavorite = async (id) => {
    try {
      const updated = await booksAPI.toggleFavorite(id);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...updated, itemType: 'book' } : item)));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handlePrint = () => generatePDF(selectedBook);

  return (
    <div className="relative min-h-screen">
      <StarField />
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-dream-50 dark:bg-dream-500/10 border border-dream-200 dark:border-dream-500/20">
                <BookOpen className="w-5 h-5 text-dream-600 dark:text-dream-300" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Library</h1>
            </div>
            <p className="text-gray-500 dark:text-white/50">{items.length} item{items.length === 1 ? '' : 's'}</p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1 border border-gray-200 dark:border-white/10">
            {[
              { id: 'all', label: 'All Items', icon: <BookMarked className="w-4 h-4" /> },
              { id: 'favorites', label: 'Favorites', icon: <Heart className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setFilter(tab.id); setPage(1); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            ${filter === tab.id ? 'bg-dream-600 text-white shadow-sm' : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-dream-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex p-4 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 mb-4">
              <BookOpen className="w-10 h-10 text-gray-300 dark:text-white/20" />
            </div>
            <p className="text-gray-500 dark:text-white/50 text-lg">
              {filter === 'favorites' ? 'No favorites yet' : 'Your magical library is empty'}
            </p>
            <p className="text-gray-400 dark:text-white/30 text-sm mt-1">
              {filter === 'favorites' ? 'Heart a book to save it here' : 'Generate your first book!'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {items.map((item) => (
                <BookCard
                  key={`book-${item.id}`}
                  book={item}
                  onClick={() => handleBookClick(item.id)}
                  onToggleFavorite={() => handleFavorite(item.id)}
                />
              ))}
            </div>

            {/* AI Discovery Engine - Discovery of similar books based on library content */}
            {items.length > 0 && (
              <RelatedBooks 
                currentBookId={items[0]?.id} 
              />
            )}

            {totalCount > PAGE_SIZE && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-500 dark:text-white/50">
                  Page {page} of {Math.ceil(totalCount / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
                  className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Book Preview Modal */}
        {selectedBook && (
          <BookPreview
            book={selectedBook}
            onPrint={handlePrint}
            onClose={() => setSelectedBook(null)}
          />
        )}

        {previewLoading && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <Loader2 className="w-10 h-10 text-dream-400 animate-spin" />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
