import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, Calendar } from 'lucide-react';
import { DayPhoto } from '../../types';

interface StoriesModalProps {
  isOpen: boolean;
  photos: DayPhoto[];
  onClose: () => void;
}

function formatStoryDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const StoriesModal: React.FC<StoriesModalProps> = ({ isOpen, photos, onClose }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => (i < photos.length - 1 ? i + 1 : i));
  }, [photos.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, goPrev, goNext, onClose]);

  if (!isOpen) return null;

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        title="Sluiten (Esc)"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Image */}
      <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8">
        <img
          src={photo.imageUrl}
          alt={photo.caption || `Reisdagboek ${photo.date}`}
          className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
        />

        {/* Header overlay */}
        <div className="absolute top-5 left-5 flex items-center gap-2 flex-wrap">
          {photo.island && (
            <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-bold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-300" />
              {photo.island}
            </span>
          )}
          {photo.date && (
            <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              {formatStoryDate(photo.date)}
            </span>
          )}
        </div>

        {/* Caption overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[min(92%,640px)] text-center">
          {photo.caption && (
            <p className="text-white/95 font-['Inter'] text-base sm:text-lg font-semibold drop-shadow px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-sm">
              {photo.caption}
            </p>
          )}
          {photo.author && (
            <p className="text-white/70 font-['Inter'] text-xs mt-2">
              door {photo.author}
            </p>
          )}
        </div>

        {/* Teller */}
        <div className="absolute bottom-5 right-5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-bold">
          {index + 1}/{photos.length}
        </div>

        {/* Swipe/pijlen */}
        {photos.length > 1 && (
          <>
            <button
              onClick={goPrev}
              disabled={index === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Vorige (←)"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <button
              onClick={goNext}
              disabled={index === photos.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Volgende (→)"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </>
        )}

        {/* Voortgangsbalk */}
        {photos.length > 1 && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((p, i) => (
              <div
                key={p.id}
                className={`h-1 rounded-full transition-all ${
                  i === index ? 'w-8 bg-white' : 'w-3 bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
