import React, { useState } from 'react';
import { X, Copy, Check, Share2, Key, Users, UserCheck } from 'lucide-react';
import { DEFAULT_USERS } from '../../data/initialData';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripCode?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, tripCode = 'ATH-2026' }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const shareUrl = (() => {
    if (typeof window === 'undefined') return `https://athena-ai.studio/?code=${tripCode}`;
    const url = new URL(window.location.href);
    url.searchParams.set('code', tripCode);
    return url.toString();
  })();

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tripCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[28px] max-w-lg w-full p-6 md:p-8 shadow-2xl border border-[#005BAE]/20 relative animate-in fade-in zoom-in duration-200 font-['Plus_Jakarta_Sans'] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#717783] hover:text-[#005BAE] rounded-full hover:bg-[#f0f4f9] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#005BAE] text-white flex items-center justify-center shadow-md">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#001a33]">Reiscode & Delen</h2>
            <p className="font-['Inter'] text-xs text-[#717783]">Deel reis {tripCode} met Dennis, Joyce en je vrienden</p>
          </div>
        </div>

        {/* Big Travel Code Box */}
        <div className="mb-6 p-5 rounded-2xl bg-[#005BAE]/5 border border-[#005BAE]/20 text-center relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#005BAE] bg-white px-3 py-1 rounded-full border border-[#005BAE]/20">
            Unieke Reiscode voor Gasten & Vrienden
          </span>
          <div className="my-3 flex items-center justify-center gap-2">
            <span className="text-3xl font-extrabold text-[#005BAE] tracking-widest font-mono">{tripCode}</span>
          </div>
          <p className="text-xs text-[#404752] max-w-xs mx-auto mb-3">
            Vrienden en gasten kunnen deze code invoeren op het inlogscherm bij <strong>"Reis Volgen via Reiscode"</strong> om de reis direct live te volgen.
          </p>
          <button
            onClick={handleCopyCode}
            className="w-full py-2.5 bg-[#005BAE] text-white font-bold text-xs rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {copiedCode ? <Check className="w-4 h-4 text-green-300" /> : <Copy className="w-4 h-4" />}
            {copiedCode ? 'Reiscode Gekopieerd!' : `Kopieer Reiscode ${tripCode}`}
          </button>
        </div>

        {/* Co-Organizers list */}
        <div className="mb-6 space-y-2">
          <h4 className="text-xs font-bold text-[#001a33] uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#005BAE]" />
            Gekoppelde Beheerders (Volledig Toegang):
          </h4>
          <div className="space-y-2">
            {DEFAULT_USERS.map((user) => (
              <div key={user.username} className="p-3 bg-[#f0f4f9] rounded-xl flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#005BAE] text-white overflow-hidden flex-shrink-0">
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0b1d2d] block">{user.name}</span>
                    <span className="text-[11px] text-[#717783] block">{user.email}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-800 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  {user.role === 'owner' ? 'Eigenaar' : 'Mede-beheerder'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Share Direct URL */}
        <div className="pt-4 border-t border-[#f0f4f9]">
          <label className="block text-xs font-bold text-[#001a33] mb-1.5">Directe Web-Link</label>
          <div className="flex items-center gap-2 bg-[#f0f4f9] border border-[#c0c7d3]/30 rounded-xl p-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent border-none text-xs text-[#001a33] focus:outline-none truncate"
            />
            <button
              onClick={handleCopyLink}
              className="bg-[#005BAE] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:brightness-110 flex items-center gap-1 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Gekopieerd' : 'Link Kopiëren'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
