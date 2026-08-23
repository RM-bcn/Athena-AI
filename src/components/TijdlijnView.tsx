import React, { useMemo, useState } from 'react';
import { ChevronLeft, MapPin, Calendar, Trash2, Images } from 'lucide-react';
import { DayPhoto, UserAccount } from '../types';
import { StoriesModal } from './Modals/StoriesModal';

const DAY_MS = 24 * 60 * 60 * 1000;

function localDateString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatDateFriendly(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function formatFullDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const formatted = d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function dayPrefixLabel(dateStr: string): string {
  if (dateStr === localDateString()) return 'Vandaag';
  if (dateStr === localDateString(-1)) return 'Gisteren';
  return '';
}

function formatDayLabel(dateStr: string): string {
  const prefix = dayPrefixLabel(dateStr);
  return prefix || formatDateFriendly(dateStr);
}

function isRecent(photo: DayPhoto): boolean {
  if (photo.createdAt) {
    const placed = Date.parse(photo.createdAt);
    return !Number.isNaN(placed) && Date.now() - placed < DAY_MS;
  }
  return photo.date === localDateString();
}

function formatRelativeTime(photo: DayPhoto): string {
  if (photo.createdAt) {
    const placed = Date.parse(photo.createdAt);
    if (!Number.isNaN(placed)) {
      const diff = Date.now() - placed;
      if (diff < 60 * 1000) return 'zojuist';
      if (diff < 60 * 60 * 1000) {
        const m = Math.floor(diff / (60 * 1000));
        return m === 1 ? '1 minuut geleden' : `${m} minuten geleden`;
      }
      if (diff < DAY_MS) {
        const h = Math.floor(diff / (60 * 60 * 1000));
        return h === 1 ? '1 uur geleden' : `${h} uur geleden`;
      }
    }
  }
  const prefix = dayPrefixLabel(photo.date);
  if (prefix === 'Vandaag' || prefix === 'Gisteren') {
    const time = photo.createdAt ? new Date(Date.parse(photo.createdAt)).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '';
    return time ? `${prefix.toLowerCase()} om ${time}` : prefix.toLowerCase();
  }
  return formatFullDate(photo.date);
}

interface TijdlijnViewProps {
  dayPhotos: DayPhoto[];
  currentUser: UserAccount | null;
  isGuestMode: boolean;
  onBack: () => void;
  onDeleteDayPhoto?: (id: string) => Promise<{ success: boolean; error?: string }>;
}

interface DayGroup {
  date: string;
  label: string;
  photos: DayPhoto[];
  hasRecent: boolean;
}

export const TijdlijnView: React.FC<TijdlijnViewProps> = ({
  dayPhotos,
  currentUser,
  isGuestMode,
  onBack,
  onDeleteDayPhoto,
}) => {
  const [storiesOpen, setStoriesOpen] = useState<{ photos: DayPhoto[]; startIndex: number } | null>(null);
  const canEdit = !!currentUser && !isGuestMode;

  const dayGroups: DayGroup[] = useMemo(() => {
    const byDate = new Map<string, DayPhoto[]>();
    for (const p of dayPhotos) {
      const date = p.date || 'Onbekend';
      const list = byDate.get(date) || [];
      list.push(p);
      byDate.set(date, list);
    }
    const sorted = Array.from(byDate.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, photos]) => ({
        date,
        label: formatDayLabel(date),
        photos,
        hasRecent: photos.some(isRecent),
      }));
    return sorted;
  }, [dayPhotos]);

  const feedPhotos = useMemo(() => {
    return [...dayPhotos].sort((a, b) => {
      const ta = a.createdAt || (a.date ? `${a.date}T00:00:00` : '');
      const tb = b.createdAt || (b.date ? `${b.date}T00:00:00` : '');
      return tb.localeCompare(ta);
    });
  }, [dayPhotos]);

  const islandCount = useMemo(
    () => new Set(dayPhotos.map((p) => p.island).filter(Boolean)).size,
    [dayPhotos]
  );

  const openDay = (group: DayGroup) => {
    setStoriesOpen({ photos: group.photos, startIndex: 0 });
  };

  const openPhoto = (photo: DayPhoto) => {
    const group = dayGroups.find((g) => g.date === (photo.date || 'Onbekend'));
    const photos = group ? group.photos : [photo];
    const startIndex = Math.max(photos.findIndex((p) => p.id === photo.id), 0);
    setStoriesOpen({ photos, startIndex });
  };

  const handleDelete = (photo: DayPhoto) => {
    if (window.confirm('Deze foto uit het reisdagboek verwijderen?')) {
      onDeleteDayPhoto?.(photo.id);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8fc]">
      {/* Mobiele terug-knop (desktop heeft de sidebar) */}
      <div className="md:hidden sticky top-[64px] z-20 bg-white/90 backdrop-blur border-b border-[#e1efff]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 text-[#404752] hover:text-[#005BAE] text-sm font-semibold transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Mijn Reis
        </button>
      </div>

      <main className="max-w-2xl mx-auto px-4 pb-24">
        {/* Pagina-header */}
        <section className="mt-6 bg-white rounded-[24px] border border-[#e1efff] shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="font-['Inter'] text-xs font-semibold uppercase tracking-wider text-[#005BAE]">
                Reisdagboek
              </span>
              <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-extrabold text-[#0b1d2d] mt-1">
                Tijdlijn
              </h1>
              <p className="font-['Inter'] text-sm text-[#717783] mt-1">
                Alle momenten van Dennis &amp; Joyce tijdens de Cycladen Odyssey.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-[#005BAE]/10 text-[#005BAE] font-['Inter'] text-xs font-bold">
                {dayPhotos.length} {dayPhotos.length === 1 ? 'moment' : 'momenten'}
              </span>
              {islandCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-[#005BAE]/10 text-[#005BAE] font-['Inter'] text-xs font-bold">
                  {islandCount} {islandCount === 1 ? 'eiland' : 'eilanden'}
                </span>
              )}
            </div>
          </div>
        </section>

        {dayPhotos.length === 0 ? (
          <section className="mt-6 bg-white rounded-[24px] border border-[#e1efff] shadow-sm p-10 flex flex-col items-center justify-center gap-3 text-center">
            <Images className="w-10 h-10 text-[#c0c7d3]" />
            <p className="font-['Inter'] text-sm font-semibold text-[#404752]">
              {canEdit
                ? 'Nog geen foto\'s — voeg je eerste moment toe via Mijn Reis!'
                : 'Nog geen foto\'s — check straks onze dagelijkse hoogtepunten!'}
            </p>
          </section>
        ) : (
          <>
            {/* Stories-tray: cirkels per dag */}
            <section className="mt-6 bg-white rounded-[24px] border border-[#e1efff] shadow-sm p-5">
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#0b1d2d]">
                  Verhalen
                </h2>
                <span className="font-['Inter'] text-[11px] text-[#717783]">
                  tik op een dag voor fullscreen
                </span>
              </div>
              <div className="flex gap-5 overflow-x-auto no-scrollbar px-1 pb-1">
                {dayGroups.map((group) => (
                  <button
                    key={group.date}
                    onClick={() => openDay(group)}
                    className="group flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
                    title={`Bekijk ${group.label.toLowerCase()} fullscreen`}
                  >
                    <span
                      className={`p-[3px] rounded-full transition-transform group-hover:scale-105 ${
                        group.hasRecent
                          ? 'bg-gradient-to-tr from-amber-500 to-orange-500'
                          : 'bg-[#005BAE]'
                      }`}
                    >
                      <span className="block p-[2.5px] bg-white rounded-full">
                        <img
                          src={group.photos[0]?.imageUrl}
                          alt={group.label}
                          loading="lazy"
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      </span>
                    </span>
                    <span
                      className={`font-['Inter'] text-[11px] flex items-center gap-1 ${
                        group.hasRecent ? 'font-bold text-[#0b1d2d]' : 'font-semibold text-[#404752]'
                      }`}
                    >
                      {group.label}
                      {group.hasRecent && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Feed: verticale kaarten, nieuwste eerst */}
            <div className="mt-6 space-y-6">
              {feedPhotos.map((photo) => (
                <article
                  key={photo.id}
                  className="bg-white rounded-[24px] border border-[#e1efff] shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4">
                    <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#005BAE] to-[#3b82c4] text-white flex items-center justify-center font-['Plus_Jakarta_Sans'] font-bold text-sm flex-shrink-0">
                      {(photo.author || 'A').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="font-['Inter'] text-sm font-bold text-[#0b1d2d] leading-tight">
                        {photo.author || 'Athena'}{' '}
                        <span className="font-medium text-[#717783]">&middot; {formatRelativeTime(photo)}</span>
                      </p>
                      {photo.island && (
                        <p className="font-['Inter'] text-[11px] text-[#717783] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#005BAE]" />
                          {photo.island}
                        </p>
                      )}
                    </div>
                    {isRecent(photo) && (
                      <span className="ml-auto px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-['Inter'] text-[10px] font-extrabold uppercase tracking-wide">
                        Nieuw
                      </span>
                    )}
                    {canEdit && onDeleteDayPhoto && (
                      <button
                        onClick={() => handleDelete(photo)}
                        className={`${isRecent(photo) ? '' : 'ml-auto'} p-2 rounded-full text-[#717783] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer`}
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button onClick={() => openPhoto(photo)} className="block w-full cursor-zoom-in">
                    <img
                      src={photo.imageUrl}
                      alt={photo.caption || `Reisdagboek ${photo.date}`}
                      loading="lazy"
                      className="w-full aspect-[4/5] object-cover"
                    />
                  </button>
                  <div className="p-4">
                    {photo.caption && (
                      <p className="font-['Inter'] text-sm text-[#0b1d2d] leading-snug">
                        <span className="font-bold">{photo.author || 'Athena'}</span> {photo.caption}
                      </p>
                    )}
                    {photo.date && (
                      <p className="font-['Inter'] text-[11px] text-[#717783] mt-2 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {dayPrefixLabel(photo.date)
                          ? `${dayPrefixLabel(photo.date)}, ${formatFullDate(photo.date)}`
                          : formatFullDate(photo.date)}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <p className="text-center font-['Inter'] text-[11px] text-[#717783] mt-8">
              Gedeeld via het Reisdagboek — foto's van de laatste 24 uur staan ook onder "Vandaag" in Mijn Reis.
            </p>
          </>
        )}
      </main>

      <StoriesModal
        isOpen={storiesOpen !== null}
        photos={storiesOpen?.photos || []}
        startIndex={storiesOpen?.startIndex || 0}
        onClose={() => setStoriesOpen(null)}
      />
    </div>
  );
};
