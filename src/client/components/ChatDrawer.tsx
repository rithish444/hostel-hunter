import React, { useState } from 'react';
import { useGame } from '../context/GameContext.js';
import { X, Send, Radio, MessageSquare, Megaphone, Shield } from 'lucide-react';

interface ChatDrawerProps {
  onClose: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ onClose }) => {
  const { gameState, player, sendChat } = useGame();
  const [activeChannel, setActiveChannel] = useState<'all' | 'hunters' | 'announcements'>('all');
  const [inputText, setInputText] = useState('');

  if (!gameState || !player) return null;

  const isHunter = player.role === 'hunter';
  const isHost = player.isHost;

  const filteredMessages = (gameState.chatMessages || []).filter((msg) => {
    if (activeChannel === 'all') return msg.channel === 'all';
    if (activeChannel === 'hunters') return msg.channel === 'hunters';
    if (activeChannel === 'announcements') return msg.channel === 'announcements';
    return true;
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    await sendChat(inputText.trim(), activeChannel);
    setInputText('');
  };

  const handleQuickTemplate = (text: string) => {
    sendChat(text, activeChannel);
  };

  return (
    <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex justify-end select-none">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Tactical Communications
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Channel Switcher */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/60 text-xs font-mono font-bold">
          <button
            onClick={() => setActiveChannel('all')}
            className={`py-2.5 transition flex items-center justify-center gap-1.5 ${
              activeChannel === 'all'
                ? 'border-b-2 border-cyan-400 text-cyan-400 bg-slate-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            #All
          </button>

          {(isHunter || isHost) && (
            <button
              onClick={() => setActiveChannel('hunters')}
              className={`py-2.5 transition flex items-center justify-center gap-1.5 ${
                activeChannel === 'hunters'
                  ? 'border-b-2 border-red-500 text-red-400 bg-red-950/30'
                  : 'text-slate-400 hover:text-red-300'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-red-500" />
              #Hunters
            </button>
          )}

          <button
            onClick={() => setActiveChannel('announcements')}
            className={`py-2.5 transition flex items-center justify-center gap-1.5 ${
              activeChannel === 'announcements'
                ? 'border-b-2 border-amber-400 text-amber-400 bg-slate-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            #HQ
          </button>
        </div>

        {/* Quick Tactical Templates */}
        <div className="p-2 bg-slate-950/80 border-b border-slate-800 flex gap-1.5 overflow-x-auto text-[11px] whitespace-nowrap">
          <button
            onClick={() => handleQuickTemplate('I hear footsteps near stairwell!')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700"
          >
            👣 Footsteps near stairs!
          </button>
          <button
            onClick={() => handleQuickTemplate('Regroup at Ground Floor Lobby!')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700"
          >
            🏛️ Regroup at Lobby!
          </button>
          <button
            onClick={() => handleQuickTemplate('Hunter spotted on Floor 2!')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700"
          >
            🚨 Hunter spotted F2!
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-10 font-mono">
              No transmissions on #{activeChannel} yet.
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMine = msg.senderId === player.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mb-0.5">
                    <span className="font-bold text-slate-300">{msg.senderName}</span>
                    {msg.senderRole && (
                      <span
                        className={`text-[8px] px-1 rounded uppercase font-bold ${
                          msg.senderRole === 'hunter'
                            ? 'bg-red-900/60 text-red-300'
                            : 'bg-cyan-900/60 text-cyan-300'
                        }`}
                      >
                        {msg.senderRole}
                      </span>
                    )}
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      isMine
                        ? 'bg-cyan-600 text-white rounded-tr-none'
                        : msg.channel === 'hunters'
                        ? 'bg-red-950 border border-red-800/80 text-red-100 rounded-tl-none'
                        : msg.channel === 'announcements'
                        ? 'bg-amber-950 border border-amber-800/80 text-amber-100 rounded-tl-none'
                        : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            placeholder={`Transmit on #${activeChannel}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={activeChannel === 'announcements' && !isHost}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 bg-cyan-600 hover:bg-cyan-500 active:scale-95 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
