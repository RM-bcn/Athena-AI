import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ImagePlus,
  Loader2,
  Sparkles,
  Check,
  Calendar,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { IslandStay } from '../../types';

interface ReisdagboekUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  stays: IslandStay[];
  onSave: (input: {
    imageBase64: string;
    date: string;
    island: string;
    caption: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onGenerateCaption: (photoContext: {
    island: string;
    date: string;
    text?: string;
  }) => Promise<{ success: boolean; caption?: string; error?: string }>;
}

function todayDateString(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// Client-side compressie voor reisfoto's: breed formaat (max 1200px) i.p.v.
// vierkant, zodat de foto's mooi als tijdlijn/story tonen.
function compressImage(file: File, maxDim = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas niet beschikbaar'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Afbeelding kon niet worden geladen'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Bestand kon niet worden gelezen'));
    reader.readAsDataURL(file);
  });
}

export const ReisdagboekUploadModal: React.FC<ReisdagboekUploadModalProps> = ({
  isOpen,
  onClose,
  stays,
  onSave,
  onGenerateCaption,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [date, setDate] = useState<string>(todayDateString);
  const [island, setIsland] = useState<string>(stays[0]?.island || '');
  const [caption, setCaption] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPreview(null);
      setDate(todayDateString());
      setIsland(stays[0]?.island || '');
      setCaption('');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Selecteer een geldige afbeelding (JPG, PNG of WebP).');
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setPreview(compressed);
    } catch (err: any) {
      setError(err?.message || 'Foto kon niet worden verwerkt. Probeer een andere afbeelding.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleGenerateCaption = async () => {
    if (!island && !caption.trim()) {
      setError('Kies eerst een eiland (of vul een tekst in) zodat Athena een bijschrift kan maken.');
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const result = await onGenerateCaption({ island, date, text: caption.trim() });
      if (result.success && result.caption) {
        setCaption(result.caption);
      } else {
        setError(result.error || 'Bijschrift kon niet worden gegenereerd. Vul het zelf in.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!preview) {
      setError('Kies eerst een foto.');
      return;
    }
    if (!date) {
      setError('Vul een datum in.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await onSave({
        imageBase64: preview,
        date,
        island,
        caption: caption.trim(),
      });
      if (result.success) {
        onClose();
      } else {
        setError(result.error || 'Foto kon niet worden opgeslagen.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] max-w-xl w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative my-6 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#717783] hover:text-[#005BAE] rounded-full hover:bg-[#f0f4f9] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#005BAE] text-white flex items-center justify-center shadow-md">
              <ImagePlus className="w-6 h-6" />
            </div>
            <div>
              <span className="font-['Inter'] text-xs font-semibold text-[#005BAE] uppercase tracking-wider block">
                Reisdagboek
              </span>
              <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#001a33]">
                Foto toevoegen
              </h2>
            </div>
          </div>
          <p className="font-['Inter'] text-xs text-[#717783]">
            Deel een hoogtepunt van de dag met gasten. De foto wordt verkleind en opgeslagen via Cloudinary.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2 text-red-800 font-['Inter'] text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Foto */}
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-[#c0c7d3] bg-[#f0f4f9] p-4 flex flex-col items-center justify-center gap-2 hover:border-[#005BAE] hover:bg-[#e1efff] transition-colors cursor-pointer"
            >
              {preview ? (
                <img src={preview} alt="Voorbeeld" className="w-full max-h-64 object-contain rounded-xl" />
              ) : isCompressing ? (
                <>
                  <Loader2 className="w-8 h-8 text-[#005BAE] animate-spin" />
                  <span className="font-['Inter'] text-xs font-semibold text-[#005BAE]">
                    Bezig met verwerken...
                  </span>
                </>
              ) : (
                <>
                  <ImagePlus className="w-8 h-8 text-[#005BAE]" />
                  <span className="font-['Inter'] text-xs font-semibold text-[#005BAE]">
                    Kies een foto (JPG, PNG of WebP)
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Datum */}
            <div>
              <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#005BAE]" />
                Datum
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-4 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
                required
              />
            </div>

            {/* Eiland */}
            <div>
              <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#005BAE]" />
                Eiland
              </label>
              <select
                value={island}
                onChange={(e) => setIsland(e.target.value)}
                className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-3 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE]"
              >
                <option value="">Kies eiland</option>
                {Array.from(new Set(stays.map((s) => s.island))).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bijschrift */}
          <div>
            <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-1.5">
              Bijschrift / tekst (optioneel)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Bijv. Sarakiniko maanstrand — wat een plaatje!"
              rows={3}
              className="w-full bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl px-4 py-2.5 font-['Inter'] text-sm text-[#001a33] focus:outline-none focus:border-[#005BAE] resize-none"
            />
            <button
              type="button"
              onClick={handleGenerateCaption}
              disabled={isGenerating}
              className="mt-2 inline-flex items-center gap-1.5 text-[#005BAE] font-['Inter'] text-xs font-semibold hover:underline disabled:opacity-60 cursor-pointer"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              )}
              {isGenerating ? 'Athena denkt na...' : 'Genereer bijschrift met AI'}
            </button>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#f0f4f9]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#c0c7d3]/50 text-[#404752] font-['Inter'] text-xs font-semibold hover:bg-[#f0f4f9] transition-colors cursor-pointer"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#005BAE] text-white font-['Inter'] text-sm font-semibold hover:brightness-110 active:scale-95 disabled:opacity-60 transition-all shadow-md cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isSaving ? 'Bezig met opslaan...' : 'Foto opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
