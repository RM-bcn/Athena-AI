import React, { useState, useRef } from 'react';
import { UserAccount } from '../types';
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  ShieldCheck,
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: UserAccount;
  onUpdateUser: (payload: {
    nickname?: string;
    avatarData?: string;
    newPassword?: string;
    currentPassword?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onBack: () => void;
}

// Compress image client-side (max 500px, JPEG quality 0.7) to keep uploads small
// and avoid Vercel Hobby 10s timeouts. Returns a data URI for the backend/Cloudinary.
function compressImage(file: File, maxDim = 500, quality = 0.7): Promise<string> {
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

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onUpdateUser, onBack }) => {
  const [nickname, setNickname] = useState(currentUser.nickname || currentUser.name || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarSrc = avatarPreview || currentUser.avatarUrl || currentUser.avatar;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Selecteer een geldige afbeelding (JPG, PNG of WebP).' });
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setAvatarPreview(compressed);
      setMessage({ type: 'success', text: 'Foto geselecteerd — klik op "Opslaan" om de wijziging te bevestigen.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Foto kon niet worden verwerkt. Probeer een andere afbeelding.' });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!nickname.trim()) {
      setMessage({ type: 'error', text: 'Nickname mag niet leeg zijn.' });
      return;
    }
    if (nickname.trim().length > 40) {
      setMessage({ type: 'error', text: 'Nickname mag maximaal 40 tekens bevatten.' });
      return;
    }

    const payload: { nickname: string; avatarData?: string; currentPassword?: string; newPassword?: string } = {
      nickname: nickname.trim(),
    };
    if (avatarPreview) {
      payload.avatarData = avatarPreview;
    }

    const passwordFieldsFilled = Boolean(currentPassword || newPassword || confirmPassword);
    if (passwordFieldsFilled) {
      if (!currentPassword) {
        setMessage({ type: 'error', text: 'Vul je huidige wachtwoord in om het wachtwoord te wijzigen.' });
        return;
      }
      if (newPassword.length < 8) {
        setMessage({ type: 'error', text: 'Nieuw wachtwoord moet minimaal 8 tekens bevatten.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setMessage({ type: 'error', text: 'Het nieuwe wachtwoord en de bevestiging komen niet overeen.' });
        return;
      }
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    setIsSaving(true);
    try {
      const result = await onUpdateUser(payload);
      if (result.success) {
        setMessage({ type: 'success', text: 'Profiel succesvol bijgewerkt' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setAvatarPreview(null);
      } else {
        setMessage({ type: 'error', text: result.error || 'Er ging iets mis bij het opslaan van je profiel.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="md:ml-64 pt-24 min-h-screen px-6 md:px-12 pb-16 bg-white">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-['Inter'] text-sm font-semibold text-[#005BAE] hover:text-[#0b1d2d] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar Instellingen
        </button>

        <div>
          <span className="font-['Inter'] text-xs font-semibold text-[#005BAE] uppercase tracking-widest block mb-1">
            Account
          </span>
          <h1 className="font-['Plus_Jakarta_Sans'] text-4xl font-bold text-[#0b1d2d]">
            Mijn Profiel
          </h1>
          <p className="text-[#404752] font-['Inter'] text-sm mt-1">
            Pas je weergavenaam, profielfoto en wachtwoord aan.
          </p>
        </div>

        {message && (
          <div
            className={`flex items-start gap-2.5 p-4 rounded-2xl border text-sm font-['Inter'] ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white rounded-[24px] border border-[#e1efff] p-6 md:p-8 shadow-sm space-y-8">
          {/* Avatar / Profile Photo */}
          <section className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-[#f0f4f9]">
            <div className="relative">
              <div className="w-28 h-28 rounded-full border-4 border-[#005BAE]/20 overflow-hidden bg-[#f0f4f9] flex-shrink-0">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profielfoto" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#005BAE]">
                    <User className="w-12 h-12" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-[#005BAE] text-white flex items-center justify-center shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                title="Profielfoto wijzigen"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center sm:text-left">
              <h3 className="font-['Plus_Jakarta_Sans'] font-semibold text-lg text-[#0b1d2d]">
                Profielfoto
              </h3>
              <p className="font-['Inter'] text-xs text-[#717783] mt-1 max-w-sm">
                Upload een foto (JPG, PNG of WebP). De afbeelding wordt automatisch verkleind en veilig
                opgeslagen via Cloudinary.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f0f4f9] text-[#005BAE] text-xs font-bold hover:bg-[#e1efff] transition-colors cursor-pointer"
              >
                {isCompressing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
                {isCompressing ? 'Bezig met verwerken...' : 'Kies een foto'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </section>

          {/* Nickname */}
          <section className="space-y-2">
            <label htmlFor="nickname" className="block font-['Inter'] text-sm font-semibold text-[#0b1d2d]">
              Nickname / Weergavenaam
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#717783]" />
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Bijv. Dennis"
                className="w-full h-14 pl-12 pr-4 bg-[#f0f4f9] border border-[#0B1D2D]/10 rounded-xl font-['Plus_Jakarta_Sans'] text-base font-semibold text-[#0B1D2D] focus:ring-2 focus:ring-[#005BAE] focus:outline-none transition-all"
              />
            </div>
            <p className="font-['Inter'] text-xs text-[#717783]">
              Deze naam wordt weergegeven in de chat naast je berichten.
            </p>
          </section>

          {/* Password change */}
          <section className="space-y-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#f0f4f9] text-[#005BAE] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-semibold text-lg text-[#0b1d2d]">
                  Wachtwoord wijzigen
                </h3>
                <p className="font-['Inter'] text-xs text-[#717783]">
                  Laat deze velden leeg als je je wachtwoord niet wilt wijzigen.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block font-['Inter'] text-xs font-semibold text-[#0b1d2d] mb-1">
                  Huidig wachtwoord
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#717783]" />
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Vul je huidige wachtwoord in"
                    className="w-full pl-11 pr-4 py-3 bg-[#f0f4f9] border border-[#0B1D2D]/10 rounded-xl font-['Inter'] text-sm text-[#0B1D2D] focus:ring-2 focus:ring-[#005BAE] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-password" className="block font-['Inter'] text-xs font-semibold text-[#0b1d2d] mb-1">
                  Nieuw wachtwoord
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#717783]" />
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimaal 8 tekens"
                    className="w-full pl-11 pr-4 py-3 bg-[#f0f4f9] border border-[#0B1D2D]/10 rounded-xl font-['Inter'] text-sm text-[#0B1D2D] focus:ring-2 focus:ring-[#005BAE] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block font-['Inter'] text-xs font-semibold text-[#0b1d2d] mb-1">
                  Bevestig nieuw wachtwoord
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#717783]" />
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Herhaal het nieuwe wachtwoord"
                    className="w-full pl-11 pr-4 py-3 bg-[#f0f4f9] border border-[#0B1D2D]/10 rounded-xl font-['Inter'] text-sm text-[#0B1D2D] focus:ring-2 focus:ring-[#005BAE] focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="flex justify-end pt-2 border-t border-[#f0f4f9]">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#005BAE] text-white font-['Inter'] font-semibold text-sm hover:brightness-110 active:scale-95 disabled:opacity-60 transition-all shadow-md cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Bezig met opslaan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Opslaan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};
