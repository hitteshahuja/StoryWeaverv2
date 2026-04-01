import { useState } from 'react';
import { Heart, Trash2, BookOpen, Star, Volume2, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { resolveUrl } from '../lib/api';

export default function StoryDisplay({ story, onToggleFavorite, onDelete, showActions = true }) {
  const [deleting, setDeleting] = useState(false);
  const [favoriting, setFavoriting] = useState(false);

  const safeContent = DOMPurify.sanitize(story.content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

  const handleSpeak = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(story.content);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1;
    // Prefer soft female voice for bedtime
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('karen'));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  };

  const handleFavorite = async () => {
    if (!onToggleFavorite || favoriting) return;
    setFavoriting(true);
    try { await onToggleFavorite(story.id); }
    finally { setFavoriting(false); }
  };

  const handleDelete = async () => {
    if (!onDelete || deleting) return;
    if (!confirm('Delete this story?')) return;
    setDeleting(true);
    try { await onDelete(story.id); }
    finally { setDeleting(false); }
  };

  return (
    <div className="card animate-slide-up">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-dream-50 dark:bg-dream-500/10 border border-dream-200 dark:border-dream-500/20">
            <BookOpen className="w-5 h-5 text-dream-600 dark:text-dream-300" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{story.title}</h3>
            {story.created_at && (
              <p className="text-xs text-gray-500 dark:text-white/40 mt-0.5">
                {new Date(story.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {story.is_favorite && (
          <Star className="w-5 h-5 text-gold-400 fill-gold-400 flex-shrink-0" />
        )}
      </div>

      {story.image_url && (
        <div className="mb-4 rounded-xl overflow-hidden">
          <img
            src={resolveUrl(story.image_url)}
            alt="Story inspiration"
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      <div className="space-y-3 mb-6">
        {safeContent.split('\n').filter(Boolean).map((p, i) => (
          <p key={i} className="text-gray-700 dark:text-white/80 leading-relaxed text-[15px]">{p}</p>
        ))}
      </div>

      {showActions && (
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-white/10">
          <button
            onClick={handleSpeak}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm 
                       text-dream-600 dark:text-dream-300 hover:bg-dream-50 dark:hover:bg-dream-500/10 transition-colors"
          >
            <Volume2 className="w-4 h-4" /> Read Aloud
          </button>

          <button
            onClick={handleFavorite}
            disabled={favoriting}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors
                        ${story.is_favorite
                ? 'text-gold-600 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-500/10'
                : 'text-gray-500 dark:text-white/50 hover:text-gold-600 dark:hover:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-500/10'
              }`}
          >
            {favoriting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${story.is_favorite ? 'fill-gold-600 dark:fill-gold-400' : ''}`} />}
            {story.is_favorite ? 'Saved' : 'Save'}
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm 
                       text-gray-400 dark:text-white/30 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors ml-auto"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
