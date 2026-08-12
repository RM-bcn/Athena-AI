import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatSubTab, TripData } from '../types';
import { CHAT_BACKGROUND_IMAGE } from '../data/initialData';
import {
  Sailboat,
  Sparkles,
  Ship,
  Languages,
  Map,
  Paperclip,
  Mic,
  ArrowUp,
  Clock,
  Send,
  Loader2,
  FileText,
  X,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { WeatherCard } from './WeatherCard';

interface ChatInterfaceViewProps {
  chatSubTab: ChatSubTab;
  messages: ChatMessage[];
  onSendMessage: (text: string, attachment?: { name: string; type: string; base64?: string; text?: string; isImage?: boolean }) => Promise<void>;
  onTriggerQuickAction: (action: string) => void;
  currentTrip: TripData;
}

export const ChatInterfaceView: React.FC<ChatInterfaceViewProps> = ({
  chatSubTab,
  messages,
  onSendMessage,
  onTriggerQuickAction,
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

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

    const text = inputText.trim() || (attachedFile ? `[Document/Bijlage Uploaded: ${attachedFile.name}] Pas mijn reisplan a.u.b. automatisch aan.` : '');
    const currentAttachment = attachedFile;

    setInputText('');
    setAttachedFile(null);
    setIsSending(true);

    try {
      await onSendMessage(text, currentAttachment || undefined);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col md:ml-64 pt-16 md:pt-20 relative min-h-screen bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.96)), url('${CHAT_BACKGROUND_IMAGE}')`
      }}
    >
      {/* Floating Weather Card on Top Right */}
      <WeatherCard trip={currentTrip} variant="floating" />

      {/* Main Chat Conversation Space */}
      <div className="flex-1 flex flex-col pt-24 px-4 md:px-12 pb-24 md:pb-44 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full space-y-8 py-6">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-4 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              {msg.role === 'assistant' ? (
                <div className="w-10 h-10 rounded-full bg-[#005BAE] flex-shrink-0 flex items-center justify-center text-white mt-1 shadow-md">
                  <Sailboat className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#f0f4f9] flex-shrink-0 overflow-hidden mt-1 shadow-sm border border-[#005BAE]/20">
                  <img
                    src={msg.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0ruwA2ULiUXslSNEkdMRmxxDJZdyJ3o9diwVU8Zr5YC_87GWALt7tpdexyLGagepnOhOpbaMGsZPUPt0AJ9zeMzT-nUfcqne6y9eLajmKKjVY8RqY414wGfnr0N4r1JhkBh5OJhoHsDiJpTj5ONzHIb-beF-telmiq3OUvjxEOfINr1HLXb6SbJhO_TEPtKOXiIVyG9qX5N2w-nuAXjOjdVjRRd1d0K85u0tChf-zGRBpD13KWAeGwQ'}
                    alt={msg.senderName || 'User'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Message Content */}
              <div
                className={`flex flex-col gap-2 ${
                  msg.role === 'user' ? 'items-end max-w-[80%]' : 'max-w-[88%]'
                }`}
              >
                <div
                  className={`p-5 rounded-3xl shadow-sm border ${
                    msg.role === 'user'
                      ? 'bg-[#005BAE] text-white rounded-br-sm border-[#005BAE]'
                      : 'bg-white text-[#001a33] rounded-bl-sm border-[#f0f4f9]'
                  }`}
                >
                  {/* Message Attachment Rendering */}
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

                  {/* Live Search Source Links */}
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

                  {/* Interactive Cards Bento Grid */}
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

                  {/* Quick Action Buttons inside Assistant Message */}
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

                <span className="text-[11px] font-['Inter'] text-[#717783] px-2">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

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

      {/* Bottom Floating Interaction Bar */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 p-4 md:p-8 bg-gradient-to-t from-white via-white/90 to-transparent z-40">
        <div className="max-w-3xl mx-auto">
          {/* Quick Action Chips */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
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
              <Map className="w-4 h-4" />
              /travel
            </button>
          </div>

          {/* Staged Attached File Chip Preview */}
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

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.doc,.docx,.json,.csv,.md"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Input Box Glass Panel */}
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
    </div>
  );
};
