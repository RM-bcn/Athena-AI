import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ActiveTab, ChatSubTab, ChatMessage, ChatFavorite, TripData, Accommodation, UserAccount, IslandStay } from './types';
import { useTransportEntries } from './transport/useTransportEntries';
import type { TransportEntry } from './transport/types';
import { getActiveUser, isGuestMode as readGuestMode, saveLogin, updateActiveUser, clearSession, ACTIVE_USER_KEY, GUEST_MODE_KEY } from './utils/authStorage';
import { getToken, clearToken } from './utils/authToken';
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
import { getMatchingStaysForBooking } from './utils/accommodationMatcher';

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
  // Authentication & Guest State initialized from storage
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getActiveUser());

  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => readGuestMode());

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
      if (getActiveUser() || readGuestMode()) {
        return 'itinerary';
      }
      return 'login';
    } catch {
      return 'login';
    }
  });
  const [chatSubTab, setChatSubTab] = useState<ChatSubTab>('current');

  const [sessionId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('athena_chat_session');
      if (saved) return saved;
    } catch {
      return `session-${Date.now()}`;
    }
    const fresh = `session-${Date.now()}`;
    try {
      localStorage.setItem('athena_chat_session', fresh);
    } catch {
      return fresh;
    }
    return fresh;
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('athena_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState<ChatFavorite[]>(() => {
    try {
      const saved = localStorage.getItem('athena_chat_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const chatHistoryRef = useRef<ChatMessage[]>(chatHistory);
  const favoritesRef = useRef<ChatFavorite[]>(favorites);
  const historySyncRef = useRef<number | null>(null);
  const favoritesSyncRef = useRef<number | null>(null);

  const authFetch = (url: string, init: RequestInit = {}) => {
    const token = getToken();
    const headers: Record<string, string> = {
      ...((init.headers as Record<string, string>) || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...init, headers });
  };

  const messages = useMemo(
    () => chatHistory.filter((m) => m.sessionId === sessionId),
    [chatHistory, sessionId]
  );

  const persistHistory = (list: ChatMessage[]) => {
    try {
      localStorage.setItem('athena_chat_history', JSON.stringify(list.slice(-200)));
    } catch (e) {
      console.error("Failed to save chat history to localStorage", e);
    }
    if (!currentUser) return;
    if (historySyncRef.current) window.clearTimeout(historySyncRef.current);
    historySyncRef.current = window.setTimeout(() => {
      authFetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: list.slice(-200) }),
      })
        .then((res) => {
          if (res.status === 401) handleSessionExpired();
        })
        .catch((err) => console.warn("Chat history sync notice:", err));
    }, 1500);
  };

  const persistFavorites = (list: ChatFavorite[]) => {
    try {
      localStorage.setItem('athena_chat_favorites', JSON.stringify(list.slice(-200)));
    } catch (e) {
      console.error("Failed to save favorites to localStorage", e);
    }
    if (!currentUser) return;
    if (favoritesSyncRef.current) window.clearTimeout(favoritesSyncRef.current);
    favoritesSyncRef.current = window.setTimeout(() => {
      authFetch('/api/chat/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites: list.slice(-200) }),
      })
        .then((res) => {
          if (res.status === 401) handleSessionExpired();
        })
        .catch((err) => console.warn("Favorites sync notice:", err));
    }, 1500);
  };

  const appendHistory = (msgs: ChatMessage[]) => {
    const next = [...chatHistoryRef.current, ...msgs];
    chatHistoryRef.current = next;
    setChatHistory(next);
    persistHistory(next);
  };

  const handleToggleFavorite = (msg: ChatMessage) => {
    const exists = favoritesRef.current.some((f) => f.id === msg.id);
    const next = exists
      ? favoritesRef.current.filter((f) => f.id !== msg.id)
      : [
          ...favoritesRef.current,
          {
            id: msg.id,
            content: msg.content,
            senderName: msg.senderName || 'Athena',
            timestamp: msg.timestamp,
            savedAt: new Date().toISOString(),
            sources: msg.sources,
          },
        ];
    favoritesRef.current = next;
    setFavorites(next);
    persistFavorites(next);
  };

  const handleRemoveFavorite = (id: string) => {
    const next = favoritesRef.current.filter((f) => f.id !== id);
    favoritesRef.current = next;
    setFavorites(next);
    persistFavorites(next);
  };

  const handleDeleteSession = (sessionId: string) => {
    const next = chatHistoryRef.current.filter((m) => m.sessionId !== sessionId);
    chatHistoryRef.current = next;
    setChatHistory(next);
    persistHistory(next);
  };

  useEffect(() => {
    async function loadChatStores() {
      try {
        const [hRes, fRes] = await Promise.all([
          fetch('/api/chat/history'),
          fetch('/api/chat/favorites'),
        ]);

        if (hRes.ok) {
          const data = await hRes.json();
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            const ids = new Set(chatHistoryRef.current.map((m) => m.id));
            const incoming = (data.messages as ChatMessage[]).filter((m) => m.id && !ids.has(m.id));
            if (incoming.length > 0) {
              const merged = [...chatHistoryRef.current, ...incoming];
              chatHistoryRef.current = merged;
              setChatHistory(merged);
              try {
                localStorage.setItem('athena_chat_history', JSON.stringify(merged.slice(-200)));
              } catch {
                // localStorage vol of niet beschikbaar
              }
            }
          }
        }

        if (fRes.ok) {
          const data = await fRes.json();
          if (Array.isArray(data.favorites) && data.favorites.length > 0) {
            const ids = new Set(favoritesRef.current.map((f) => f.id));
            const incoming = (data.favorites as ChatFavorite[]).filter((f) => f.id && !ids.has(f.id));
            if (incoming.length > 0) {
              const merged = [...favoritesRef.current, ...incoming];
              favoritesRef.current = merged;
              setFavorites(merged);
              try {
                localStorage.setItem('athena_chat_favorites', JSON.stringify(merged.slice(-200)));
              } catch {
                // localStorage vol of niet beschikbaar
              }
            }
          }
        }
      } catch (err) {
        console.warn("Could not load chat stores:", err);
      }
    }
    loadChatStores();
  }, []);

  // Modal States
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [isMissedFerryOpen, setIsMissedFerryOpen] = useState(false);
  const [isTranslateMenuOpen, setIsTranslateMenuOpen] = useState(false);
  const [isAddBookingOpen, setIsAddBookingOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<'manual' | 'ai'>('manual');
  const [bookingIsland, setBookingIsland] = useState<string | undefined>(undefined);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [customBookings, setCustomBookings] = useState<Accommodation[]>([]);
  const [stayBookingLinks, setStayBookingLinks] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('athena_stay_booking_links');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Booked transports (ferries, flights, transfers) — persisted to localStorage
  // and synced to the Google Sheets database via /api/sheets/save.
  const {
    transportEntries,
    addTransportEntry,
    updateTransportEntry,
    deleteTransportEntry,
    setTransportEntries,
  } = useTransportEntries();

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
if (loaded.stayBookingLinks) {
              setStayBookingLinks(loaded.stayBookingLinks);
            }
            if (loaded.transportEntries) {
              setTransportEntries(loaded.transportEntries as TransportEntry[]);
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
  const updateAndSaveTrip = (
    newTrip: TripData,
    updatedBookings?: Accommodation[],
    updatedLinks?: Record<string, string>
  ) => {
    setCurrentTrip(newTrip);
    try {
      localStorage.setItem('athena_trip_ATH-2026', JSON.stringify(newTrip));
    } catch (e) {
      console.error("Failed to save trip to localStorage", e);
    }

    // Only sync to Google Sheets if logged in as admin (not guest or unauthenticated)
    if (!currentUser) return;

    authFetch('/api/sheets/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trip: newTrip,
        customBookings: updatedBookings !== undefined ? updatedBookings : customBookings,
        stayBookingLinks: updatedLinks !== undefined ? updatedLinks : stayBookingLinks,
        transportEntries,
      }),
    })
      .then((res) => {
        if (res.status === 401) {
          handleSessionExpired();
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.spreadsheetUrl) {
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
      const res = await authFetch('/api/sheets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip: currentTrip,
          customBookings,
          stayBookingLinks,
          transportEntries,
        }),
      });

      if (res.status === 401) {
        handleSessionExpired();
        return;
      }

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
  const handleLoginSuccess = (user: UserAccount, rememberMe = true) => {
    setCurrentUser(user);
    setIsGuestMode(false);
    saveLogin(user, undefined, rememberMe);
    try {
      localStorage.removeItem(GUEST_MODE_KEY);
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
          updateActiveUser(merged);
        }
      })
      .catch((err) => console.warn("Could not restore profile from sheet:", err));
  };

  const handleAccessTripCode = (code: string) => {
    setTripCode(code);
    setIsGuestMode(true);
    setCurrentUser(null);
    try {
      localStorage.setItem(GUEST_MODE_KEY, 'true');
      localStorage.removeItem(ACTIVE_USER_KEY);
      sessionStorage.removeItem(ACTIVE_USER_KEY);
    } catch (e) {
      console.error(e);
    }
    setActiveTab('itinerary');
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setIsGuestMode(false);
    clearSession();
    setActiveTab('login');
  };

  const handleSessionExpired = () => {
    clearToken();
    handleSignOut();
    alert('Je sessie is verlopen, log opnieuw in.');
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
      const res = await authFetch('/api/profile/update', {
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

      if (res.status === 401) {
        handleSessionExpired();
        return { success: false, error: 'Je sessie is verlopen, log opnieuw in.' };
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || `Profiel bijwerken mislukt (HTTP ${res.status}).` };
      }

      if (data.user) {
        const updatedUser: UserAccount = { ...currentUser, ...data.user };
        setCurrentUser(updatedUser);
        updateActiveUser(updatedUser);
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

  const handleOpenAddBooking = (mode: 'manual' | 'ai' = 'manual', island?: string) => {
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
    checkIn?: string;
    checkOut?: string;
  }) => {
    const newAccom: Accommodation = {
      id: `booking-${Date.now()}`,
      name: booking.name,
      location: booking.location,
      status: booking.status,
      image: booking.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDaynCJsoW5hGEsjYxWiFiFTUq6FF_3wMiDJNfr8XJm_ZEteWs-Jb_pTH6oM9AxjXq1zc3uXUjcVDUil0BNaduxay62Z9Tfh2AX-yMVxdswtqGXu36U8shML7hCVe41PKcnK_SFbXPo4HkNeiZWgNFjbmLUe0Oc18nCWdBs2gwLlg7aUt1GZS_k9EMeaPGXH3zLRsDUtUPYj1MmOA-4H43cNk2KjAE70iRYUTadS1eYCfvZA84H2G7uMQ',
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
    };

    const nextBookings = [...customBookings, newAccom];
    setCustomBookings(nextBookings);

    // Auto-link: run the matcher immediately. Exactly one matching segment → link it.
    // Multiple matches are stored as suggestions (rendered via getStayLinkInfo).
    const matchingStays = getMatchingStaysForBooking(newAccom, currentTrip.stays);
    let updatedStays = currentTrip.stays;
    let updatedLinks: Record<string, string> | null = null;

    if (matchingStays.length === 1) {
      const matchedStay = matchingStays[0].stay;
      updatedLinks = {
        ...stayBookingLinks,
        [matchedStay.id]: newAccom.id,
      };
      updatedStays = currentTrip.stays.map((s) =>
        s.id === matchedStay.id ? { ...s, accommodationName: newAccom.name } : s
      );
      setStayBookingLinks(updatedLinks);
      try {
        localStorage.setItem('athena_stay_booking_links', JSON.stringify(updatedLinks));
      } catch (e) {
        console.error("Failed to save stay-booking links", e);
      }
    } else if (booking.island) {
      updatedStays = currentTrip.stays.map((s) =>
        s.island.toLowerCase() === booking.island?.toLowerCase()
          ? { ...s, accommodationName: booking.name }
          : s
      );
    }

    updateAndSaveTrip(
      {
        ...currentTrip,
        stays: updatedStays,
      },
      nextBookings,
      updatedLinks !== null ? updatedLinks : stayBookingLinks
    );

    handleSendMessage(
      `Ik heb een accommodatie toegevoegd voor ${booking.island || booking.location}: ${booking.name} (€${booking.pricePerNight || 150}/nacht, Status: ${booking.status}). Update mijn reis- en dagschema!`
    );
  };

  const handleDeleteCustomBooking = (id: string) => {
    const nextBookings = customBookings.filter((b) => b.id !== id);
    setCustomBookings(nextBookings);

    // Remove any links that referenced the deleted booking
    const nextLinks: Record<string, string> = {};
    for (const [stayId, bookingId] of Object.entries(stayBookingLinks)) {
      if (bookingId !== id) nextLinks[stayId] = bookingId;
    }
    setStayBookingLinks(nextLinks);
    try {
      localStorage.setItem('athena_stay_booking_links', JSON.stringify(nextLinks));
    } catch (e) {
      console.error("Failed to save stay-booking links", e);
    }

    updateAndSaveTrip(currentTrip, nextBookings, nextLinks);
  };

  const handleLinkStayBooking = (stayId: string, bookingId: string) => {
    const next = { ...stayBookingLinks, [stayId]: bookingId };
    setStayBookingLinks(next);
    try {
      localStorage.setItem('athena_stay_booking_links', JSON.stringify(next));
    } catch (e) {
      console.error("Failed to save stay-booking links", e);
    }

    const booking = customBookings.find((b) => b.id === bookingId);
    if (booking) {
      const updatedStays = currentTrip.stays.map((s) =>
        s.id === stayId ? { ...s, accommodationName: booking.name } : s
      );
      updateAndSaveTrip({ ...currentTrip, stays: updatedStays }, undefined, next);
    }
  };

  const handleUnlinkStayBooking = (stayId: string) => {
    const next: Record<string, string> = {};
    for (const [id, bookingId] of Object.entries(stayBookingLinks)) {
      if (id !== stayId) next[id] = bookingId;
    }
    setStayBookingLinks(next);
    try {
      localStorage.setItem('athena_stay_booking_links', JSON.stringify(next));
    } catch (e) {
      console.error("Failed to save stay-booking links", e);
    }

    updateAndSaveTrip(currentTrip, undefined, next);
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
      sessionId,
      savedAt: new Date().toISOString(),
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
    appendHistory([userMsg]);

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
        sessionId,
        savedAt: new Date().toISOString(),
        content: data.reply || `Kalimera ${sender}! High-speed ferries en de gecureerde eilandschema's voor ${currentTrip.title} zijn bijgewerkt.`,
        quickButtons: data.tripUpdate
          ? currentUser
            ? [{ label: ' Bekijk Mijn Reis', action: '/travel' }]
            : [{ label: ' Inloggen om Opslaan Goed te keuren', action: 'login' }]
          : undefined,
        sources: data.sources,
      };

      appendHistory([aiMsg]);
    } catch {
      const fallbackAiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        senderName: 'Athena',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sessionId,
        savedAt: new Date().toISOString(),
        content: `Kalimera ${sender}! Ik heb je bericht of geüploade reisplan ontvangen en je dagschema bijgewerkt voor ${currentTrip.title}.`,
        quickButtons: [{ label: ' Bekijk Mijn Reis', action: '/travel' }],
      };
      appendHistory([fallbackAiMsg]);
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
    // A new trip starts with no booked accommodations or links. Reset state and
    // persist the fresh state to the Google Sheet so the DB matches the new trip.
    setCustomBookings([]);
    setStayBookingLinks({});
    try {
      localStorage.setItem('athena_stay_booking_links', JSON.stringify({}));
    } catch (e) {
      console.error("Failed to clear stay-booking links", e);
    }

    updateAndSaveTrip(newTrip, [], {});
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
            stayBookingLinks={stayBookingLinks}
            onLinkStayBooking={handleLinkStayBooking}
            onUnlinkStayBooking={handleUnlinkStayBooking}
            transportEntries={transportEntries}
            onAddTransportEntry={addTransportEntry}
            onUpdateTransportEntry={updateTransportEntry}
            onDeleteTransportEntry={deleteTransportEntry}
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
            onFindPharmacy={() => {
              openChat("Athena, where is the nearest open pharmacy in Naxos Chora?");
            }}
            isGuestMode={isGuestMode}
          />
        )}

        {activeTab === 'chat' && (
          <ChatInterfaceView
            chatSubTab={chatSubTab}
            setChatSubTab={setChatSubTab}
            messages={messages}
            historyMessages={chatHistory}
            favorites={favorites}
            onSendMessage={handleSendMessage}
            onTriggerQuickAction={handleTriggerQuickAction}
            onToggleFavorite={handleToggleFavorite}
            onRemoveFavorite={handleRemoveFavorite}
            onDeleteSession={handleDeleteSession}
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
        onRequestHelp={(op) => {
          handleSendMessage(
            `We hebben waarschijnlijk de veerboot gemist. Athena, zoek de eerstvolgende alternatieve vertrekken vanaf ${currentTrip.stays[0]?.island || 'ons huidige eiland'} en geef opties. We keken net naar de ${op}.`
          );
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
