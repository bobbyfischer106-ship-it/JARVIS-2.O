import { useState, useRef, useEffect } from 'react';
import { connectLiveSession } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Send, Cpu, Zap, Shield, Activity, Terminal, Globe, Settings } from 'lucide-react';

export default function App() {
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const liveSessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioInputContextRef = useRef<AudioContext | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChatHistory([{ role: 'ai', text: "Omniverse Tier protocols initialized. I am fully integrated with your local hardware. Awaiting your command, Boss." }]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const stopAudio = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    nextStartTimeRef.current = 0;
  };

  const playAudioChunk = (base64Data: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const pcmData = new Int16Array(bytes.buffer);
    const audioBuffer = ctx.createBuffer(1, pcmData.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    if (nextStartTimeRef.current < ctx.currentTime) {
      nextStartTimeRef.current = ctx.currentTime;
    }
    
    const startTime = nextStartTimeRef.current;
    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;
  };

  const ensureSession = async () => {
    if (!liveSessionRef.current) {
      const session = await connectLiveSession({
        onmessage: (msg: any) => {
          const parts = msg.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.text) {
              setIsProcessing(false);
              setChatHistory(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'ai') {
                  return [...prev.slice(0, -1), { role: 'ai', text: last.text + part.text }];
                }
                return [...prev, { role: 'ai', text: part.text }];
              });
            }
            if (part.inlineData?.data) {
              playAudioChunk(part.inlineData.data);
            }
          }
        }
      });
      liveSessionRef.current = session;
    }
    return liveSessionRef.current;
  };

  const toggleMic = async () => {
    if (isMicOn) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioInputContextRef.current) {
        await audioInputContextRef.current.close();
        audioInputContextRef.current = null;
      }
      setIsMicOn(false);
    } else {
      try {
        const session = await ensureSession();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioInputContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(1024, 1, 1);
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        
        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
          }
          const buffer = new ArrayBuffer(pcm16.length * 2);
          const view = new DataView(buffer);
          for (let i = 0; i < pcm16.length; i++) {
            view.setInt16(i * 2, pcm16[i], true);
          }
          
          let binary = '';
          const bytes = new Uint8Array(buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          
          session.sendRealtimeInput({
            audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
          });
        };
        
        setIsMicOn(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsProcessing(true);
    
    stopAudio();

    try {
      const session = await ensureSession();
      session.sendRealtimeInput([{ text: userMessage }]);
    } catch (error) {
      console.error('Error:', error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00E5FF] font-mono p-4 md:p-8 flex flex-col relative overflow-hidden">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#00E5FF 1px, transparent 1px), linear-gradient(90deg, #00E5FF 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      {/* Header HUD */}
      <div className="flex justify-between items-start mb-8 z-10">
        <div className="space-y-1">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-black tracking-tighter flex items-center gap-2"
          >
            <Shield className="w-8 h-8" />
            J.A.R.V.I.S.
          </motion.h1>
          <p className="text-[10px] opacity-50 uppercase tracking-[0.3em]">Omniverse Tier Protocol v2.5</p>
        </div>
        
        <div className="flex gap-6 text-[10px] uppercase tracking-widest">
          <div className="flex flex-col items-end">
            <span className="opacity-50">System Status</span>
            <span className="text-[#00FF88]">Optimal</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="opacity-50">Neural Link</span>
            <span className="text-[#00FF88]">Connected</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="opacity-50">Local Core</span>
            <span className="text-[#FFCC00]">Awaiting Sync</span>
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col md:flex-row gap-8 z-10">
        {/* Left Sidebar: System Stats */}
        <div className="hidden lg:flex flex-col gap-4 w-48">
          <div className="border border-[#00E5FF]/20 p-3 bg-[#00E5FF]/5">
            <div className="flex items-center gap-2 mb-2 text-xs">
              <Cpu className="w-4 h-4" /> CPU LOAD
            </div>
            <div className="h-1 bg-[#00E5FF]/10 rounded-full overflow-hidden">
              <motion.div 
                animate={{ width: ['20%', '45%', '30%', '60%', '40%'] }}
                transition={{ duration: 5, repeat: Infinity }}
                className="h-full bg-[#00E5FF]" 
              />
            </div>
          </div>
          <div className="border border-[#00E5FF]/20 p-3 bg-[#00E5FF]/5">
            <div className="flex items-center gap-2 mb-2 text-xs">
              <Activity className="w-4 h-4" /> NEURAL SYNC
            </div>
            <div className="h-1 bg-[#00E5FF]/10 rounded-full overflow-hidden">
              <motion.div 
                animate={{ width: ['80%', '85%', '82%', '90%', '88%'] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="h-full bg-[#00FF88]" 
              />
            </div>
          </div>
          <div className="mt-auto opacity-30 text-[8px] space-y-1">
            <p>ENCRYPTION: AES-256</p>
            <p>LATENCY: 42ms</p>
            <p>UPTIME: 00:14:22:09</p>
          </div>
        </div>

        {/* Main Content: Chat & Arc Reactor */}
        <div className="flex-grow flex flex-col gap-6">
          {/* Arc Reactor Visualization */}
          <div className="flex justify-center items-center h-48 relative">
            <motion.div 
              animate={{ 
                scale: isMicOn ? [1, 1.1, 1] : 1,
                rotate: 360 
              }}
              transition={{ 
                scale: { duration: 0.5, repeat: Infinity },
                rotate: { duration: 20, repeat: Infinity, ease: "linear" }
              }}
              className={`w-32 h-32 rounded-full border-4 flex items-center justify-center relative ${isMicOn ? 'border-[#00E5FF] shadow-[0_0_50px_rgba(0,229,255,0.5)]' : 'border-[#00E5FF]/20'}`}
            >
              <div className="w-24 h-24 rounded-full border-2 border-[#00E5FF]/30 flex items-center justify-center">
                <div className={`w-16 h-16 rounded-full ${isMicOn ? 'bg-[#00E5FF] shadow-[0_0_30px_#00E5FF]' : 'bg-[#00E5FF]/10'} transition-all duration-300`} />
              </div>
              {/* Spinning segments */}
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i} 
                  className="absolute w-1 h-4 bg-[#00E5FF]/40" 
                  style={{ transform: `rotate(${i * 45}deg) translateY(-60px)` }}
                />
              ))}
            </motion.div>
            
            {isProcessing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-0 text-[10px] tracking-[0.5em] text-[#FFCC00]"
              >
                PROCESSING COMMAND...
              </motion.div>
            )}
          </div>

          {/* Chat History */}
          <div className="flex-grow border border-[#00E5FF]/10 bg-[#00E5FF]/5 rounded-lg p-4 overflow-y-auto max-h-[400px] custom-scrollbar">
            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {chatHistory.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded ${msg.role === 'user' ? 'bg-[#00E5FF]/10 border border-[#00E5FF]/30' : 'bg-transparent'}`}>
                      <p className="text-xs leading-relaxed">
                        <span className="opacity-50 mr-2">[{msg.role === 'user' ? 'BOSS' : 'JARVIS'}]</span>
                        {msg.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="flex gap-4 items-center bg-[#00E5FF]/5 border border-[#00E5FF]/20 p-2 rounded-full">
            <button 
              onClick={toggleMic}
              className={`p-3 rounded-full transition-all ${isMicOn ? 'bg-[#FF0044] text-white shadow-[0_0_20px_rgba(255,0,68,0.5)]' : 'hover:bg-[#00E5FF]/10'}`}
            >
              {isMicOn ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Awaiting command, Boss..."
              className="flex-grow bg-transparent outline-none text-sm placeholder:text-[#00E5FF]/30"
            />
            
            <button 
              onClick={handleSendMessage}
              className="p-3 hover:bg-[#00E5FF]/10 rounded-full transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right Sidebar: Quick Actions */}
        <div className="hidden xl:flex flex-col gap-4 w-48">
          <div className="text-[10px] opacity-50 mb-2 border-b border-[#00E5FF]/20 pb-1">QUICK PROTOCOLS</div>
          <button className="flex items-center gap-2 text-[10px] hover:bg-[#00E5FF]/10 p-2 border border-[#00E5FF]/10">
            <Globe className="w-3 h-3" /> WEB INTEL
          </button>
          <button className="flex items-center gap-2 text-[10px] hover:bg-[#00E5FF]/10 p-2 border border-[#00E5FF]/10">
            <Zap className="w-3 h-3" /> SYSTEM SCAN
          </button>
          <button className="flex items-center gap-2 text-[10px] hover:bg-[#00E5FF]/10 p-2 border border-[#00E5FF]/10">
            <Terminal className="w-3 h-3" /> LOCAL CORE
          </button>
          <button className="flex items-center gap-2 text-[10px] hover:bg-[#00E5FF]/10 p-2 border border-[#00E5FF]/10">
            <Settings className="w-3 h-3" /> CONFIG
          </button>
        </div>
      </div>

      {/* Footer HUD */}
      <div className="mt-8 flex justify-between items-center text-[8px] opacity-30 z-10">
        <p>© 2026 STARK INDUSTRIES - ALL RIGHTS RESERVED</p>
        <div className="flex gap-4">
          <p>MARK LXXXV OS</p>
          <p>STARK-NET v9.4</p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 229, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 229, 255, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
