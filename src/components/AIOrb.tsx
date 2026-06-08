import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, Mic, RefreshCw } from 'lucide-react';
import { listenProducts } from '../firebase/db';
import { useAuth } from '../context/AuthContext';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  isHtml?: boolean;
}

export const AIOrb: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    { 
      sender: 'assistant', 
      text: "Welcome back, Mr Harish Chaudhary. I am the A Town Luxury intelligence system. You can ask me to search products, identify low stock, or log stock movements. Try typing `/low-stock` or `/search rolex`." 
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Listen to real-time products to answer queries accurately
    const unsubscribe = listenProducts((data) => {
      setProducts(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendCommand = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { sender: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    setTimeout(() => {
      processCommand(text);
    }, 600);
  };

  const processCommand = (cmd: string) => {
    const cleanCmd = cmd.toLowerCase().trim();
    let replyText = '';
    let isHtml = false;

    if (cleanCmd === '/low-stock' || cleanCmd.includes('low stock') || cleanCmd.includes('check stock')) {
      const lowStock = products.filter(p => p.stockQuantity < 5);
      if (lowStock.length === 0) {
        replyText = "✨ All items are well-stocked. Inventory health score is 100%.";
      } else {
        isHtml = true;
        replyText = `
          <div class="space-y-2">
            <p class="text-amber-500 font-bold text-xs uppercase tracking-wider">⚠️ Low Stock Alerts (${lowStock.length})</p>
            <div class="space-y-1 text-xs">
              ${lowStock.map(p => `
                <div class="flex justify-between border-b border-zinc-100 py-1">
                  <span class="text-zinc-700 font-medium">${p.brand} ${p.name}</span>
                  <span class="text-red-500 font-bold">${p.stockQuantity} left</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    } else if (cleanCmd.startsWith('/search') || cleanCmd.includes('find') || cleanCmd.includes('search')) {
      const term = cleanCmd.replace('/search', '').replace('find', '').replace('search', '').trim();
      if (!term) {
        replyText = "Please specify a product name, brand, or SKU. Example: `/search rolex`";
      } else {
        const matches = products.filter(p => 
          p.name.toLowerCase().includes(term) || 
          p.brand.toLowerCase().includes(term) || 
          p.sku.toLowerCase().includes(term)
        );
        if (matches.length === 0) {
          replyText = `No products found matching "${term}".`;
        } else {
          isHtml = true;
          replyText = `
            <div class="space-y-2">
              <p class="text-luxury-gold font-bold text-xs uppercase tracking-wider">🔍 Search Results (${matches.length})</p>
              <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                ${matches.map(p => `
                  <div class="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-xs">
                    <div class="flex justify-between">
                      <span class="font-extrabold text-[#111111]">${p.brand}</span>
                      <span class="text-luxury-gold font-bold font-mono text-[10px]">${p.sku}</span>
                    </div>
                    <p class="text-zinc-600 mt-1 font-medium">${p.name}</p>
                    <div class="flex justify-between mt-2 pt-1.5 border-t border-zinc-200/60">
                      <span class="text-zinc-500">Stock: <strong class="${p.stockQuantity < 5 ? 'text-red-500' : 'text-green-600'} font-bold">${p.stockQuantity}</strong></span>
                      <span class="font-bold text-[#111111] font-mono">Rs. ${p.sellingPrice.toLocaleString()}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      }
    } else if (cleanCmd === '/stats' || cleanCmd.includes('stats') || cleanCmd.includes('dashboard')) {
      const totalInventoryCount = products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
      const totalValue = products.reduce((acc, p) => acc + ((p.sellingPrice || 0) * (p.stockQuantity || 0)), 0);
      isHtml = true;
      replyText = `
        <div class="space-y-2">
          <p class="text-luxury-gold font-bold text-xs uppercase tracking-wider">📊 Quick Analytics</p>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
              <p class="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Total Models</p>
              <p class="text-base font-extrabold text-[#111111] mt-0.5">${products.length}</p>
            </div>
            <div class="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
              <p class="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Total Stock</p>
              <p class="text-base font-extrabold text-[#111111] mt-0.5">${totalInventoryCount} units</p>
            </div>
            <div class="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 col-span-2">
              <p class="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Asset Valuation</p>
              <p class="text-lg font-extrabold text-luxury-gold mt-0.5 font-mono">Rs. ${totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      `;
    } else if (cleanCmd.includes('hello') || cleanCmd.includes('hi ') || cleanCmd === 'hi') {
      replyText = `Greetings, ${user?.fullName || 'Mr Harish Chaudhary'}. How can I assist you with the inventory database today?`;
    } else {
      replyText = `Command not recognized. Try typing:\n- \`/low-stock\` to check alerts\n- \`/search <name>\` to find items\n- \`/stats\` for database value overview`;
    }

    setMessages(prev => [...prev, { sender: 'assistant', text: replyText, isHtml }]);
  };

  const simulateVoiceCommand = () => {
    if (isListening) return;
    setIsListening(true);
    
    // Simulate voice recognition inputs
    const commands = [
      "Show me low stock items",
      "Search watches",
      "Stats overview"
    ];
    const randomCommand = commands[Math.floor(Math.random() * commands.length)];
    
    let currentText = '';
    let charIndex = 0;
    
    setTimeout(() => {
      // Typewriter simulator for voice
      const interval = setInterval(() => {
        if (charIndex < randomCommand.length) {
          currentText += randomCommand.charAt(charIndex);
          setInputValue(currentText);
          charIndex++;
        } else {
          clearInterval(interval);
          setIsListening(false);
          setTimeout(() => {
            handleSendCommand(randomCommand);
          }, 400);
        }
      }, 50);
    }, 1800); // Pulse waves simulation for 1.8s
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="w-80 md:w-96 h-[480px] rounded-2xl glass-panel-gold flex flex-col overflow-hidden mb-4 shadow-premium border-luxury-gold/25"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-luxury-gold animate-pulse shadow-[0_0_10px_#d4af37]" />
                <span className="text-xs font-bold tracking-widest text-[#111111] uppercase font-sans">
                  A Town Luxury AI
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-black transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Message Pane */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin bg-white">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed ${
                      msg.sender === 'user' 
                        ? 'bg-luxury-gold text-black font-semibold rounded-tr-none shadow-sm' 
                        : 'bg-zinc-50 border border-zinc-150/80 text-zinc-800 rounded-tl-none'
                    }`}
                  >
                    {msg.isHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                    ) : (
                      <p className="whitespace-pre-line">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Listening Waveform Indicator */}
            {isListening && (
              <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-[10px] text-luxury-gold uppercase tracking-wider animate-pulse flex items-center gap-1 font-bold">
                  <RefreshCw size={10} className="animate-spin" /> Listening...
                </span>
                <div className="flex space-x-0.5 items-center h-4">
                  {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                    <motion.div
                      key={bar}
                      className="w-0.5 bg-luxury-gold"
                      animate={{ height: [4, 16, 4] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6,
                        delay: bar * 0.08,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 border-t border-zinc-100 bg-zinc-50/50 flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCommand(inputValue)}
                placeholder="Ask database /low-stock..."
                className="flex-1 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 placeholder-zinc-400 focus:bg-white transition-all"
              />
              <button
                onClick={simulateVoiceCommand}
                disabled={isListening}
                className="p-2 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-zinc-500 hover:text-luxury-gold transition-colors duration-150 cursor-pointer"
                title="Voice Command"
              >
                <Mic size={14} className={isListening ? 'text-luxury-gold animate-pulse' : ''} />
              </button>
              <button
                onClick={() => handleSendCommand(inputValue)}
                className="p-2 bg-luxury-gold text-black rounded-xl hover:bg-luxury-gold/90 transition-colors duration-150 font-bold cursor-pointer"
              >
                <Send size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Orb Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-luxury-gold via-luxury-bronze to-luxury-gold flex items-center justify-center text-black shadow-gold-glow-lg border border-white/10 relative overflow-hidden"
      >
        {/* Pulsing Outer Aura */}
        <div className="absolute inset-0 bg-white/10 animate-ping rounded-full scale-75" />
        <Sparkles size={20} className="relative z-10" />
      </motion.button>
    </div>
  );
};
