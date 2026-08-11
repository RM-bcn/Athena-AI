import React, { useState, useEffect } from 'react';
import { ActiveTab, ChatSubTab, ChatMessage, TripData, Accommodation, UserAccount, IslandStay } from './types';
import { initialChatMessages, DEFAULT_USERS } from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { MyItineraryView } from './components/MyItineraryView';
import { QuickHelpView } from './components/QuickHelpView';
import { ChatInterfaceView } from './components/ChatInterfaceView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { SupportView } from './components/SupportView';
import { LoginView } from './components/LoginView';
import { NotFoundView } from './components/NotFoundView';

// Modals
import { NewTripModal } from './components/Modals/NewTripModal';
import { MissedFerryModal } from './components/Modals/MissedFerryModal';
import { TranslateMenuModal } from './components/Modals/TranslateMenuModal';
import { AddBookingModal } from './components/Modals/AddBookingModal';
import { ShareModal } from './components/Modals/ShareModal';

// Initial default trip data with detailed stays and dates
const defaultTrip: TripData = {
  id: 'ATH-2026',
  title: 'Cyclades Island Hopping Odyssey',
  startDate: '2026-08-15',
  endDate: '2026-08-23',
  durationDays: 8,
  style: 'Eilandhoppen met Dennis & Joyce',
  stays: [
    {
      id: 'stay-1',
      island: 'Milos',
      startDate: '2026-08-15',
      endDate: '2026-08-18',
      nights: 3,
      accommodationName: 'Milos Breeze Boutique',
      notes: 'Sarakiniko maanstrand bezoeken & boottocht Kleftiko rotsspleten',
    },
    {
      id: 'stay-2',
      island: 'Naxos',
      startDate: '2026-08-18',
      endDate: '2026-08-21',
      nights: 3,
      accommodationName: 'Nissaki Beach Hotel',
      notes: 'Portara zonsondergang, bergkerken Apeiranthos & Naxian kaasproeverij',
    },
    {
      id: 'stay-3',
      island: 'Koufonisia',
      startDate: '2026-08-21',
      endDate: '2026-08-23',
      nights: 2,
      accommodationName: 'Paradisos Seaview Suites',
      notes: 'Fietsen langs Pori Beach & natuurlijke rotszwembaden (Devil\'s Eye)',
    },
  ],
};

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Authentication & Guest State initialized from LocalStorage
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('athena_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('athena_guest_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [tripCode, setTripCode] = useState<string>('ATH-2026');

  // Shared Trip State (persisted so Dennis & Joyce both see live edits)
  const [currentTrip, setCurrentTrip] = useState<TripData>(() => {
    try {
      const savedTrip = localStorage.getItem('athena_trip_ATH-2026');
      return savedTrip ? JSON.parse(savedTrip) : defaultTrip;
    } catch {
      return defaultTrip;
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const savedUser = localStorage.getItem('athena_active_user');
      const savedGuest = localStorage.getItem('athena_guest_mode');
      if (savedUser || savedGuest === 'true') {
        return 'itinerary';
      }
      return 'login';
    } catch {
      return 'login';
    }
  });
  const [chatSubTab, setChatSubTab] = useState<ChatSubTab>('current');
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);

  // Modal States
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [isMissedFerryOpen, setIsMissedFerryOpen] = useState(false);
  const [isTranslateMenuOpen, setIsTranslateMenuOpen] = useState(false);
  const [isAddBookingOpen, setIsAddBookingOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<'manual' | 'trivago'>('manual');
  const [bookingIsland, setBookingIsland] = useState<string | undefined>(undefined);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [customBookings, setCustomBookings] = useState<Accommodation[]>([]);

  // Google Sheets Integration State
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [isSheetsConnected, setIsSheetsConnected] = useState<boolean>(false);

  // Sync Google Sheets on startup
  useEffect(() => {
    async function checkAndLoadSheets() {
      try {
        const statusRes = await fetch('/api/sheets/status');
        const statusData = await statusRes.json();
        if (statusData.configured && statusData.spreadsheetUrl) {
          setSheetUrl(statusData.spreadsheetUrl);
          setIsSheetsConnected(true);

          // Attempt to load live data from Sheet
          const loadRes = await fetch('/api/sheets/load');
          if (loadRes.ok) {
            const loaded = await loadRes.json();
            if (loaded.trip && loaded.trip.stays && loaded.trip.stays.length > 0) {
              setCurrentTrip(loaded.trip);
            }
            if (loaded.customBookings) {
              setCustomBookings(loaded.customBookings);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load Google Sheets status:", err);
      }
    }
    checkAndLoadSheets();
  }, []);

  // Helper to persist trip updates to localStorage & Google Sheets
  const updateAndSaveTrip = (newTrip: TripData, updatedBookings?: Accommodation[]) => {
    setCurrentTrip(newTrip);
    try {
      localStorage.setItem('athena_trip_ATH-2026', JSON.stringify(newTrip));
    } catch (e) {
      console.error("Failed to save trip to localStorage", e);
    }

    // Only sync to Google Sheets if logged in as admin (not guest or unauthenticated)
    if (!currentUser) return;

    fetch('/api/sheets/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip: newTrip,
        customBookings: updatedBookings !== undefined ? updatedBookings : customBookings,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.spreadsheetUrl) {
          setSheetUrl(data.spreadsheetUrl);
          setIsSheetsConnected(true);
        }
      })
      .catch((err) => console.warn("Google Sheets save notice:", err));
  };

  const handleManualSyncSheets = async () => {
    if (!currentUser) {
      alert("⚠️ Inloggen vereist: Gasten hebben geen toegang of sync rechten naar de Google Sheet database.");
      return;
    }
    try {
      const res = await fetch('/api/sheets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip: currentTrip,
          customBookings,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!data) {
        alert(`⚠️ Vercel respons fout (HTTP ${res.status}).\n\nZorg dat GOOGLE_REFRESH_TOKEN in Vercel is ingeschakeld voor 'Production and Preview'.`);
        return;
      }

      if (data.spreadsheetUrl) {
        setSheetUrl(data.spreadsheetUrl);
        setIsSheetsConnected(true);
        alert("✅ Reisschema en accommodaties succesvol gesynchroniseerd met je Google Sheet!");
      } else if (data.error) {
        alert(`⚠️ Google Sheets status op Vercel:\n\n${data.error}`);
      } else {
        alert("⚠️ Onbekend antwoord ontvangen van Google Sheets service.");
      }
    } catch (err: any) {
      alert(`⚠️ Synchroniseren met Google Sheet is mislukt:\n\n${err?.message || err}`);
    }
  };

  const handleOpenNewTripModal = () => {
    if (!currentUser) {
      alert("⚠️ Inloggen vereist: Alleen beheerder-accounts (Dennis of Joyce) kunnen nieuwe reizen of datums bewerken.");
      setActiveTab('login');
      return;
    }
    setIsNewTripOpen(true);
  };


  // Navigation Guard: block unauthenticated users from chat and itinerary
  const handleSetActiveTab = (tab: ActiveTab) => {
    const isAuthenticated = currentUser !== null || isGuestMode;

    if (!isAuthenticated && (tab === 'chat' || tab === 'itinerary' || tab === 'quick-help' || tab === 'settings' || tab === 'profile')) {
      setActiveTab('login');
      return;
    }

    if (tab === 'chat' && isGuestMode) return;
    setActiveTab(tab);
  };

  // Auth Handlers
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setIsGuestMode(false);
    try {
      localStorage.setItem('athena_active_user', JSON.stringify(user));
      localStorage.removeItem('athena_guest_mode');
    } catch (e) {
      console.error(e);
    }
    setActiveTab('itinerary');

    // Restore the latest profile (avatar/nickname) from Google Sheets so it survives logout/login
    const email = user.email;
    const username = user.username;
    fetch(`/api/user?email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.user) {
          const sheetUser = data.user as UserAccount;
          const merged: UserAccount = {
            ...user,
            nickname: sheetUser.nickname || user.nickname,
            avatarUrl: sheetUser.avatarUrl || user.avatarUrl,
            avatar: sheetUser.avatar || user.avatar,
            name: sheetUser.name || user.name,
            role: sheetUser.role || user.role,
            tripCode: sheetUser.tripCode || user.tripCode,
          };
          setCurrentUser(merged);
          try {
            localStorage.setItem('athena_active_user', JSON.stringify(merged));
          } catch (e) {
            console.error(e);
          }
        }
      })
      .catch((err) => console.warn("Could not restore profile from sheet:", err));
  };

  const handleAccessTripCode = (code: string) => {
    setTripCode(code);
    setIsGuestMode(true);
    setCurrentUser(null);
    try {
      localStorage.setItem('athena_guest_mode', 'true');
      localStorage.removeItem('athena_active_user');
    } catch (e) {
      console.error(e);
    }
    setActiveTab('itinerary');
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setIsGuestMode(false);
    try {
      localStorage.removeItem('athena_active_user');
      localStorage.removeItem('athena_guest_mode');
    } catch (e) {
      console.error(e);
    }
    setActiveTab('login');
  };

  // Update user profile via backend API, then sync React state + localStorage
  const handleUpdateProfile = async (payload: {
    nickname?: string;
    avatarData?: string;
    newPassword?: string;
    currentPassword?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'Je bent niet ingelogd.' };
    }

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          username: currentUser.username,
          nickname: payload.nickname,
          avatarData: payload.avatarData,
          currentPassword: payload.currentPassword,
          newPassword: payload.newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || `Profiel bijwerken mislukt (HTTP ${res.status}).` };
      }

      if (data.user) {
        const updatedUser: UserAccount = { ...currentUser, ...data.user };
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem('athena_active_user', JSON.stringify(updatedUser));
        } catch (e) {
          console.error("Failed to save user to localStorage", e);
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error("Profile update error:", err);
      return { success: false, error: err?.message || 'Netwerkfout bij het bijwerken van je profiel.' };
    }
  };

  // Save / Edit Stay Handler (Dennis or Joyce editing trip)
  const handleSaveStay = (updatedStay: IslandStay) => {
    // Frontend validation before saving
    if (!updatedStay.id || !updatedStay.island || !updatedStay.startDate || !updatedStay.endDate) {
      alert("⚠️ Verplichte velden ontbreken: ID, eiland, aankomstdatum en vertrekdatum zijn verplicht.");
      return;
    }

    const sStart = new Date(updatedStay.startDate);
    const sEnd = new Date(updatedStay.endDate);
    const tripStart = new Date(currentTrip.startDate);
    const tripEnd = new Date(currentTrip.endDate);

    if (isNaN(sStart.getTime()) || isNaN(sEnd.getTime())) {
      alert("⚠️ Ongeldig datumformaat. Gebruik YYYY-MM-DD.");
      return;
    }

    if (sStart > sEnd) {
      alert("⚠️ Aankomstdatum moet voor vertrekdatum liggen.");
      return;
    }

    if (sStart < tripStart || sEnd > tripEnd) {
      alert(`⚠️ Verblijfdatums moeten binnen de reisperiode liggen (${currentTrip.startDate} tot ${currentTrip.endDate}).`);
      return;
    }

    // Check for overlap with other stays in the trip
    const hasOverlap = currentTrip.stays.some((s) => {
      if (s.id === updatedStay.id) return false;
      const oStart = new Date(s.startDate);
      const oEnd = new Date(s.endDate);
      if (isNaN(oStart.getTime()) || isNaN(oEnd.getTime())) return false;
      return !(sEnd < oStart || sStart > oEnd);
    });

    if (hasOverlap) {
      alert("⚠️ Dit verblijf overlapt met een ander verblijf in de reis. Corrigeer de datums.");
      return;
    }

    const existingIndex = currentTrip.stays.findIndex((s) => s.id === updatedStay.id);
    let newStays: IslandStay[];

    if (existingIndex >= 0) {
      newStays = currentTrip.stays.map((s) => (s.id === updatedStay.id ? updatedStay : s));
    } else {
      // Check for duplicate ID in new stays
      if (currentTrip.stays.some((s) => s.id === updatedStay.id)) {
        alert("⚠️ Een verblijf met dit ID bestaat al.");
        return;
      }
      newStays = [...currentTrip.stays, updatedStay];
    }

    const totalNights = newStays.reduce((acc, s) => acc + s.nights, 0);
    const newTripObj: TripData = {
      ...currentTrip,
      durationDays: totalNights + 1,
      stays: newStays,
    };

    updateAndSaveTrip(newTripObj);

    handleSendMessage(
      `Verblijf aangepast door ${currentUser?.name || 'Beheerder'}: ${updatedStay.island} (${updatedStay.startDate} tot ${updatedStay.endDate}, ${updatedStay.nights} nachten, Hotel: ${updatedStay.accommodationName || 'Nog niet geselecteerd'}). Herbereken dagschema!`
    );
  };

  const handleDeleteStay = (stayId: string) => {
    const newStays = currentTrip.stays.filter((s) => s.id !== stayId);
    const totalNights = newStays.reduce((acc, s) => acc + s.nights, 0);
    const newTripObj: TripData = {
      ...currentTrip,
      durationDays: totalNights + 1,
      stays: newStays,
    };
    updateAndSaveTrip(newTripObj);
  };

  const handleOpenAddBooking = (mode: 'manual' | 'trivago' = 'manual', island?: string) => {
    if (isGuestMode) {
      alert("⚠️ Je bent ingelogd als Gast. Log in als Dennis of Joyce om accommodaties toe te voegen!");
      setActiveTab('login');
      return;
    }
    setBookingMode(mode);
    setBookingIsland(island);
    setIsAddBookingOpen(true);
  };

  const handleAddBooking = (booking: {
    name: string;
    location: string;
    status: 'CONFIRMED' | 'PAST STAY' | 'PENDING';
    island?: string;
    pricePerNight?: number;
    image?: string;
  }) => {
    const newAccom: Accommodation = {
      id: `booking-${Date.now()}`,
      name: booking.name,
      location: booking.location,
      status: booking.status,
      image: booking.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDaynCJsoW5hGEsjYxWiFiFTUq6FF_3wMiDJNfr8XJm_ZEteWs-Jb_pTH6oM9AxjXq1zc3uXUjcVDUil0BNaduxay62Z9Tfh2AX-yMVxdswtqGXu36U8shML7hCVe41PKcnK_SFbXPo4HkNeiZWgNFjbmLUe0Oc18nCWdBs2gwLlg7aUt1GZS_k9EMeaPGXH3zLRsDUtUPYj1MmOA-4H43cNk2KjAE70iRYUTadS1eYCfvZA84H2G7uMQ',
    };

    setCustomBookings((prev) => [...prev, newAccom]);

    // If linked to an island in current trip, update stay's accommodation name
    if (booking.island) {
      const updatedStays = currentTrip.stays.map((s) =>
        s.island.toLowerCase() === booking.island?.toLowerCase()
          ? { ...s, accommodationName: booking.name }
          : s
      );
      updateAndSaveTrip({
        ...currentTrip,
        stays: updatedStays,
      });
    }

    handleSendMessage(
      `Ik heb een accommodatie toegevoegd voor ${booking.island || booking.location}: ${booking.name} (€${booking.pricePerNight || 150}/nacht, Status: ${booking.status}). Update mijn reis- en dagschema!`
    );
  };

  const handleDeleteCustomBooking = (id: string) => {
    setCustomBookings((prev) => prev.filter((b) => b.id !== id));
  };

  // Send message to backend Gemini API concierge & auto-parse uploaded itineraries
  const handleSendMessage = async (
    text: string,
    attachment?: { name: string; type: string; base64?: string; text?: string; isImage?: boolean }
  ) => {
    if (isGuestMode) return;
    const sender = currentUser?.nickname || currentUser?.name || 'Reiziger';
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      senderName: sender,
      avatar: currentUser?.avatarUrl || currentUser?.avatar,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: text,
      attachment: attachment
        ? {
            name: attachment.name,
            type: attachment.type,
            url: attachment.base64,
            isImage: attachment.isImage,
          }
        : undefined,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          userName: currentUser?.nickname || currentUser?.name || 'Reiziger',
          context: `Greek Island Hopping: ${currentTrip.title} (${currentTrip.stays.map((s) => `${s.island}: ${s.startDate} tot ${s.endDate}`).join(', ')})`,
          attachment: attachment
            ? {
                name: attachment.name,
                type: attachment.type,
                base64: attachment.base64,
                text: attachment.text,
              }
            : undefined,
        }),
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        console.warn("Server returned non-JSON for chat, falling back to local Concierge.");
        data = {
          reply: `Kalimera ${sender}! Athena Concierge is paraat. Hoe kan ik je verder helpen met de reis naar Milos, Naxos en Koufonisia?`
        };
      }

      // Check if data contains tripUpdate (auto itinerary adjustment)
      if (data.tripUpdate) {
        if (currentUser) {
          // Logged in as Dennis or Joyce -> automatically apply trip updates!
          const parsedStays: IslandStay[] = (data.tripUpdate.stays || []).map((s: any, idx: number) => ({
            id: s.id || `stay-auto-${Date.now()}-${idx}`,
            island: s.island,
            startDate: s.startDate,
            endDate: s.endDate,
            nights: Number(s.nights) || 3,
            accommodationName: s.accommodationName,
            notes: s.notes || 'Automatisch verwerkt via Chat Upload',
          }));

          if (parsedStays.length > 0) {
            const totalNights = parsedStays.reduce((acc, s) => acc + s.nights, 0);
            const updatedTripObj: TripData = {
              ...currentTrip,
              title: data.tripUpdate.title || currentTrip.title,
              startDate: data.tripUpdate.startDate || parsedStays[0].startDate,
              endDate: data.tripUpdate.endDate || parsedStays[parsedStays.length - 1].endDate,
              durationDays: totalNights + 1,
              stays: parsedStays,
            };

            // Save trip state locally & sync to Google Sheets if configured!
            updateAndSaveTrip(updatedTripObj);
          }
        }
      }

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        senderName: 'Athena',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: data.reply || `Kalimera ${sender}! High-speed ferries en de gecureerde eilandschema's voor ${currentTrip.title} zijn bijgewerkt.`,
        quickButtons: data.tripUpdate
          ? currentUser
            ? [{ label: ' Bekijk Mijn Reis', action: '/travel' }]
            : [{ label: ' Inloggen om Opslaan Goed te keuren', action: 'login' }]
          : undefined,
        sources: data.sources,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const fallbackAiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        senderName: 'Athena',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `Kalimera ${sender}! Ik heb je bericht of geüploade reisplan ontvangen en je dagschema bijgewerkt voor ${currentTrip.title}.`,
        quickButtons: [{ label: ' Bekijk Mijn Reis', action: '/travel' }],
      };
      setMessages((prev) => [...prev, fallbackAiMsg]);
    }
  };

  // Quick Action Chips Trigger
  const openChat = (message?: string) => {
    if (isGuestMode) return;
    setActiveTab('chat');
    if (message) handleSendMessage(message);
  };

  const handleTriggerQuickAction = (action: string) => {
    if (action === 'Ferry Status' || action.includes('ferry')) {
      setIsMissedFerryOpen(true);
    } else if (action === 'Translate Menu' || action.includes('menu')) {
      setIsTranslateMenuOpen(true);
    } else if (action === '/plan' || action.includes('/plan')) {
      openChat("Athena, genereer een gedetailleerd /plan voor onze Griekse eilandenreis!");
    } else if (action === '/travel' || action.includes('/travel')) {
      setActiveTab('itinerary');
    } else {
      openChat(action);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleCreateTrip = (newTrip: TripData) => {
    updateAndSaveTrip(newTrip);
    setActiveTab('itinerary');

    const staySummary = newTrip.stays
      .map((s) => `${s.island} (${s.startDate} - ${s.endDate}, ${s.nights} nachten)`)
      .join(', ');

    handleSendMessage(
      `We hebben een nieuwe reis geselecteerd: "${newTrip.title}" met de volgende verblijven: ${staySummary}. Pas ons dagschema aan!`
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#0b1d2d] flex font-['Inter'] overflow-x-hidden w-full">
      {/* Left Sidebar Drawer / Fixed Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onOpenNewTrip={handleOpenNewTripModal}
        currentUser={currentUser}
        isGuestMode={isGuestMode}
        tripCode={tripCode}
        onSignOut={handleSignOut}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Top Navigation Header */}
      <TopHeader
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        chatSubTab={chatSubTab}
        setChatSubTab={setChatSubTab}
        currentUser={currentUser}
        isGuestMode={isGuestMode}
        tripCode={tripCode}
        onOpenProfile={() => setActiveTab('profile')}
        onSignOut={handleSignOut}
        onLoginClick={() => setActiveTab('login')}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      {/* View Content based on Active Tab */}
      <div className="flex-1 w-full">
        {activeTab === 'itinerary' && (
          <MyItineraryView
            currentTrip={currentTrip}
            currentUser={currentUser}
            isGuestMode={isGuestMode}
            tripCode={tripCode}
            onOpenChat={openChat}
            onOpenNewBooking={handleOpenAddBooking}
            onShare={() => setIsShareOpen(true)}
            onExportPDF={handleExportPDF}
            onOpenNewTripModal={handleOpenNewTripModal}
            onSaveStay={handleSaveStay}
            onDeleteStay={handleDeleteStay}
            customBookings={customBookings}
            onDeleteCustomBooking={handleDeleteCustomBooking}
            onLoginClick={() => setActiveTab('login')}
            sheetUrl={sheetUrl}
            isSheetsConnected={isSheetsConnected}
            onSyncSheets={handleManualSyncSheets}
          />
        )}

        {activeTab === 'quick-help' && (
          <QuickHelpView
            onOpenMissedFerry={() => setIsMissedFerryOpen(true)}
            onOpenTranslateMenu={() => setIsTranslateMenuOpen(true)}
            onOpenTavernas={() => {
              openChat("Athena, can you recommend authentic local tavernas in Naxos and Milos within walking distance?");
            }}
            onOpenBeaches={() => {
              openChat("Athena, where are the quietest secluded beaches in Koufonisia and Naxos?");
            }}
            onOpenChat={openChat}
            onTriggerEmergency={() => alert("🚨 Emergency Service: Calling 112 (European Emergency Services in Greece)...")}
            onCallTaxi={() => alert("🚕 Taxi Desk: Contacting Naxos & Milos Port Radio Taxi Service (+30 22850 22444)...")}
            onFindPharmacy={() => {
              openChat("Athena, where is the nearest open pharmacy in Naxos Chora?");
            }}
            isGuestMode={isGuestMode}
          />
        )}

        {activeTab === 'chat' && (
          <ChatInterfaceView
            chatSubTab={chatSubTab}
            messages={messages}
            onSendMessage={handleSendMessage}
            onTriggerQuickAction={handleTriggerQuickAction}
            currentTrip={currentTrip}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            currentUser={currentUser}
            onOpenProfile={() => setActiveTab('profile')}
          />
        )}

        {activeTab === 'profile' && currentUser && (
          <ProfileView
            currentUser={currentUser}
            onUpdateUser={handleUpdateProfile}
            onBack={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'support' && <SupportView />}

        {activeTab === 'login' && (
          <LoginView
            onAccessTripCode={handleAccessTripCode}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {activeTab === 'not-found' && (
          <NotFoundView
            onReturnHome={() => setActiveTab('itinerary')}
            onGoBack={() => setActiveTab('itinerary')}
            onNavigateTab={handleSetActiveTab}
          />
        )}
      </div>

      {/* Interactive Modals */}
      <NewTripModal
        isOpen={isNewTripOpen}
        onClose={() => setIsNewTripOpen(false)}
        onCreateTrip={handleCreateTrip}
      />

      <MissedFerryModal
        isOpen={isMissedFerryOpen}
        onClose={() => setIsMissedFerryOpen(false)}
        onBookAlternative={(op) => {
          handleSendMessage(`I booked the alternative ferry departure with ${op}. Please update my itinerary!`);
        }}
      />

      <TranslateMenuModal
        isOpen={isTranslateMenuOpen}
        onClose={() => setIsTranslateMenuOpen(false)}
      />

      <AddBookingModal
        isOpen={isAddBookingOpen}
        onClose={() => setIsAddBookingOpen(false)}
        onAddBooking={handleAddBooking}
        tripStays={currentTrip.stays}
        initialMode={bookingMode}
        initialIsland={bookingIsland}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        tripCode={tripCode}
      />
    </div>
  );
}
