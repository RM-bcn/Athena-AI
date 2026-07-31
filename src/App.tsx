import React, { useState } from 'react';
import { ActiveTab, ChatSubTab, ChatMessage, TripData, Accommodation } from './types';
import { initialChatMessages } from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { MyItineraryView } from './components/MyItineraryView';
import { QuickHelpView } from './components/QuickHelpView';
import { ChatInterfaceView } from './components/ChatInterfaceView';
import { SettingsView } from './components/SettingsView';
import { SupportView } from './components/SupportView';

// Modals
import { NewTripModal } from './components/Modals/NewTripModal';
import { MissedFerryModal } from './components/Modals/MissedFerryModal';
import { TranslateMenuModal } from './components/Modals/TranslateMenuModal';
import { AddBookingModal } from './components/Modals/AddBookingModal';
import { ShareModal } from './components/Modals/ShareModal';

// Initial default trip data with detailed stays and dates
const defaultTrip: TripData = {
  id: 'trip-1',
  title: 'Cyclades Island Hopping',
  startDate: '2026-08-15',
  endDate: '2026-08-23',
  durationDays: 8,
  style: 'Adventurous',
  stays: [
    {
      id: 'stay-1',
      island: 'Milos',
      startDate: '2026-08-15',
      endDate: '2026-08-18',
      nights: 3,
      accommodationName: 'Milos Breeze Boutique',
    },
    {
      id: 'stay-2',
      island: 'Naxos',
      startDate: '2026-08-18',
      endDate: '2026-08-21',
      nights: 3,
      accommodationName: 'Nissaki Beach Hotel',
    },
    {
      id: 'stay-3',
      island: 'Koufonisia',
      startDate: '2026-08-21',
      endDate: '2026-08-23',
      nights: 2,
    },
  ],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('itinerary');
  const [chatSubTab, setChatSubTab] = useState<ChatSubTab>('current');
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [currentTrip, setCurrentTrip] = useState<TripData>(defaultTrip);

  // Modal States
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [isMissedFerryOpen, setIsMissedFerryOpen] = useState(false);
  const [isTranslateMenuOpen, setIsTranslateMenuOpen] = useState(false);
  const [isAddBookingOpen, setIsAddBookingOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<'manual' | 'trivago'>('manual');
  const [bookingIsland, setBookingIsland] = useState<string | undefined>(undefined);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [customBookings, setCustomBookings] = useState<Accommodation[]>([]);

  const handleOpenAddBooking = (mode: 'manual' | 'trivago' = 'manual', island?: string) => {
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

    setCustomBookings(prev => [...prev, newAccom]);

    // If linked to an island in current trip, update stay's accommodation name
    if (booking.island) {
      setCurrentTrip(prev => ({
        ...prev,
        stays: prev.stays.map(s =>
          s.island.toLowerCase() === booking.island?.toLowerCase()
            ? { ...s, accommodationName: booking.name }
            : s
        ),
      }));
    }

    handleSendMessage(
      `Ik heb een accommodatie toegevoegd voor ${booking.island || booking.location}: ${booking.name} (€${booking.pricePerNight || 150}/nacht, Status: ${booking.status}). Update mijn reis- en dagschema!`
    );
  };

  const handleDeleteCustomBooking = (id: string) => {
    setCustomBookings(prev => prev.filter(b => b.id !== id));
  };

  // Send message to backend Gemini API concierge
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      senderName: 'Alexandros P.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: text,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          context: `Greek Island Hopping: ${currentTrip.title} (${currentTrip.stays.map(s => `${s.island}: ${s.startDate} tot ${s.endDate}`).join(', ')})`,
        }),
      });

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        senderName: 'Athena',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: data.reply || "Yassou! High-speed ferries and personalized daily stays are updated for your trip.",
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const fallbackAiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        senderName: 'Athena',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `Kalimera! I've analyzed your itinerary for ${currentTrip.title}. Your stays in ${currentTrip.stays.map(s => s.island).join(', ')} are set.`,
      };
      setMessages(prev => [...prev, fallbackAiMsg]);
    }
  };

  // Quick Action Chips Trigger
  const handleTriggerQuickAction = (action: string) => {
    if (action === 'Ferry Status' || action.includes('ferry')) {
      setIsMissedFerryOpen(true);
    } else if (action === 'Translate Menu' || action.includes('menu')) {
      setIsTranslateMenuOpen(true);
    } else if (action === '/plan' || action.includes('/plan')) {
      setActiveTab('chat');
      handleSendMessage("Athena, please generate a detailed daily /plan for my Cyclades island hopping itinerary!");
    } else if (action === '/travel' || action.includes('/travel')) {
      setActiveTab('itinerary');
    } else {
      setActiveTab('chat');
      handleSendMessage(action);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleCreateTrip = (newTrip: TripData) => {
    setCurrentTrip(newTrip);
    setActiveTab('itinerary');
    
    const staySummary = newTrip.stays
      .map(s => `${s.island} (${s.startDate} - ${s.endDate}, ${s.nights} nachten)`)
      .join(', ');

    handleSendMessage(
      `Ik heb zojuist een nieuwe trip aangemaakt: "${newTrip.title}" met de volgende verblijven: ${staySummary}. Pas mijn dagschema aan!`
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#0b1d2d] flex font-['Inter']">
      {/* Permanent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTrip={() => setIsNewTripOpen(true)}
      />

      {/* Top Navigation Header */}
      <TopHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        chatSubTab={chatSubTab}
        setChatSubTab={setChatSubTab}
        userName="Alexandros P."
        onOpenProfile={() => setActiveTab('settings')}
      />

      {/* View Content based on Active Tab */}
      <div className="flex-1 w-full">
        {activeTab === 'itinerary' && (
          <MyItineraryView
            currentTrip={currentTrip}
            onOpenChat={() => setActiveTab('chat')}
            onOpenNewBooking={handleOpenAddBooking}
            onShare={() => setIsShareOpen(true)}
            onExportPDF={handleExportPDF}
            onOpenNewTripModal={() => setIsNewTripOpen(true)}
            customBookings={customBookings}
            onDeleteCustomBooking={handleDeleteCustomBooking}
          />
        )}

        {activeTab === 'quick-help' && (
          <QuickHelpView
            onOpenMissedFerry={() => setIsMissedFerryOpen(true)}
            onOpenTranslateMenu={() => setIsTranslateMenuOpen(true)}
            onOpenTavernas={() => {
              setActiveTab('chat');
              handleSendMessage("Athena, can you recommend authentic local tavernas in Naxos and Milos within walking distance?");
            }}
            onOpenBeaches={() => {
              setActiveTab('chat');
              handleSendMessage("Athena, where are the quietest secluded beaches in Koufonisia and Naxos?");
            }}
            onOpenChat={() => setActiveTab('chat')}
            onTriggerEmergency={() => alert("🚨 Emergency Service: Calling 112 (European Emergency Services in Greece)...")}
            onCallTaxi={() => alert("🚕 Taxi Desk: Contacting Naxos & Milos Port Radio Taxi Service (+30 22850 22444)...")}
            onFindPharmacy={() => {
              setActiveTab('chat');
              handleSendMessage("Athena, where is the nearest open pharmacy in Naxos Chora?");
            }}
          />
        )}

        {activeTab === 'chat' && (
          <ChatInterfaceView
            chatSubTab={chatSubTab}
            messages={messages}
            onSendMessage={handleSendMessage}
            onTriggerQuickAction={handleTriggerQuickAction}
          />
        )}

        {activeTab === 'settings' && <SettingsView />}

        {activeTab === 'support' && <SupportView />}
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
      />
    </div>
  );
}
