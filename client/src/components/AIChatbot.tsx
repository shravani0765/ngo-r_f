import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, HelpCircle } from 'lucide-react';
import api from '../services/api';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

export const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Hi! 👋 I can help you find NGOs, understand transparency scores, track donations or use the platform.'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: text });
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: res.data.response || 'I can help guide you through NGO verification and donation tracking.'
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'The platform transparency score evaluates NGO document completeness, tax registration (12A/80G), financial audits, and verified beneficiary outcomes. Every donation is cryptographically recorded.'
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPills = [
    '🔎 Find an NGO',
    '💰 Track my donation',
    '📊 Explain transparency score',
    '🏢 Register my NGO',
    '📄 Understand verification'
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform cursor-pointer border border-blue-400/30"
          title="NGO Impact Assistant"
        >
          <Bot className="w-7 h-7 text-white" />
        </button>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-80 sm:w-96 h-[500px] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-white font-bold">
                <Bot className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm">NGO Impact Assistant</h3>
                <span className="text-[10px] text-blue-200">Online • Guidance & Support</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-300 hover:text-white font-bold text-lg p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex items-start space-x-2 ${
                  msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-white'
                  }`}
                >
                  {msg.sender === 'user' ? 'U' : <Bot className="w-3.5 h-3.5 text-blue-400" />}
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-[80%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-[10px] text-slate-400 italic pl-8">Thinking...</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Pills */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px]">
            {quickPills.map((pill, i) => (
              <button
                key={i}
                onClick={() => handleSend(pill)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 font-semibold text-slate-600 border border-slate-200/80 transition-colors cursor-pointer"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={e => { e.preventDefault(); handleSend(); }}
            className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Ask a question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
};
