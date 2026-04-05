/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { connectLiveSession } from './services/geminiService';

export default function App() {
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isMicOn, setIsMicOn] = useState(false);
  const liveSessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioInputContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setChatHistory([{ role: 'ai', text: "Hello, boss. How may I be of service today?" }]);
  }, []);

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
    
    // Prevent audio drift/lag by snapping to current time if we fall behind
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
        // Reduced buffer size from 4096 to 1024 for ultra-low latency (64ms)
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
    
    // Stop any currently playing audio to respond immediately
    stopAudio();

    try {
      const session = await ensureSession();
      // Send text directly through Live API for instant voice response
      session.sendRealtimeInput([{ text: userMessage }]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#00E5FF] font-mono p-8 flex flex-col">
      <h1 className="text-2xl mb-8">J.A.R.V.I.S.</h1>
      
      <div className="flex-grow overflow-y-auto mb-4 space-y-4">
        {chatHistory.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <p className="text-sm">{msg.text}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow bg-transparent border-b border-[#00E5FF]/50 p-2 outline-none"
          placeholder="Command, boss?"
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage} className="border border-[#00E5FF]/30 px-4 py-2 hover:bg-[#00E5FF]/10">SEND</button>
        <button onClick={toggleMic} className={`border px-4 py-2 ${isMicOn ? 'bg-[#00E5FF]/20 border-[#00E5FF]' : 'border-[#00E5FF]/30 hover:bg-[#00E5FF]/10'}`}>
          {isMicOn ? 'MIC ON' : 'MIC OFF'}
        </button>
      </div>
    </div>
  );
}
