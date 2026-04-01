import { useEffect, useState } from 'react';
import { RedirectToSignIn, useAuth } from '@clerk/clerk-react';
import { BookOpen, Heart, Loader2, BookMarked } from 'lucide-react';
import StoryDisplay from '../components/StoryDisplay';
import BookCard from '../components/BookCard';
import BookPreview from '../components/BookPreview';
import StarField from '../components/StarField';
import { storiesAPI, booksAPI } from '../lib/api';
import jsPDF from 'jspdf';

export default function LibraryPage() {
  const { isSignedIn } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'favorites'
  const [selectedBook, setSelectedBook] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  if (!isSignedIn) return <RedirectToSignIn />;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [stories, books] = await Promise.all([
          filter === 'favorites' ? storiesAPI.favorites() : storiesAPI.list(),
          booksAPI.list(), // Books don't have favorite filter yet, but I'll filter in JS
        ]);

        const filteredBooks = filter === 'favorites' ? books.filter(b => b.is_favorite) : books;
        
        // Merge and tag
        const merged = [
          ...stories.map(s => ({ ...s, itemType: 'story' })),
          ...filteredBooks.map(b => ({ ...b, itemType: 'book' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setItems(merged);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filter]);

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

  const handleFavorite = async (id, type) => {
    if (type === 'story') {
      const updated = await storiesAPI.toggleFavorite(id);
      setItems((prev) => prev.map((item) => (item.id === id && item.itemType === 'story' ? { ...updated, itemType: 'story' } : item)));
    } else {
      // Books toggle favorite logic is similar (need to implement in API if not there)
      // For now I'll just skip or update state
    }
  };

  const handleDelete = async (id, type) => {
    if (type === 'story') {
      if (!confirm('Delete this story?')) return;
      await storiesAPI.delete(id);
      setItems((prev) => prev.filter((item) => !(item.id === id && item.itemType === 'story')));
    }
  };

  const handlePrint = async () => {
    if (!selectedBook) return;
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

    const imgInfos = await Promise.all(selectedBook.pages.map(async (p) => {
      const imgUrl = p.ai_image_url || p.image_url;
      if (!imgUrl) return null;
      const b64 = await fetchImageAsBase64(imgUrl);
      if (!b64) return null;
      const dims = await getImageDimensions(b64);
      return { b64, ...dims };
    }));

    for (let i = 0; i < selectedBook.pages.length; i++) {
      const page = selectedBook.pages[i];
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

    doc.save(`${selectedBook.title.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="relative min-h-screen">
      <StarField />
      <div className="max-w-3xl mx-auto px-4 py-12">
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
                onClick={() => setFilter(tab.id)}
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
              {filter === 'favorites' ? 'Heart a story to save it here' : 'Generate your first story or book!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {items.map((item) => (
              item.itemType === 'story' ? (
                <StoryDisplay
                  key={`story-${item.id}`}
                  story={item}
                  onToggleFavorite={(id) => handleFavorite(id, 'story')}
                  onDelete={(id) => handleDelete(id, 'story')}
                />
              ) : (
                <BookCard
                  key={`book-${item.id}`}
                  book={item}
                  onClick={() => handleBookClick(item.id)}
                />
              )
            ))}
          </div>
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
    </div>
  );
}
