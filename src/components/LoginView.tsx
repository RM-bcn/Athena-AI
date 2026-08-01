import React, { useState } from 'react';
import { LOGIN_HERO_IMAGE, DEFAULT_USERS } from '../data/initialData';
import { UserAccount } from '../types';
import { Key, ArrowRight, LogIn, Info, Sparkles, User, Lock, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  onAccessTripCode: (code: string) => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onAccessTripCode,
  onLoginSuccess,
}) => {
  const [code, setCode] = useState('ATH-2026');
  const [usernameOrEmail, setUsernameOrEmail] = useState('dennisvr');
  const [password, setPassword] = useState('Athene2026!');
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onAccessTripCode(code.trim());
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

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
      setErrorMsg('Ongeldige gebruikersnaam of wachtwoord. Probeer dennisvr (Athene2026!) of Joyce (JoyceO).');
    }
  };

  const handleQuickLogin = (userObj: typeof DEFAULT_USERS[0]) => {
    onLoginSuccess({
      username: userObj.username,
      email: userObj.email,
      name: userObj.name,
      avatar: userObj.avatar,
      role: userObj.role,
      tripCode: userObj.tripCode,
    });
  };

  return (
    <div className="md:ml-64 min-h-screen bg-white text-[#151c26] font-['Plus_Jakarta_Sans'] flex flex-col justify-center relative overflow-hidden">
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

        {/* Quick Demo Shortcuts Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-[#005BAE]/5 border border-[#005BAE]/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#005BAE]">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Snel-Inloggen Opties voor Ontwikkelaar & Testen:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleQuickLogin(DEFAULT_USERS[0])}
              className="px-3 py-1.5 rounded-lg bg-[#005BAE] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              Inloggen als Dennis (dennisvr)
            </button>
            <button
              onClick={() => handleQuickLogin(DEFAULT_USERS[1])}
              className="px-3 py-1.5 rounded-lg bg-[#E2725B] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              Inloggen als Joyce (Joyce)
            </button>
            <button
              onClick={() => onAccessTripCode('ATH-2026')}
              className="px-3 py-1.5 rounded-lg bg-[#F0F4F9] text-[#0B1D2D] border border-[#005BAE]/30 text-xs font-bold hover:bg-[#005BAE] hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-[#005BAE]" />
              Bekijk als Gast (ATH-2026)
            </button>
          </div>
        </div>

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
                  Follow a Journey
                </h2>
                <p className="text-[#4f6073] font-['Plus_Jakarta_Sans'] text-sm leading-relaxed">
                  Enter a unique travel code (e.g. <span className="font-bold text-[#005BAE]">ATH-2026</span>) provided by your group organizer to follow the shared itinerary.
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
                    placeholder="Enter Code (e.g. ATH-2026)"
                    className="w-full pl-12 pr-4 py-4 bg-[#F0F4F9] border border-[#0B1D2D]/10 rounded-xl font-['Plus_Jakarta_Sans'] text-base font-semibold text-[#0B1D2D] focus:ring-2 focus:ring-[#005BAE] focus:outline-none uppercase tracking-widest transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#005BAE] text-white font-['Plus_Jakarta_Sans'] font-semibold py-4 rounded-xl hover:bg-[#0B1D2D] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Access Itinerary</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>

            <div className="mt-8 pt-6 border-t border-[#F0F4F9]">
              <div className="flex items-center gap-3 text-[#4f6073]">
                <Info className="w-4 h-4 text-[#005BAE]" />
                <p className="text-xs font-['Plus_Jakarta_Sans']">
                  Vrienden en gasten bekijken hiermee live de reis (ATH-2026).
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
                  Plan Your Odyssey
                </h2>
                <p className="text-[#d2e4fb] font-['Plus_Jakarta_Sans'] text-sm leading-relaxed">
                  Log in als beheerders (Dennis of Joyce) om reizen aan te passen en te synchroniseren.
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
                  <span className="text-white/60 text-[11px]">
                    Accounts: <code className="text-[#E2725B]">dennisvr</code> / <code className="text-[#E2725B]">Joyce</code>
                  </span>
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

            <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
              <div className="text-xs text-white/70 space-y-1 text-center">
                <p>Dennis: <span className="text-white font-semibold">dennisvr</span> / <span className="text-white font-semibold">Athene2026!</span></p>
                <p>Joyce: <span className="text-white font-semibold">Joyce</span> / <span className="text-white font-semibold">JoyceO</span></p>
              </div>
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
    </div>
  );
};
