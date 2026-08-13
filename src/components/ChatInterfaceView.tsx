import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage, ChatFavorite, ChatSubTab, TripData } from '../types';
import localBackgroundImage from '../assets/images/greece_sunset_bg_1785583337875.jpg';
import {
  Sailboat,
  Sparkles,
  Ship,
  Languages,
  Map as MapIcon,
  Paperclip,
  Mic,
  ArrowUp,
  Loader2,
  FileText,
  X,
  Star,
  History,
  Inbox,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { WeatherCard } from './WeatherCard';
import { extractTextFromImage } from '../utils/ocr';

interface ChatInterfaceViewProps {
  chatSubTab: ChatSubTab;
  setChatSubTab: (subTab: ChatSubTab) => void;
  messages: ChatMessage[];
  historyMessages: ChatMessage[];
  favorites: ChatFavorite[];
  onSendMessage: (text: string, attachment?: { name: string; type: string; base64?: string; text?: string; isImage?: boolean }) => Promise<void>;
  onTriggerQuickAction: (action: string) => void;
  onToggleFavorite: (msg: ChatMessage) => void;
  onRemoveFavorite: (id: string) => void;
  onDeleteSession: (sessionId: string) => void;
  currentTrip: TripData;
}

export const ChatInterfaceView: React.FC<ChatInterfaceViewProps> = ({
  chatSubTab,
  setChatSubTab,
  messages,
  historyMessages,
  favorites,
  onSendMessage,
  onTriggerQuickAction,
  onToggleFavorite,
  onRemoveFavorite,
  onDeleteSession,
  currentTrip,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: string;
    base64?: string;
    text?: string;
    isImage?: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(() => {
    const saved = new Set<string>();
    try {
      const raw = localStorage.getItem('athena_expanded_sessions');
      if (raw) {
        JSON.parse(raw).forEach((id: string) => saved.add(id));
      }
    } catch {
      // localStorage niet beschikbaar
    }
    return saved;
  });

  const toggleSessionExpanded = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      try {
        localStorage.setItem('athena_expanded_sessions', JSON.stringify(Array.from(next)));
      } catch {
        // localStorage vol of niet beschikbaar
      }
      return next;
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const favoriteIds = useMemo(() => new Set(favorites.map(f => f.id)), [favorites]);

  const sessions = useMemo(() => {
    const map = new Map<string, ChatMessage[]>();
    for (const m of historyMessages) {
      const key = m.sessionId || 'onbekend';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).reverse();
  }, [historyMessages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const reader = new FileReader();

    if (isImg) {
      reader.onload = () => {
        setAttachedFile({
          name: file.name,
          type: file.type,
          base64: reader.result as string,
          isImage: true,
        });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        setAttachedFile({
          name: file.name,
          type: file.type || 'text/plain',
          text: reader.result as string,
          isImage: false,
        });
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachedFile) || isSending) return;

    const currentAttachment = attachedFile;
    let attachmentToSend = currentAttachment;
    let ocrNote = '';

    if (currentAttachment?.isImage && currentAttachment.base64 && !currentAttachment.text) {
      try {
        const ocrText = await extractTextFromImage(currentAttachment.base64);
        if (ocrText) {
          attachmentToSend = { ...currentAttachment, text: ocrText };
          ocrNote = ' (tekst gelezen van foto)';
        }
      } catch (ocrErr) {
        console.error(ocrErr);
      }
    }

    const text =
      inputText.trim() ||
      (attachmentToSend?.isImage
        ? `Vertaal deze foto van een menukaart naar Nederlands en leg de gerechten uit.${ocrNote}`
        : `[Document/Bijlage Uploaded: ${attachmentToSend?.name}] Pas mijn reisplan a.u.b. automatisch aan.`);

    setInputText('');
    setAttachedFile(null);
    setIsSending(true);

    try {
      await onSendMessage(text, attachmentToSend || undefined);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = (msg: ChatMessage) => (
    <div
      key={msg.id}
      className={`flex gap-2.5 md:gap-4 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
    >
      {msg.role === 'assistant' ? (
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#005BAE] flex-shrink-0 flex items-center justify-center text-white mt-1 shadow-md">
          <Sailboat className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      ) : (
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#f0f4f9] flex-shrink-0 overflow-hidden mt-1 shadow-sm border border-[#005BAE]/20">
          <img
            src={msg.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0ruwA2ULiUXslSNEkdMRmxxDJZdyJ3o9diwVU8Zr5YC_87GWALt7tpdexyLGagepnOhOpbaMGsZPUPt0AJ9zeMzT-nUfcqne6y9eLajmKKjVY8RqY414wGfnr0N4r1JhkBh5OJhoHsDiJpTj5ONzHIb-beF-telmiq3OUvjxEOfINr1HLXbJhO_TEPtKOXiIVyG9qX5J2w-nuAXjOjdVjRRdJ1K85u0tChf-zGRBpD13KWAeGwQ'}
            alt={msg.senderName || 'User'}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div
        className={`flex flex-col gap-2 ${
          msg.role === 'user' ? 'items-end max-w-[85%] md:max-w-[80%]' : 'max-w-[88%] md:max-w-[88%]'
        }`}
      >
        <div
          className={`p-4 md:p-5 rounded-3xl shadow-sm border ${
            msg.role === 'user'
              ? 'bg-[#005BAE] text-white rounded-br-sm border-[#005BAE]'
              : 'bg-white text-[#001a33] rounded-bl-sm border-[#f0f4f9]'
          }`}
        >
          {msg.attachment && (
            <div className="mb-3">
              {msg.attachment.isImage && msg.attachment.url ? (
                <div className="max-w-xs rounded-2xl overflow-hidden border border-white/20 shadow-md mb-2">
                  <img src={msg.attachment.url} alt={msg.attachment.name} className="w-full h-auto object-cover max-h-60" />
                  <div className="p-2 bg-black/40 text-[10px] text-white backdrop-blur-sm truncate">
                    📷 {msg.attachment.name}
                  </div>
                </div>
              ) : (
                <div className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm ${
                  msg.role === 'user' ? 'bg-white/15 text-white border border-white/30' : 'bg-blue-50 text-[#005BAE] border border-[#005BAE]/20'
                }`}>
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{msg.attachment.name}</span>
                </div>
              )}
            </div>
          )}

          <p className="font-['Inter'] text-sm md:text-base leading-relaxed whitespace-pre-line">
            {msg.content}
          </p>

          {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#e4efff]">
              <span className="font-['Inter'] text-[10px] font-bold uppercase tracking-wider text-[#717783]">
                Bronnen · live DuckDuckGo zoekresultaten
              </span>
              <div className="flex flex-col gap-1.5 mt-2">
                {msg.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-['Inter'] text-[#005BAE] hover:underline truncate"
                    title={src.url}
                  >
                    {src.title || src.url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {msg.cards && msg.cards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {msg.cards.map(card => (
                <div
                  key={card.id}
                  onClick={() => onTriggerQuickAction(`/plan ${card.title}`)}
                  className="p-3.5 rounded-2xl bg-[#f7f9ff] border border-[#c0c7d3]/30 flex flex-col gap-2.5 group/card hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="h-32 rounded-xl overflow-hidden relative shadow-sm">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                      <span className="font-['Inter'] text-xs font-bold text-[#005BAE]">
                        {card.days}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-['Inter'] text-sm font-bold text-[#001a33]">
                      {card.title}
                    </h4>
                    <p className="text-xs text-[#404752] mt-0.5">
                      {card.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {msg.quickButtons && msg.quickButtons.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              {msg.quickButtons.map((btn, idx) => (
                <button
                  key={idx}
                  onClick={() => onTriggerQuickAction(btn.action)}
                  className={`font-['Inter'] text-xs font-semibold px-5 py-2 rounded-full transition-all cursor-pointer ${
                    idx === 0
                      ? 'bg-[#005BAE] text-white hover:brightness-110 shadow-sm'
                      : 'border border-[#005BAE] text-[#005BAE] hover:bg-[#005BAE]/5'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-2">
          <span className="text-[11px] font-['Inter'] text-[#717783]">
            {msg.timestamp}
          </span>
          {msg.role === 'assistant' && (
            <button
              onClick={() => onToggleFavorite(msg)}
              className={`p-1 rounded-full transition-colors cursor-pointer ${
                favoriteIds.has(msg.id)
                  ? 'text-amber-400 hover:text-amber-500'
                  : 'text-[#c0c7d3] hover:text-amber-400'
              }`}
              title={favoriteIds.has(msg.id) ? 'Verwijder uit favorieten' : 'Opslaan als favoriet'}
            >
              <Star className={`w-3.5 h-3.5 ${favoriteIds.has(msg.id) ? 'fill-amber-400' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const formatSavedAt = (savedAt?: string) => {
    if (!savedAt) return '';
    const d = new Date(savedAt);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="flex-1 flex flex-col md:ml-64 pt-16 md:pt-20 relative min-h-screen bg-cover bg-center"
      style={{
        backgroundImage: [
          'linear-gradient(180deg, rgba(236, 248, 255, 0.58) 0%, rgba(248, 251, 255, 0.78) 54%, rgba(255, 255, 255, 0.94) 100%)',
          'linear-gradient(115deg, rgba(0, 91, 174, 0.12), rgba(226, 114, 91, 0.10))',
          `url('${localBackgroundImage}')`,
        ].join(', '),
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <WeatherCard trip={currentTrip} variant="floating" />

      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-[#f0f4f9] px-2 py-2">
        <div className="flex gap-1.5 rounded-2xl bg-[#f0f4f9] p-1">
          {([
            { key: 'current', label: 'Chat' },
            { key: 'history', label: 'Geschiedenis' },
            { key: 'favorites', label: 'Favorieten' },
          ] as { key: ChatSubTab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setChatSubTab(key)}
              className={`flex-1 py-2 rounded-xl font-['Inter'] text-xs font-semibold transition-all cursor-pointer ${
                chatSubTab === key
                  ? 'bg-[#005BAE] text-white shadow-sm'
                  : 'text-[#404752] hover:text-[#005BAE]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {chatSubTab === 'current' && (
        <>
          <div className="flex-1 flex flex-col pt-16 md:pt-24 px-4 md:px-12 pb-40 md:pb-44 overflow-y-auto">
            <div className="max-w-3xl mx-auto w-full space-y-8 py-6">
              {messages.map(renderMessage)}

              {isSending && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#005BAE] flex-shrink-0 flex items-center justify-center text-white shadow-md">
                    <Sailboat className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="p-4 rounded-3xl bg-white border border-[#f0f4f9] shadow-sm flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#005BAE] animate-spin" />
                    <span className="font-['Inter'] text-sm text-[#404752]">Athena is planning your itinerary...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div
            className="fixed bottom-0 left-0 md:left-64 right-0 p-3 md:p-8 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-8 bg-gradient-to-t from-white via-white/90 to-transparent z-40"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2 mb-3 md:mb-4 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => onTriggerQuickAction('/plan')}
                  className="flex items-center gap-2 px-4 py-2 bg-[#005BAE] text-white rounded-full font-['Inter'] text-xs font-medium hover:brightness-110 transition-colors whitespace-nowrap shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  /plan
                </button>

                <button
                  onClick={() => onTriggerQuickAction('Ferry Status')}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-[#005BAE] border border-[#005BAE]/20 rounded-full font-['Inter'] text-xs font-medium hover:bg-[#f0f4f9] transition-colors whitespace-nowrap cursor-pointer shadow-sm"
                >
                  <Ship className="w-4 h-4" />
                  Ferry Status
                </button>

                <button
                  onClick={() => onTriggerQuickAction('Translate Menu')}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-[#005BAE] border border-[#005BAE]/20 rounded-full font-['Inter'] text-xs font-medium hover:bg-[#f0f4f9] transition-colors whitespace-nowrap cursor-pointer shadow-sm"
                >
                  <Languages className="w-4 h-4" />
                  Translate Menu
                </button>

                <button
                  onClick={() => onTriggerQuickAction('/travel')}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-[#005BAE] border border-[#005BAE]/20 rounded-full font-['Inter'] text-xs font-medium hover:bg-[#f0f4f9] transition-colors whitespace-nowrap cursor-pointer shadow-sm"
                >
                  <MapIcon className="w-4 h-4" />
                  /travel
                </button>
              </div>

              {attachedFile && (
                <div className="mb-3 px-4 py-2 bg-[#005BAE]/10 border border-[#005BAE]/30 rounded-2xl flex items-center justify-between text-xs font-['Inter'] text-[#005BAE] shadow-sm animate-fadeIn">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="font-bold truncate">{attachedFile.name}</span>
                    <span className="text-[10px] text-gray-500">({attachedFile.isImage ? 'Afbeelding' : 'Document'})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-1 hover:bg-[#005BAE]/20 rounded-full transition-colors text-[#005BAE]"
                    title="Verwijder bijlage"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.doc,.docx,.json,.csv,.md"
                onChange={handleFileChange}
                className="hidden"
              />

              <form
                onSubmit={handleSubmit}
                className="bg-white/90 backdrop-blur-md rounded-3xl p-2.5 flex items-center gap-2 shadow-[0_20px_50px_rgba(0,91,174,0.1)] border border-[#005BAE]/15"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-[#404752] hover:text-[#005BAE] transition-colors rounded-full hover:bg-[#f0f4f9] cursor-pointer"
                  title="Upload reisplan, document of foto"
                >
                  <Paperclip className="w-5 h-5 text-[#005BAE]" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={attachedFile ? `Voeg eventueel een toelichting toe voor ${attachedFile.name}...` : "Stel een vraag of upload je reisplan/ticket..."}
                  className="flex-1 bg-transparent border-none focus:outline-none font-['Inter'] text-sm text-[#001a33] px-2 placeholder:text-[#717783]"
                />

                <button
                  type="button"
                  className="p-3 text-[#404752] hover:text-[#005BAE] transition-colors rounded-full hover:bg-[#f0f4f9] cursor-pointer"
                  title="Voice prompt"
                >
                  <Mic className="w-5 h-5" />
                </button>

                <button
                  type="submit"
                  disabled={(!inputText.trim() && !attachedFile) || isSending}
                  className="w-11 h-11 rounded-2xl bg-[#005BAE] text-white flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all shadow-md cursor-pointer"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {chatSubTab === 'history' && (
        <div className="flex-1 flex flex-col pt-16 md:pt-24 px-4 md:px-12 pb-16 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full space-y-6 py-6">
            <div className="flex items-center gap-2 text-[#005BAE]">
              <History className="w-5 h-5" />
              <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">Chatgeschiedenis</h2>
            </div>

            {sessions.length === 0 && (
              <div className="p-10 bg-white/80 backdrop-blur-sm rounded-3xl border border-[#005BAE]/15 text-center">
                <Inbox className="w-10 h-10 text-[#c0c7d3] mx-auto mb-3" />
                <p className="font-['Inter'] text-sm text-[#404752]">
                  Nog geen eerdere gesprekken. Je chats worden automatisch bewaard.
                </p>
              </div>
            )}

            {sessions.map(([sessionId, sessionMessages]) => {
              const isExpanded = expandedSessions.has(sessionId);
              return (
                <div key={sessionId} className="bg-white/90 backdrop-blur-sm rounded-3xl border border-[#005BAE]/15 shadow-sm overflow-hidden">
                  <div
                    onClick={() => toggleSessionExpanded(sessionId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSessionExpanded(sessionId);
                      }
                    }}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-[#f0f4f9]/60 transition-colors cursor-pointer"
                    title={isExpanded ? 'Verberg berichten' : 'Toon berichten'}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronDown
                        className={`w-4 h-4 text-[#005BAE] flex-shrink-0 transition-transform duration-200 ${
                          isExpanded ? '' : '-rotate-90'
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="block font-['Inter'] text-[10px] font-bold uppercase tracking-wider text-[#717783]">
                          {formatSavedAt(sessionMessages[0]?.savedAt) || 'Eerdere sessie'}
                        </span>
                        <span className="block font-['Inter'] text-xs text-[#404752] mt-0.5 truncate">
                          {sessionMessages[0]?.content || 'Geen berichten'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-['Inter'] text-[10px] text-[#c0c7d3] whitespace-nowrap">
                        {sessionMessages.length} berichten
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Weet je zeker dat je dit gesprek uit de geschiedenis wilt verwijderen?')) {
                            onDeleteSession(sessionId);
                          }
                        }}
                        className="p-1.5 text-[#c0c7d3] hover:text-red-500 rounded-full transition-colors cursor-pointer"
                        title="Verwijder gesprek uit geschiedenis"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="space-y-3 px-5 pb-5">
                      {sessionMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                              msg.role === 'user'
                                ? 'bg-[#005BAE] text-white rounded-br-sm'
                                : 'bg-[#f0f6ff] text-[#001a33] rounded-bl-sm border border-[#005BAE]/10'
                            }`}
                          >
                            <span className="block font-bold mb-0.5 opacity-70">
                              {msg.role === 'user' ? msg.senderName || 'Jij' : 'Athena'}
                            </span>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {chatSubTab === 'favorites' && (
        <div className="flex-1 flex flex-col pt-16 md:pt-24 px-4 md:px-12 pb-16 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full space-y-6 py-6">
            <div className="flex items-center gap-2 text-[#005BAE]">
              <Star className="w-5 h-5" />
              <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold">Favorieten</h2>
            </div>

            {favorites.length === 0 && (
              <div className="p-10 bg-white/80 backdrop-blur-sm rounded-3xl border border-[#005BAE]/15 text-center">
                <Star className="w-10 h-10 text-[#c0c7d3] mx-auto mb-3" />
                <p className="font-['Inter'] text-sm text-[#404752]">
                  Nog geen favorieten. Klik op de ster bij een antwoord van Athena om het hier te bewaren.
                </p>
              </div>
            )}

            {favorites.map(fav => (
              <div
                key={fav.id}
                onClick={() => {
                  if (window.confirm('Weet je zeker dat je dit antwoord uit je favorieten wilt verwijderen?')) {
                    onRemoveFavorite(fav.id);
                  }
                }}
                className="bg-white/90 backdrop-blur-sm rounded-3xl border border-[#005BAE]/15 shadow-sm p-5 space-y-3 hover:border-red-400/60 hover:shadow-md transition-all cursor-pointer group/fav"
                title="Klik om uit favorieten te verwijderen"
              >
                <div className="flex items-center justify-between">
                  <span className="font-['Inter'] text-[10px] font-bold uppercase tracking-wider text-[#717783]">
                    {formatSavedAt(fav.savedAt)} · Athena
                  </span>
                  <span className="flex items-center gap-1.5 text-[#c0c7d3] group-hover/fav:text-red-500 text-[11px] font-['Inter'] font-semibold transition-colors">
                    <X className="w-3.5 h-3.5" />
                    Verwijderen
                  </span>
                </div>
                <p className="font-['Inter'] text-sm text-[#001a33] leading-relaxed whitespace-pre-line">
                  {fav.content}
                </p>
                {fav.sources && fav.sources.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {fav.sources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-['Inter'] text-[#005BAE] hover:underline truncate"
                      >
                        {src.title || src.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
