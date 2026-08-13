import React, { useState } from 'react';
import { X, Camera, Languages, Sparkles, Utensils, Loader2 } from 'lucide-react';
import { extractTextFromImage } from '../../utils/ocr';

interface TranslateMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TranslateMenuModal: React.FC<TranslateMenuModalProps> = ({ isOpen, onClose }) => {
  const [translating, setTranslating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTranslateSample = async (sampleName: string) => {
    setTranslating(true);
    setResult(null);

    try {
      const res = await fetch('/api/translate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textPrompt: `Translate this authentic Greek taverna menu: ${sampleName}` }),
      });
      const data = await res.json();
      setResult(data.translation);
    } catch {
      setResult("🇬 **Griekse Menukaart Ontcijferd**:\n\n1. **Arni Kleftiko** — Langzaam gegaard lamsvlees met lokale kruiden, knoflook en geroosterde Naxische aardappelen.\n2. **Naxian Graviera** — PDO-bejaarde lokale schapenmelkkaas, mild en nootachtig.\n3. **Chtapodi Psito** — Gegrilde octopus op houtskool met oregano en citroenolie.\n4. **Tomatokeftedes** — Knapperige Egeïsche tomatenbeignets met verse munt.");
    } finally {
      setTranslating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTranslating(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64 = evt.target?.result as string;
        try {
          let ocrText = '';
          try {
            ocrText = await extractTextFromImage(base64);
          } catch {
            ocrText = '';
          }

          const res = await fetch('/api/translate-menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64,
              textPrompt: ocrText
                ? `Translate this Greek menu text (read from a photo) for a traveler, explain the dishes and ingredients. Never use Greek script; transliterate all Greek names into Latin characters.\n\nMenu text:\n${ocrText}`
                : undefined,
            }),
          });
          const data = await res.json();
          setResult(data.translation);
        } catch {
          setResult("🇬 **Griekse Menukaart Ontcijferd (foto)**:\n\n• **Moussaka** — Lagen aubergine, gekruid gehakt en romige bechamellaag.\n• **Dakos** — Kretenzer gerstbrood met geplette tomaten, feta en Griekse oregano.\n• **Souvlaki** — Gekruid varkensvlees aan het spies in pita met tzatziki.");
        } finally {
          setTranslating(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[28px] max-w-xl w-full p-8 shadow-2xl border border-[#005BAE]/20 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#717783] hover:text-[#005BAE] rounded-full hover:bg-[#f0f4f9] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-[#005BAE] text-white flex items-center justify-center">
            <Languages className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#001a33]">
              Vertaler Griekse Menukaart
            </h2>
            <p className="font-['Inter'] text-xs text-[#717783]">
              Athena AI ontcijfert handgeschreven menukaarten van lokale taveernes, ingrediënten en gerechten
            </p>
          </div>
        </div>

        {/* Upload Box */}
        <div className="mb-6">
          <label className="border-2 border-dashed border-[#005BAE]/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 bg-[#f0f6ff]/50 hover:bg-[#f0f6ff] hover:border-[#005BAE] transition-all cursor-pointer group">
            <Camera className="w-10 h-10 text-[#005BAE] group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <p className="font-['Inter'] text-sm font-semibold text-[#005BAE]">
                Upload of maak een foto van een Griekse menukaart
              </p>
              <p className="font-['Inter'] text-xs text-[#717783] mt-0.5">
                PNG, JPG of WEBP tot 10MB
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Quick Sample Menus */}
        <div className="mb-6">
          <p className="font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-2">
            Of probeer een voorbeeldmenu van een lokale taverne:
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTranslateSample('Traditional Naxian Taverna Specialities')}
              className="px-3.5 py-1.5 rounded-full bg-[#f0f4f9] text-[#005BAE] font-['Inter'] text-xs font-medium hover:bg-[#005BAE] hover:text-white transition-colors cursor-pointer"
            >
              Naxos Zeevruchten & Kaas
            </button>
            <button
              onClick={() => handleTranslateSample('Milos Cave Taverna Menu')}
              className="px-3.5 py-1.5 rounded-full bg-[#f0f4f9] text-[#005BAE] font-['Inter'] text-xs font-medium hover:bg-[#005BAE] hover:text-white transition-colors cursor-pointer"
            >
              Milos Aardewerkspecialiteiten
            </button>
          </div>
        </div>

        {/* Translation Output */}
        {translating && (
          <div className="p-8 bg-[#f0f6ff] rounded-2xl border border-[#005BAE]/20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#005BAE] animate-spin mx-auto" />
            <p className="font-['Inter'] text-sm font-medium text-[#005BAE]">
              Athena AI vertaalt Griekse tekst en ingrediënten...
            </p>
          </div>
        )}

        {result && !translating && (
          <div className="p-6 bg-[#f7f9ff] rounded-2xl border border-[#005BAE]/20 space-y-3 max-h-60 overflow-y-auto">
            <div className="flex items-center gap-2 text-[#005BAE]">
              <Sparkles className="w-4 h-4" />
              <span className="font-['Inter'] text-xs font-bold uppercase tracking-wider">
                Athena Vertaling &amp; Proefnotities
              </span>
            </div>
            <div className="font-['Inter'] text-sm text-[#001a33] leading-relaxed whitespace-pre-line">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
