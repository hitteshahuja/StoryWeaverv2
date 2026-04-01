import React from 'react';
import { resolveUrl } from '../lib/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical, MapPin, Star } from 'lucide-react';

export function SortableItem({ id, item, onRemove, filter, isCover, onSetCover }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group bg-white dark:bg-white/5 rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isCover ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/30' : 'border-gray-200 dark:border-white/10'}`}
    >
      <div className="aspect-square w-full relative">
        <img
          src={resolveUrl(item.url)}
          alt="Storyboard"
          className="w-full h-full object-cover transition-all duration-500"
        />
        <div 
          {...attributes} 
          {...listeners}
          className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/50 text-white cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <button
          onClick={() => onRemove(id)}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
        {onSetCover && (
          <button
            onClick={() => onSetCover(isCover ? null : item.url)}
            className={`absolute bottom-2 left-2 p-1.5 rounded-lg text-white transition-opacity opacity-0 group-hover:opacity-100 ${isCover ? 'bg-amber-500 hover:bg-amber-600' : 'bg-black/50 hover:bg-amber-500/80'}`}
            title={isCover ? 'Remove as cover' : 'Set as book cover'}
          >
            <Star className={`w-4 h-4 ${isCover ? 'fill-white' : ''}`} />
          </button>
        )}
      </div>
      
      {item.location && (
        <div className="p-2 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-white/40 truncate">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {item.location}
        </div>
      )}
      
      <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-night-950 ${isCover ? 'bg-amber-500' : 'bg-dream-500'}`}>
        {isCover ? <Star className="w-3 h-3 fill-white" /> : item.index + 1}
      </div>
    </div>
  );
}

export default function Storyboard({ items, setItems, filter, coverImage, onSetCover }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5,
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  const removeItem = (id) => {
    setItems((prev) => {
      const removed = prev.find(i => i.id === id);
      if (removed && coverImage === removed.url && onSetCover) {
        onSetCover(null);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Storyboard</h3>
        <p className="text-xs text-gray-500 dark:text-white/40">{items.length} / 12 images · {coverImage ? 'Cover selected' : 'Click star to set cover'}</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((item, index) => (
              <SortableItem 
                key={item.id} 
                id={item.id} 
                item={{ ...item, index }} 
                onRemove={removeItem}
                filter={filter}
                isCover={coverImage === item.url}
                onSetCover={onSetCover}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {items.length === 0 && (
        <div className="py-12 border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl text-center">
          <p className="text-gray-500 dark:text-white/30 text-sm">Upload photos to start your story</p>
        </div>
      )}
    </div>
  );
}
