import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
const SHOWCASE_STORIES = [
  {
    id: 1,
    title: "Maya's & Rohan's Enchanged forest adventures",
    description: "A curious puppy discovers a hidden world of friendly woodland creatures",
    image: '/showcase/slides_image_1.png',
    theme: 'Space Adventure',
    style: 'Watercolor',
  },
  {
    id: 2,
    title: "Super Leo at the Pond",
    description: "Super Leo's super adventures at the wetlands",
    image: '/showcase/super_leo.png', // Reusing available image as placeholder
    theme: 'Nature & Animals',
    style: 'Pixar-style',
  },
  {
    id: 3,
    title: "Sarah's pink drive",
    description: "A mermaid princess explores coral castles and makes new friends",
    image: '/showcase/slides_image_3.png', // Reusing available image as placeholder
    theme: 'Garden Fantasy',
    style: 'Classic Crayon',
  },
  {
    id: 4,
    title: "Jonathan's great quest",
    description: "A curious boy explores a magical world in his backyard",
    image: '/showcase/slides_image_5.jpeg', // Reusing available image as placeholder
    theme: 'Fantasy & Magic',
    style: 'Soft Pastel',
  },
];

export default function ShowcaseSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SHOWCASE_STORIES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % SHOWCASE_STORIES.length);
  };

  const goToPrev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + SHOWCASE_STORIES.length) % SHOWCASE_STORIES.length);
  };

  const goToSlide = (index) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  const current = SHOWCASE_STORIES[currentIndex];

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="section-title mb-2">See the magic in action</h2>
        <p className="text-gray-500 dark:text-white/50">
          Real stories created by parents just like you
        </p>
      </div>

      {/* Main showcase card */}
      <div className="relative overflow-hidden rounded-3xl border border-dream-500/20 bg-white dark:bg-night-900 shadow-2xl">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image side */}
          <div className="relative aspect-[4/5] md:aspect-auto bg-gradient-to-br from-dream-50 to-purple-50 dark:from-dream-900/20 dark:to-purple-900/20">
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <img 
                src={current.image} 
                alt={current.title}
                className="w-full h-full object-cover rounded-2xl shadow-xl"
              />
            </div>

            {/* Navigation arrows */}
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-night-800/90 shadow-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white hover:scale-110 transition-transform z-10"
              aria-label="Previous story"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-night-800/90 shadow-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white hover:scale-110 transition-transform z-10"
              aria-label="Next story"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Content side */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <span className="badge-dream text-xs">{current.theme}</span>
                <span className="badge-gold text-xs">{current.style}</span>
              </div>

              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  {current.title}
                </h3>
                <p className="text-gray-600 dark:text-white/70 leading-relaxed">
                  {current.description}
                </p>
              </div>

              {/* Dot indicators */}
              <div className="flex items-center gap-2 pt-4">
                {SHOWCASE_STORIES.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentIndex
                        ? 'w-8 bg-dream-500'
                        : 'w-2 bg-gray-300 dark:bg-white/20 hover:bg-dream-300'
                    }`}
                    aria-label={`Go to story ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnail navigation (optional - shows all stories) */}
      <div className="mt-6 grid grid-cols-4 gap-3">
        {SHOWCASE_STORIES.map((story, index) => (
          <button
            key={story.id}
            onClick={() => goToSlide(index)}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
              index === currentIndex
                ? 'border-dream-500 shadow-lg scale-105'
                : 'border-gray-200 dark:border-white/10 opacity-60 hover:opacity-100'
            }`}
          >

            {/* Replace with actual thumbnails when available */}
             <img src={story.image} alt={story.title} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
