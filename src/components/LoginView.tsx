import React, { useState } from 'react';
import { LOGIN_HERO_IMAGE, DEFAULT_USERS } from '../data/initialData';
import { UserAccount } from '../types';
import { Key, ArrowRight, LogIn, Info, Sparkles, User, Lock, AlertCircle, HelpCircle, CheckCircle2, X } from 'lucide-react';

interface LoginViewProps {
  onAccessTripCode: (code: string) => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onAccessTripCode,
  onLoginSuccess,
}) => {
  const [code, setCode] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot Password modal state
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onAccessTripCode(code.trim());
    } else {
      setErrorMsg('Voer a.u.b. een geldige reiscode in om de reis te volgen.');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!usernameOrEmail.trim() || !password) {
      setErrorMsg('Vul a.u.b. zowel je gebruikersnaam/e-mail als je wachtwoord in.');
      return;
    }

    const inputLower = usernameOrEmail.trim().toLowerCase();
    const foundUser = DEFAULT_USERS.find(
      (u) =>
        (u.username.toLowerCase() === inputLower || u.email.toLowerCase() === inputLower) &&
        u.password === password
    );

    if (foundUser) {
      onLoginSuccess({
        username: foundUser.username,
        email: foundUser.email,
        name: foundUser.name,
        avatar: foundUser.avatar,
        role: foundUser.role,
        tripCode: foundUser.tripCode,
      });
    } else {
      setErrorMsg('Ongeldige gebruikersnaam of wachtwoord. Controleer je gegevens.');
    }
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetErrorMsg('');
    setResetSuccessMsg('');

    const input = resetIdentifier.trim().toLowerCase();
    if (!input) {
      setResetErrorMsg('Vul a.u.b. je e-mailadres of gebruikersnaam in.');
      return;
    }

    const foundUser = DEFAULT_USERS.find(
      (u) => u.username.toLowerCase() === input || u.email.toLowerCase() === input
    );

    if (foundUser) {
      if (newPasswordInput.trim()) {
        foundUser.password = newPasswordInput.trim();
        setResetSuccessMsg(`✅ Wachtwoord succesvol gewijzigd voor ${foundUser.name}! Je kunt nu inloggen met je nieuwe wachtwoord.`);
      } else {
        setResetSuccessMsg(`✅ Instructies en een herstellink zijn verzonden naar ${foundUser.email}! (Het ingestelde wachtwoord voor ${foundUser.username} is: ${foundUser.password})`);
      }
    } else {
      setResetSuccessMsg(`✅ Als dit e-mailadres (${resetIdentifier}) bij ons bekend is, zijn er herstel-instructies verstuurd.`);
    }
  };

  return (
    <div className="md:ml-64 min-h-screen pt-16 md:pt-0 bg-white text-[#151c26] font-['Plus_Jakarta_Sans'] flex flex-col justify-center relative overflow-hidden">
      {/* Background Decorative Gradient Shader */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#005BAE]/5 via-transparent to-[#E2725B]/5 pointer-events-none" />

      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12 py-12 flex flex-col justify-center">
        {/* Branding Header */}
        <header className="mb-8 md:mb-12 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#005BAE] text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-2xl">account_balance</span>
            </div>
            <h1 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl font-extrabold text-[#005BAE] tracking-tight">
              Athena AI
            </h1>
          </div>
          <p className="mt-3 max-w-md text-[#4f6073] font-['Plus_Jakarta_Sans'] text-base md:text-lg">
            Wisdom-led travel planning. Discover the Mediterranean through the eyes of a modern sage.
          </p>
        </header>

        {/* Dual Card Section */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {/* Section 1: Travel Code Access (Follow a Journey) */}
          <section className="bg-white/90 backdrop-blur-md rounded-2xl p-8 md:p-10 shadow-sm hover:shadow-md transition-all border border-[#f0f4f9] flex flex-col justify-between group">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-full bg-[#d0e1f8] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[#005BAE] text-2xl">map</span>
              </div>
              <div>
                <h2 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-[#0B1D2D] mb-2">
                  Reis Volgen via Reiscode
                </h2>
                <p className="text-[#4f6073] font-['Plus_Jakarta_Sans'] text-sm leading-relaxed">
                  Vul de unieke reiscode in die door de organisator is gedeeld om de reis live in te zien (read-only).
                </p>
              </div>

              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div className="relative">
                  <label htmlFor="travel-code" className="sr-only">Travel Code</label>
                  <Key className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#727783]" />
                  <input
                    id="travel-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Voer reiscode in (bijv. ATH-2026)"
                    className="w-full pl-12 pr-4 py-4 bg-[#F0F4F9] border border-[#0B1D2D]/10 rounded-xl font-['Plus_Jakarta_Sans'] text-base font-semibold text-[#0B1D2D] focus:ring-2 focus:ring-[#005BAE] focus:outline-none uppercase tracking-widest transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#005BAE] text-white font-['Plus_Jakarta_Sans'] font-semibold py-4 rounded-xl hover:bg-[#0B1D2D] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Reis Openen (Gast)</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>

            <div className="mt-8 pt-6 border-t border-[#F0F4F9]">
              <div className="flex items-center gap-3 text-[#4f6073]">
                <Info className="w-4 h-4 text-[#005BAE]" />
                <p className="text-xs font-['Plus_Jakarta_Sans']">
                  Gastmodus is uitsluitend om de reis te bekijken. Bewerken vereist een beheerdersaccount.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Account Sign In */}
          <section className="bg-[#0B1D2D] text-white rounded-2xl p-8 md:p-10 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="space-y-6 relative z-10">
              <div className="w-12 h-12 rounded-full bg-[#005BAE] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-white text-2xl">person</span>
              </div>
              <div>
                <h2 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-white mb-2">
                  Beheerders Inloggen
                </h2>
                <p className="text-[#d2e4fb] font-['Plus_Jakarta_Sans'] text-sm leading-relaxed">
                  Log in als accountbeheerder om reisschema's te bewerken, locaties te beheren en te synchroniseren.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="relative">
                  <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="Gebruikersnaam of Email"
                    className="w-full h-14 bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/40 focus:bg-white/15 focus:ring-2 focus:ring-[#E2725B] focus:outline-none transition-all font-['Plus_Jakarta_Sans'] text-sm font-semibold"
                  />
                </div>

                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Wachtwoord"
                    className="w-full h-14 bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/40 focus:bg-white/15 focus:ring-2 focus:ring-[#E2725B] focus:outline-none transition-all font-['Plus_Jakarta_Sans'] text-sm font-semibold"
                  />
                </div>

                <div className="flex items-center justify-between py-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-white/30 bg-transparent text-[#E2725B] focus:ring-[#E2725B]"
                    />
                    <span className="text-white/80">Onthoud mij</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-[#E2725B] hover:underline font-semibold cursor-pointer text-xs"
                  >
                    Wachtwoord vergeten?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full h-14 bg-[#E2725B] text-white font-['Plus_Jakarta_Sans'] font-semibold text-sm rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  Inloggen op Athena AI
                </button>
              </form>
            </div>
          </section>
        </div>

        {/* Visual Banner */}
        <div className="mt-12 w-full rounded-2xl h-44 relative overflow-hidden border border-[#F0F4F9] shadow-sm">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
            style={{ backgroundImage: `url('${LOGIN_HERO_IMAGE}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1D2D]/70 via-[#0B1D2D]/30 to-transparent flex items-end p-6">
            <div className="text-white max-w-md">
              <div className="flex items-center gap-2 mb-1 text-amber-300">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Athenian Wisdom</span>
              </div>
              <p className="text-sm italic font-['Plus_Jakarta_Sans'] font-medium">
                "Wisdom begins in wonder." — Socrates
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative text-[#0B1D2D]">
            <button
              onClick={() => {
                setIsForgotPasswordOpen(false);
                setResetSuccessMsg('');
                setResetErrorMsg('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#005BAE]/10 text-[#005BAE] flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-[#0B1D2D]">
                  Wachtwoord Herstellen
                </h3>
                <p className="text-xs text-gray-500 font-['Inter']">
                  Voer je gebruikersnaam of e-mailadres in.
                </p>
              </div>
            </div>

            {resetSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            {resetErrorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{resetErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0B1D2D] mb-1">
                  Gebruikersnaam of E-mailadres
                </label>
                <input
                  type="text"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="bijv. dennisvr of dennis.van.rooden@gmail.com"
                  className="w-full h-11 px-3 bg-[#F0F4F9] border border-gray-300 rounded-xl text-xs font-['Inter'] focus:ring-2 focus:ring-[#005BAE] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B1D2D] mb-1">
                  Nieuw Wachtwoord (Optioneel direct instellen)
                </label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Voer nieuw wachtwoord in"
                  className="w-full h-11 px-3 bg-[#F0F4F9] border border-gray-300 rounded-xl text-xs font-['Inter'] focus:ring-2 focus:ring-[#005BAE] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Sluiten
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-[#005BAE] text-white text-xs font-bold hover:brightness-110 cursor-pointer shadow-sm"
                >
                  Wachtwoord Herstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

