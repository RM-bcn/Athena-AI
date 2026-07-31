import React, { useState } from 'react';
import { X, Copy, Check, Share2, Globe, Mail } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://athena-ai.studio/trip/cyclades-hopping';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[28px] max-w-md w-full p-8 shadow-2xl border border-[#005BAE]/20 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#717783] hover:text-[#005BAE] rounded-full hover:bg-[#f0f4f9] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#005BAE] text-white flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#001a33]">Share Odyssey</h2>
            <p className="font-['Inter'] text-xs text-[#717783]">Invite travel companions to Cyclades Hopping</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-['Inter'] text-xs font-semibold text-[#001a33] uppercase tracking-wider mb-2">
              Shareable Link
            </label>
            <div className="flex items-center gap-2 bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl p-2">
              <Globe className="w-4 h-4 text-[#005BAE] ml-2 flex-shrink-0" />
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent border-none font-['Inter'] text-xs text-[#001a33] focus:outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className="bg-[#005BAE] text-white px-3 py-1.5 rounded-lg font-['Inter'] text-xs font-medium hover:brightness-110 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={() => {
                window.open(`mailto:?subject=Athena AI Cyclades Hopping Itinerary&body=Check out our 7-day Greek island odyssey: ${encodeURIComponent(shareUrl)}`);
              }}
              className="flex-1 py-2.5 border border-[#005BAE]/30 text-[#005BAE] rounded-xl font-['Inter'] text-xs font-semibold hover:bg-[#005BAE]/5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              Email Link
            </button>

            <button
              onClick={handleCopy}
              className="flex-1 py-2.5 bg-[#005BAE] text-white rounded-xl font-['Inter'] text-xs font-semibold hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              Copy Direct URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
