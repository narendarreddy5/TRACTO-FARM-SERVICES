import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  Phone, 
  Tractor as TractorIcon, 
  User as UserIcon, 
  History, 
  Bell, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Menu,
  Languages,
  ArrowRight,
  Loader2,
  Volume2,
  CloudRain,
  Wifi,
  PlusCircle,
  Mail,
  Lock,
  Key,
  ShieldCheck,
  LayoutDashboard,
  Settings,
  Sprout,
  Droplets,
  Scissors,
  Wheat,
  Info,
  Search,
  Edit2,
  Save,
  X,
  UserPlus,
  AlertTriangle,
  Star,
  Award,
  Clock,
  Briefcase,
  Camera,
  FileText,
  Video
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { io, Socket } from 'socket.io-client';
import { User, Booking, Notification, Tractor } from './types';
import { processVoiceIntent, generateVoiceResponse, generateTractorReport, VoiceIntent } from './services/geminiService';

// --- Components ---

const VoiceAssistant = ({ onBookingComplete, language, bookings, tractors }: { 
  onBookingComplete: (data: any) => void, 
  language: string,
  bookings: Booking[],
  tractors: Tractor[]
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US';

      recognitionRef.current.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setIsProcessing(true);
        
        const intent = await processVoiceIntent(text, language);

        // Add context data based on intent
        if (intent.intentType === 'status_check') {
          intent.data = bookings.slice(0, 3);
        } else if (intent.intentType === 'machinery_info') {
          if (intent.tractorModel) {
            intent.data = tractors.find(t => t.model.toLowerCase().includes(intent.tractorModel!.toLowerCase()));
          } else {
            intent.data = tractors.slice(0, 3);
          }
        }

        const responseText = await generateVoiceResponse(intent, language);
        setAiResponse(responseText);
        
        if (intent.intentType === 'booking' && intent.isComplete) {
          onBookingComplete(intent);
        }
        setIsProcessing(false);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setIsProcessing(false);
      };
    } else {
      setIsSupported(false);
    }
  }, [language]);

  const toggleListening = () => {
    if (!isSupported) {
      alert('Speech recognition is not supported in your browser. Please use the manual booking form.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setAiResponse('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-earth-100 rounded-3xl border-2 border-earth-200">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-moss-700 font-serif">
          {language === 'te' ? 'AI చాట్‌బాట్ అసిస్టెంట్' : language === 'hi' ? 'AI चैटबॉट सहायक' : 'AI Chatbot Assistant'}
        </h3>
        <p className="text-sm text-moss-600 opacity-80">
          {language === 'te' ? 'వాయిస్ ద్వారా సేవలను బుక్ చేయండి' : language === 'hi' ? 'आवाज के माध्यम से सेवाएं बुक करें' : 'Book services via voice'}
        </p>
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={toggleListening}
        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          isListening ? 'bg-clay-500 animate-pulse' : 'bg-moss-600'
        }`}
      >
        {isProcessing ? (
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        ) : (
          <Mic className="w-8 h-8 text-white" />
        )}
      </motion.button>

      {transcript && (
        <div className="w-full p-3 bg-white rounded-xl border border-earth-200 text-sm italic text-slate-600">
          "{transcript}"
        </div>
      )}

      {aiResponse && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full p-6 bg-slate-900 text-white rounded-[2rem] shadow-2xl border border-white/10 flex flex-col gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-moss-600 rounded-full flex items-center justify-center shadow-lg">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-moss-600 uppercase tracking-widest">AI Assistant Response</p>
              <h4 className="text-sm font-bold">Voice Confirmation</h4>
            </div>
          </div>
          <p className="text-sm font-medium leading-relaxed text-slate-200 bg-white/5 p-4 rounded-2xl border border-white/5 italic">
            "{aiResponse}"
          </p>
          <div className="flex justify-end">
            <button 
              onClick={() => {
                const speech = new SpeechSynthesisUtterance(aiResponse);
                speech.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
                window.speechSynthesis.speak(speech);
              }}
              className="px-4 py-2 bg-moss-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-moss-700 transition-all cursor-pointer"
            >
              Replay Audio
            </button>
          </div>
        </motion.div>
      )}


    </div>
  );
};

const PhoneIVR = ({ onBookingComplete, onHangUp, language: initialLanguage, bookings, tractors, userLocation }: { 
  onBookingComplete: (data: any) => void, 
  onHangUp: () => void, 
  language: string,
  bookings: Booking[],
  tractors: Tractor[],
  userLocation: string
}) => {
  const [status, setStatus] = useState<'dialing' | 'connected' | 'listening' | 'processing' | 'ended'>('dialing');
  const [menuStep, setMenuStep] = useState<'language' | 'main' | 'booking' | 'status'>('language');
  const [callLanguage, setCallLanguage] = useState(initialLanguage);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(window.speechSynthesis);

  // Stats for display
  const farmerCount = 1240; 
  const providerCount = 86;
  const availableInRadius = tractors.filter(t => t.status === 'available').length;

  useEffect(() => {
    const timer = setTimeout(() => setStatus('connected'), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status === 'connected') {
      if (menuStep === 'language') {
        speak("Welcome to TRACTO FARM SERVICES. For English, say English. Hindi ke liye Hindi bolein. Telugu kosam Telugu ani cheppandi. Für Deutsch sagen Sie Deutsch. Para español, diga español.");
      } else if (menuStep === 'main') {
        const prompt = callLanguage === 'hi' ? "Booking ke liye 1 bolein. Status check karne ke liye 2 bolein." : 
                       callLanguage === 'te' ? "Booking kosam 1 nokkandi. Status kosam 2 nokkandi." : 
                       callLanguage === 'de' ? "Sagen Sie 1 für Buchungen. Sagen Sie 2 für den Status." :
                       callLanguage === 'es' ? "Diga 1 para reservas. Diga 2 para el estado." :
                       "Say 1 to book a service. Say 2 to check your booking status.";
        speak(prompt);
      }
    }
  }, [status, menuStep]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (menuStep === 'language') {
      utterance.lang = 'en-US'; 
    } else {
      utterance.lang = callLanguage === 'te' ? 'te-IN' : callLanguage === 'hi' ? 'hi-IN' : callLanguage === 'de' ? 'de-DE' : callLanguage === 'es' ? 'es-ES' : 'en-US';
    }
    
    utterance.onend = () => {
      if (status !== 'ended') {
        startListening();
      }
    };
    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = menuStep === 'language' ? 'en-US' : (callLanguage === 'te' ? 'te-IN' : callLanguage === 'hi' ? 'hi-IN' : callLanguage === 'de' ? 'de-DE' : callLanguage === 'es' ? 'es-ES' : 'en-US');
    
    recognitionRef.current.onresult = async (event: any) => {
      const text = event.results[0][0].transcript.toLowerCase();
      setTranscript(text);
      setStatus('processing');
      
      if (menuStep === 'language') {
        if (text.includes('hindi')) {
          setCallLanguage('hi');
          setMenuStep('main');
          setStatus('connected');
        } else if (text.includes('telugu')) {
          setCallLanguage('te');
          setMenuStep('main');
          setStatus('connected');
        } else if (text.includes('deutsch') || text.includes('german')) {
          setCallLanguage('de');
          setMenuStep('main');
          setStatus('connected');
        } else if (text.includes('español') || text.includes('spanish')) {
          setCallLanguage('es');
          setMenuStep('main');
          setStatus('connected');
        } else {
          setCallLanguage('en');
          setMenuStep('main');
          setStatus('connected');
        }
      } else if (menuStep === 'main') {
        if (text.includes('1') || text.includes('one') || text.includes('book') || text.includes('eins') || text.includes('uno')) {
          setMenuStep('booking');
          speak(callLanguage === 'hi' ? "Aap kya book karna chahte hain? Jaise: 5 acres plowing kal ke liye." : 
                callLanguage === 'te' ? "Miru emi book cheyali anukuntunnaru?" : 
                callLanguage === 'de' ? "Was möchten Sie buchen? Zum Beispiel: 5 Hektar Pflügen für morgen." :
                callLanguage === 'es' ? "¿Qué le gustaría reservar? Por ejemplo: 5 acres de arado para mañana." :
                "What would you like to book? For example: 5 acres of plowing for tomorrow.");
        } else if (text.includes('2') || text.includes('two') || text.includes('status') || text.includes('confirm') || text.includes('zwei') || text.includes('dos')) {
          setMenuStep('status');
          const lastBooking = bookings[0];
          if (lastBooking) {
            const statusMsg = callLanguage === 'hi' ? `Aapki ${lastBooking.service_type} booking ${lastBooking.status} hai.` : 
                             callLanguage === 'te' ? `Mee ${lastBooking.service_type} booking ${lastBooking.status} lo undi.` : 
                             callLanguage === 'de' ? `Ihre ${lastBooking.service_type} Buchung ist derzeit ${lastBooking.status}.` :
                             callLanguage === 'es' ? `Su reserva de ${lastBooking.service_type} está actualmente ${lastBooking.status}.` :
                             `Your ${lastBooking.service_type} booking is currently ${lastBooking.status}.`;
            speak(statusMsg + (callLanguage === 'de' ? " Sonst noch etwas?" : callLanguage === 'es' ? " ¿Algo más?" : " Anything else?"));
            setMenuStep('main');
          } else {
            speak(callLanguage === 'de' ? "Keine Buchungen gefunden. Zurück zum Hauptmenü." : 
                  callLanguage === 'es' ? "No se encontraron reservas. Volviendo al menú principal." :
                  "No bookings found. Returning to main menu.");
            setMenuStep('main');
          }
        }
      } else if (menuStep === 'booking') {
        const intent = await processVoiceIntent(text, callLanguage);
        const responseText = await generateVoiceResponse(intent, callLanguage);
        setAiResponse(responseText);
        
        if (intent.intentType === 'booking' && intent.isComplete) {
          onBookingComplete(intent);
          speak(responseText + " Your booking is confirmed. Goodbye.");
          setTimeout(() => {
            setStatus('ended');
            onHangUp();
          }, 5000);
        } else {
          speak(responseText);
        }
      }
    };
    recognitionRef.current.start();
    setStatus('listening');
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-between p-8 text-white overflow-hidden"
    >
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <div className="w-2 h-2 bg-moss-600 rounded-full animate-pulse" />
        <span className="text-[10px] font-black text-moss-600 uppercase tracking-[0.3em]">Advanced IVR System v2.0</span>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-12">
        {/* Left Side: Call Interface */}
        <div className="text-center space-y-6">
          <div className="w-32 h-32 bg-moss-600 rounded-full mx-auto flex items-center justify-center animate-pulse shadow-[0_0_60px_rgba(101,163,13,0.4)] relative">
            <Phone className="w-16 h-16 text-white" />
            <div className="absolute -inset-4 border-2 border-moss-600/30 rounded-full animate-ping" />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black font-serif tracking-tighter">1800-TRACTO-FARM</h2>
            <p className="text-moss-600 font-mono uppercase tracking-[0.5em] text-[10px] font-black">
              {status === 'dialing' ? 'Establishing Secure Line...' : status === 'connected' ? 'Line Encrypted' : status === 'listening' ? 'Awaiting Input...' : status === 'processing' ? 'Analyzing Voice...' : 'Call Terminated'}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <div className={`px-4 py-2 rounded-2xl border ${callLanguage === 'en' ? 'bg-moss-600 border-moss-600' : 'bg-white/5 border-white/10'} text-[10px] font-bold uppercase`}>English</div>
            <div className={`px-4 py-2 rounded-2xl border ${callLanguage === 'hi' ? 'bg-moss-600 border-moss-600' : 'bg-white/5 border-white/10'} text-[10px] font-bold uppercase`}>Hindi</div>
            <div className={`px-4 py-2 rounded-2xl border ${callLanguage === 'te' ? 'bg-moss-600 border-moss-600' : 'bg-white/5 border-white/10'} text-[10px] font-bold uppercase`}>Telugu</div>
            <div className={`px-4 py-2 rounded-2xl border ${callLanguage === 'de' ? 'bg-moss-600 border-moss-600' : 'bg-white/5 border-white/10'} text-[10px] font-bold uppercase`}>German</div>
            <div className={`px-4 py-2 rounded-2xl border ${callLanguage === 'es' ? 'bg-moss-600 border-moss-600' : 'bg-white/5 border-white/10'} text-[10px] font-bold uppercase`}>Spanish</div>
          </div>
        </div>

        {/* Right Side: Live Network Stats */}
        <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-moss-600">Live Network Stats</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Live</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Farmers</p>
              <p className="text-2xl font-black text-white">{farmerCount.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Service Providers</p>
              <p className="text-2xl font-black text-white">{providerCount}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Availability Radius</span>
              <span className="text-moss-600">20 KM</span>
            </div>
            <div className="relative h-32 bg-white/5 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center">
              {/* Radar Animation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border border-moss-600/30 rounded-full animate-[ping_3s_linear_infinite]" />
                <div className="w-16 h-16 border border-moss-600/50 rounded-full animate-[ping_2s_linear_infinite]" />
                <div className="w-2 h-2 bg-moss-600 rounded-full" />
              </div>
              <div className="z-10 text-center">
                <p className="text-3xl font-black text-white">{availableInRadius}</p>
                <p className="text-[8px] font-bold text-moss-600 uppercase tracking-widest">Vehicles Available</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 text-center italic">Scanning {userLocation} and surrounding areas...</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md space-y-6 pb-12">
        <AnimatePresence mode="wait">
          {transcript ? (
            <motion.div 
              key="transcript"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10"
            >
              <p className="text-[10px] font-black text-moss-600 uppercase tracking-widest mb-2">You said:</p>
              <p className="text-lg font-medium italic">"{transcript}"</p>
            </motion.div>
          ) : (
            <motion.div 
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-slate-400 text-sm animate-pulse">
                {status === 'listening' ? 'Speak now...' : 'Please wait...'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center">
          <button 
            onClick={() => {
              synthRef.current.cancel();
              recognitionRef.current?.stop();
              onHangUp();
            }}
            className="w-20 h-20 bg-clay-600 rounded-full flex items-center justify-center shadow-2xl hover:bg-clay-700 transition-all cursor-pointer group"
          >
            <X className="w-8 h-8 text-white group-hover:rotate-90 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const TractorMatchingScreen = ({ 
  acres, 
  date, 
  location, 
  serviceType, 
  latitude,
  longitude,
  onConfirm, 
  onCancel 
}: { 
  acres: number, 
  date: string, 
  location: string, 
  serviceType: string, 
  latitude?: number,
  longitude?: number,
  onConfirm: (tractorId?: number) => void, 
  onCancel: () => void 
}) => {
  const [status, setStatus] = useState<'searching' | 'results'>('searching');
  const [tractors, setTractors] = useState<any[]>([]);

  useEffect(() => {
    const searchTractors = async () => {
      setStatus('searching');
      // Simulate network delay for "Matching" feel
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      try {
        let url = `/api/tractors/search?service_type=${serviceType}`;
        if (latitude && longitude) {
          url += `&latitude=${latitude}&longitude=${longitude}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setTractors(data);
        setStatus('results');
      } catch (e) {
        console.error('Search failed', e);
        setStatus('results');
      }
    };
    searchTractors();
  }, [serviceType, latitude, longitude]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex flex-col p-6"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-moss-600 rounded-xl flex items-center justify-center shadow-lg">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-serif">Tractor Matching</h2>
            <p className="text-[10px] text-moss-500 font-bold uppercase tracking-widest">System Engine v2.0</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 bg-white/10 rounded-full text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Service</p>
            <p className="text-sm font-bold text-white">{serviceType}</p>
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Acres</p>
            <p className="text-sm font-bold text-white">{acres} Acres</p>
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date</p>
            <p className="text-sm font-bold text-white">{date}</p>
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location</p>
            <p className="text-sm font-bold text-white">{location}</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === 'searching' ? (
          <motion.div 
            key="searching"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex-1 flex flex-col items-center justify-center space-y-8"
          >
            <div className="relative">
              <div className="w-32 h-32 border-4 border-moss-600/20 rounded-full" />
              <div className="absolute inset-0 w-32 h-32 border-4 border-moss-600 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <TractorIcon className="w-12 h-12 text-moss-600 animate-bounce" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white font-serif">Matching Tractors...</h3>
              <p className="text-slate-400 text-sm">Checking availability in your village area</p>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map(i => (
                <motion.div 
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                  className="w-2 h-2 bg-moss-600 rounded-full"
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 overflow-y-auto space-y-4 pr-2"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Available Near You</h3>
              <span className="px-2 py-1 bg-moss-600/20 text-moss-500 text-[10px] font-bold rounded-full">{tractors.length} Found</span>
            </div>

            {tractors.length > 0 ? (
              tractors.map(tractor => (
                <div key={tractor.id} className="p-4 bg-white/10 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-white/5 rounded-xl overflow-hidden shrink-0">
                      <img 
                        src={tractor.image_url || `https://picsum.photos/seed/${tractor.model}/200/200`} 
                        alt={tractor.model}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white">{tractor.model}</h4>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-bold text-white">{tractor.owner_rating || '5.0'}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Owner: {tractor.owner_name}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-moss-500 font-bold">
                        <MapPin className="w-3 h-3" />
                        <span>{tractor.distance ? `${tractor.distance} km away` : 'Nearby'}</span>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <Wheat className="w-3 h-3 text-moss-600" />
                          <span className="text-[10px] font-bold text-white">₹{tractor.price_per_acre}/acre</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-moss-600" />
                          <span className="text-[10px] font-bold text-white">₹{tractor.price_per_hour}/hr</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => onConfirm(tractor.id)}
                    className="w-full py-3 bg-moss-600 text-white rounded-xl font-bold text-xs hover:bg-moss-700 transition-all"
                  >
                    Select & Send Request
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8 text-slate-500" />
                </div>
                <div>
                  <h4 className="text-white font-bold">No Tractors Available</h4>
                  <p className="text-slate-400 text-xs">Try changing the date or service type</p>
                </div>
                <button 
                  onClick={() => onConfirm()} // Send general request
                  className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold text-xs hover:bg-white/20 transition-all"
                >
                  Send General Request to All
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const FarmerCallScreen = ({ name, phone, onHangUp }: { name: string, phone: string, onHangUp: () => void }) => {
  const [status, setStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const callTimer = setTimeout(() => setStatus('connected'), 3000);
    return () => clearTimeout(callTimer);
  }, []);

  useEffect(() => {
    let interval: any;
    if (status === 'connected') {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-between p-12 text-white"
    >
      <div className="text-center space-y-4 pt-12">
        <div className="w-32 h-32 bg-moss-600 rounded-full mx-auto flex items-center justify-center shadow-2xl relative">
          <UserIcon className="w-16 h-16 text-white" />
          {status === 'calling' && (
            <div className="absolute inset-0 border-4 border-moss-400 rounded-full animate-ping" />
          )}
        </div>
        <h2 className="text-3xl font-bold font-serif">{name}</h2>
        <p className="text-slate-400 font-mono tracking-widest">{phone}</p>
        <p className="text-moss-500 font-bold uppercase tracking-widest text-sm">
          {status === 'calling' ? 'Calling...' : formatTime(timer)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-8 w-full max-w-xs">
        {[
          { icon: Mic, label: 'Mute' },
          { icon: Volume2, label: 'Speaker' },
          { icon: PlusCircle, label: 'Add' },
          { icon: Video, label: 'Video' },
          { icon: LayoutDashboard, label: 'Keypad' },
          { icon: UserPlus, label: 'Contacts' },
        ].map((btn, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
              <btn.icon className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400">{btn.label}</span>
          </div>
        ))}
      </div>

      <button 
        onClick={onHangUp}
        className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-600 transition-colors mb-12"
      >
        <Phone className="w-8 h-8 text-white rotate-[135deg]" />
      </button>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'farmer' | 'provider'>('farmer');
  const [username, setUsername] = useState('');
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isCallingFarmer, setIsCallingFarmer] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<{ name: string, phone: string } | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState('');
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [selectedTractorId, setSelectedTractorId] = useState<number | null>(null);
  const [view, setView] = useState<'home' | 'bookings' | 'notifications' | 'profile' | 'manual_booking' | 'schemes'>('home');
  const [selectedService, setSelectedService] = useState('Plowing');
  const [manualAcres, setManualAcres] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualFarmerAddress, setManualFarmerAddress] = useState('');
  const [newTractorModel, setNewTractorModel] = useState('');
  const [newTractorLocation, setNewTractorLocation] = useState('');
  const [newTractorImage, setNewTractorImage] = useState('');
  const [newTractorDescription, setNewTractorDescription] = useState('');
  const [newTractorPrice, setNewTractorPrice] = useState('');
  const [newTractorPerHour, setNewTractorPerHour] = useState('');
  const [newTractorHp, setNewTractorHp] = useState('');
  const [newTractorYear, setNewTractorYear] = useState('');
  const [newTractorFuelType, setNewTractorFuelType] = useState('Diesel');
  const [newTractorLastService, setNewTractorLastService] = useState('');
  const [newTractorNextService, setNewTractorNextService] = useState('');
  
  // Tractor Editing State
  const [editingTractorId, setEditingTractorId] = useState<number | null>(null);
  const [editTractorModel, setEditTractorModel] = useState('');
  const [editTractorStatus, setEditTractorStatus] = useState<'available' | 'busy' | 'maintenance'>('available');
  const [editTractorLocation, setEditTractorLocation] = useState('');
  const [editTractorImage, setEditTractorImage] = useState('');
  const [editTractorDescription, setEditTractorDescription] = useState('');
  const [editTractorPrice, setEditTractorPrice] = useState('');
  const [editTractorPerHour, setEditTractorPerHour] = useState('');
  const [editTractorHp, setEditTractorHp] = useState('');
  const [editTractorYear, setEditTractorYear] = useState('');
  const [editTractorFuelType, setEditTractorFuelType] = useState('');
  const [editTractorLastService, setEditTractorLastService] = useState('');
  const [editTractorNextService, setEditTractorNextService] = useState('');

  const [selectedTractorDetails, setSelectedTractorDetails] = useState<Tractor | null>(null);
  const [tractorBookingHistory, setTractorBookingHistory] = useState<Booking[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [tractorFilter, setTractorFilter] = useState<'all' | 'available' | 'busy' | 'maintenance'>('all');

  // Booking Editing State
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);
  const [editBookingAcres, setEditBookingAcres] = useState('');
  const [editBookingDate, setEditBookingDate] = useState('');
  const [editBookingLocation, setEditBookingLocation] = useState('');
  const [editBookingService, setEditBookingService] = useState('Plowing');
  const [viewingBookingId, setViewingBookingId] = useState<number | null>(null);

  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editExperience, setEditExperience] = useState('');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Alert State
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [weather, setWeather] = useState({
    temp: '28°C',
    condition: 'Sunny',
    location: 'Ramapur',
    humidity: '45%',
    wind: '12 km/h'
  });
  const [userLocation, setUserLocation] = useState('Ramapur');
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  // Matching State
  const [isMatchingTractors, setIsMatchingTractors] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState<any>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('tracto_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsedUser.language) setLanguage(parsedUser.language);
      } catch (e) {
        console.error('Failed to parse saved user', e);
        localStorage.removeItem('tracto_user');
      }
    }
  }, []);

  useEffect(() => {
    if (username.length >= 3) {
      const timer = setTimeout(async () => {
        const res = await fetch(`/api/users/check-username?username=${username}`);
        const data = await res.json();
        setIsUsernameAvailable(!data.exists);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsUsernameAvailable(null);
    }
  }, [username]);

  useEffect(() => {
    const weatherInterval = setInterval(() => {
      const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Clear Sky'];
      const temps = ['26°C', '27°C', '28°C', '29°C', '30°C', '31°C'];
      const humidities = ['40%', '45%', '50%', '55%', '60%'];
      
      setWeather(prev => ({
        ...prev,
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        temp: temps[Math.floor(Math.random() * temps.length)],
        humidity: humidities[Math.floor(Math.random() * humidities.length)],
      }));
    }, 5000);

    return () => clearInterval(weatherInterval);
  }, []);

  useEffect(() => {
    if (user) {
      // Socket.io connection
      socketRef.current = io(window.location.origin);
      socketRef.current.emit('join', user.id);

      socketRef.current.on('notification', (notif) => {
        setNotifications(prev => [notif, ...prev]);
        fetchBookings();
      });

      socketRef.current.on('booking_accepted', () => {
        fetchBookings();
      });

      socketRef.current.on('new_alert', (alertData) => {
        setActiveAlerts(prev => [alertData, ...prev]);
        // Also add to notifications for persistence
        setNotifications(prev => [{
          id: Date.now(),
          user_id: user.id,
          message: `🚨 ALERT: ${alertData.message}`,
          type: 'alert',
          created_at: new Date().toISOString()
        }, ...prev]);
      });

      socketRef.current.on('tractor_status_update', (data) => {
        setNotifications(prev => [{
          id: Date.now(),
          user_id: user.id,
          message: data.message || `Tractor ${data.model} is now ${data.newStatus}.`,
          type: 'tractor_update',
          created_at: new Date().toISOString()
        }, ...prev]);
        fetchBookings();
        if (user.role === 'provider') fetchTractors();
      });

      fetchBookings();
      fetchNotifications();
      if (user.role === 'provider') {
        fetchTractors();
      }
      
      return () => {
        socketRef.current?.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    if (selectedTractorDetails) {
      fetchTractorHistory(selectedTractorDetails.id);
      setAiReport('');
    } else {
      setTractorBookingHistory([]);
      setAiReport('');
    }
  }, [selectedTractorDetails]);

  const fetchTractorHistory = async (tractorId: number) => {
    try {
      const res = await fetch(`/api/tractors/${tractorId}/bookings`);
      const data = await res.json();
      setTractorBookingHistory(data);
    } catch (e) {
      console.error("Failed to fetch tractor history", e);
    }
  };

  const handleGenerateAIReport = async () => {
    if (!selectedTractorDetails) return;
    setIsGeneratingReport(true);
    try {
      const report = await generateTractorReport(selectedTractorDetails, tractorBookingHistory, language);
      setAiReport(report);
    } catch (e) {
      console.error("Failed to generate AI report", e);
      setAiReport("Failed to generate report. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const fetchTractors = async () => {
    if (!user) return;
    const res = await fetch(`/api/tractors?providerId=${user.id}`);
    const data = await res.json();
    setTractors(data);
  };

  const fetchBookings = async () => {
    if (!user) return;
    const res = await fetch(`/api/bookings?role=${user.role}&userId=${user.id}`);
    const data = await res.json();
    setBookings(data);
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!user || !window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      if (res.ok) {
        fetchBookings();
        setNotifications(prev => [{
          id: Date.now(),
          user_id: user.id,
          message: "Booking cancelled successfully.",
          type: 'info',
          created_at: new Date().toISOString()
        }, ...prev]);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to cancel booking");
      }
    } catch (e) {
      console.error("Error cancelling booking", e);
    }
  };

  const handleAddTractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTractorModel || !newTractorLocation) return;
    setLoading(true);
    try {
      await fetch('/api/tractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: user.id,
          model: newTractorModel,
          location: newTractorLocation,
          image_url: newTractorImage,
          description: newTractorDescription,
          price_per_acre: parseFloat(newTractorPrice) || 0,
          price_per_hour: parseFloat(newTractorPerHour) || 0,
          hp: parseInt(newTractorHp) || 45,
          year: parseInt(newTractorYear) || 2022,
          fuel_type: newTractorFuelType,
          last_service: newTractorLastService,
          next_service: newTractorNextService,
        }),
      });
      setNewTractorModel('');
      setNewTractorLocation('');
      setNewTractorImage('');
      setNewTractorDescription('');
      setNewTractorPrice('');
      setNewTractorPerHour('');
      setNewTractorHp('');
      setNewTractorYear('');
      setNewTractorFuelType('Diesel');
      setNewTractorLastService('');
      setNewTractorNextService('');
      fetchTractors();
      alert('Tractor added successfully!');
    } catch (err) {
      console.error('Error adding tractor:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTractorId) return;
    setLoading(true);
    try {
      await fetch(`/api/tractors/${editingTractorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: editTractorModel,
          status: editTractorStatus,
          location: editTractorLocation,
          image_url: editTractorImage,
          description: editTractorDescription,
          price_per_acre: parseFloat(editTractorPrice) || 0,
          price_per_hour: parseFloat(editTractorPerHour) || 0,
          hp: parseInt(editTractorHp) || 45,
          year: parseInt(editTractorYear) || 2022,
          fuel_type: editTractorFuelType,
          last_service: editTractorLastService,
          next_service: editTractorNextService,
        }),
      });
      setEditingTractorId(null);
      fetchTractors();
      alert('Tractor updated successfully!');
    } catch (err) {
      console.error('Error updating tractor:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (tractor: Tractor) => {
    setIsGeneratingReport(true);
    setSelectedTractorDetails(tractor);
    setAiReport('');
    try {
      const tractorBookings = bookings.filter(b => b.tractor_id === tractor.id);
      const report = await generateTractorReport(tractor, tractorBookings, language);
      setAiReport(report);
    } catch (err) {
      console.error('Error generating report:', err);
      setAiReport('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleUpdateBookingDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBookingId) return;
    setLoading(true);
    try {
      await fetch(`/api/bookings/${editingBookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acres: parseFloat(editBookingAcres),
          date: editBookingDate,
          location: editBookingLocation,
          service_type: editBookingService,
        }),
      });
      setEditingBookingId(null);
      fetchBookings();
      alert('Booking updated successfully!');
    } catch (err) {
      console.error('Error updating booking:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          language: editLanguage,
          username: editUsername,
          address: editAddress,
          bio: editBio,
          experience: editExperience,
          avatar_url: editAvatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data);
      localStorage.setItem('tracto_user', JSON.stringify(data));
      if (data.language) setLanguage(data.language);
      setIsEditingProfile(false);
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturingPhoto(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCapturingPhoto(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setEditAvatarUrl(dataUrl);
        alert("Photo captured successfully! Click 'Save Changes' to update your profile picture.");
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('File size too large. Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatarUrl(reader.result as string);
        alert("Image uploaded! Click 'Save Changes' to update your profile picture.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendAlert = async (type: 'emergency' | 'urgent' | 'help') => {
    if (!user) return;
    setIsSendingAlert(true);
    try {
      // Get current location
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const res = await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            type,
            message: `${user.name} sent a ${type} alert!`,
            latitude,
            longitude
          }),
        });
        if (res.ok) {
          alert('Alert sent successfully! Nearby users have been notified.');
        }
      });
    } catch (err) {
      console.error('Alert error:', err);
      alert('Failed to send alert.');
    } finally {
      setIsSendingAlert(false);
    }
  };

  const handleRateBooking = async (bookingId: number, rating: number, feedback: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback }),
      });
      if (res.ok) {
        fetchBookings();
        alert('Thank you for your feedback!');
      }
    } catch (err) {
      console.error('Error rating booking:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;
    
    setIsSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`/api/users/search?username=${query}`);
      const data = await res.json();
      if (res.ok) {
        setSearchResult(data);
      } else {
        alert(data.error || 'User not found');
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('Failed to search user. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    const res = await fetch(`/api/notifications/${user.id}`);
    const data = await res.json();
    setNotifications(data);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if email already exists
      const checkRes = await fetch(`/api/users/check-email?email=${email}`);
      const checkData = await checkRes.json();
      if (checkData.exists) {
        setError('This email is already registered. Please login instead.');
        setLoading(false);
        return;
      }

      // Generate 6-digit OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);

      const templateParams = {
        to_name: name,
        to_email: email,
        otp: newOtp,
      };

      await emailjs.send(
        'service_sagxkmn',
        'template_w5xvfnx',
        templateParams,
        'ICkLAutrXZVDbP1Ut'
      );
      setIsOtpSent(true);
      alert('OTP sent to your email!');
    } catch (err: any) {
      setError('Failed to send OTP. Please check your email and try again.');
      console.error('EmailJS Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await handleBooking({
      acres: parseFloat(manualAcres),
      date: manualDate,
      location: manualLocation,
      phone: manualPhone,
      farmerAddress: manualFarmerAddress,
      serviceType: selectedService,
      isComplete: true
    });
    setManualAcres('');
    setManualDate('');
    setManualLocation('');
    setManualPhone('');
    setManualFarmerAddress('');
    setLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (isForgotPassword) {
      if (!isOtpSent) {
        // Send OTP for password reset
        try {
          const checkRes = await fetch(`/api/users/check-email?email=${email}`);
          const checkData = await checkRes.json();
          if (!checkData.exists) {
            setError('No account found with this email.');
            setLoading(false);
            return;
          }

          const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedOtp(newOtp);

          await emailjs.send(
            'service_sagxkmn',
            'template_w5xvfnx',
            { to_email: email, otp: newOtp },
            'ICkLAutrXZVDbP1Ut'
          );
          setIsOtpSent(true);
          alert('Reset OTP sent to your email!');
        } catch (err) {
          setError('Failed to send reset OTP.');
        } finally {
          setLoading(false);
        }
        return;
      } else {
        // Verify OTP and reset password
        if (otp !== generatedOtp) {
          setError('Invalid OTP.');
          setLoading(false);
          return;
        }
        try {
          const res = await fetch('/api/users/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (res.ok) {
            alert('Password reset successfully! Please login.');
            setIsForgotPassword(false);
            setIsOtpSent(false);
            setOtp('');
            setPassword('');
          } else {
            setError('Failed to reset password.');
          }
        } catch (err) {
          setError('Error resetting password.');
        } finally {
          setLoading(false);
        }
        return;
      }
    }

    if (isRegistering && !isOtpSent) {
      return handleSendOtp(e);
    }

    if (isRegistering && isOtpSent) {
      if (otp !== generatedOtp) {
        setError('Invalid OTP. Please try again.');
        setLoading(false);
        return;
      }
    }

    const endpoint = isRegistering ? '/api/users/register' : '/api/users/login';
    const body = isRegistering 
      ? { email, password, name, username, role, language, phone } 
      : { email, password, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      setUser(data);
      localStorage.setItem('tracto_user', JSON.stringify(data));
      if (data.language) setLanguage(data.language);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateJobStatus = async (bookingId: number) => {
    const newStatus = prompt('Enter new progress percentage (0-100):', '70');
    if (newStatus !== null) {
      const progress = parseInt(newStatus);
      if (!isNaN(progress) && progress >= 0 && progress <= 100) {
        // In a real app, we'd update the database. For now, we'll just show an alert.
        alert(`Job progress updated to ${progress}%`);
      }
    }
  };

  const handleCallFarmer = (farmerName: string, farmerPhone: string) => {
    setSelectedFarmer({ name: farmerName, phone: farmerPhone });
    setIsCallingFarmer(true);
  };

  const handleBooking = async (intent: any) => {
    if (!user) return;
    
    // Get current location for distance filtering
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setPendingBookingData({
        acres: intent.acres,
        date: intent.date,
        location: intent.location,
        farmer_phone: intent.phone || user.phone,
        farmer_address: intent.farmerAddress || user.address,
        service_type: intent.serviceType || selectedService || 'Plowing',
        farmer_id: user.id,
        latitude,
        longitude
      });
      setIsMatchingTractors(true);
    }, (err) => {
      console.warn('Geolocation failed, using default search', err);
      setPendingBookingData({
        acres: intent.acres,
        date: intent.date,
        location: intent.location,
        farmer_phone: intent.phone || user.phone,
        farmer_address: intent.farmerAddress || user.address,
        service_type: intent.serviceType || selectedService || 'Plowing',
        farmer_id: user.id,
      });
      setIsMatchingTractors(true);
    });
  };

  const finalizeBooking = async (tractorId?: number) => {
    if (!user || !pendingBookingData) return;
    
    setLoading(true);
    const bookingData = {
      ...pendingBookingData,
      tractor_id: tractorId || null,
    };

    await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });
    
    fetchBookings();
    setIsMatchingTractors(false);
    setPendingBookingData(null);
    setLoading(false);
    setView('bookings');
  };

  const markNotificationAsRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
    fetchNotifications();
  };

  const updateBookingStatus = async (id: number, status: string, tractor_id?: number) => {
    if (!user) return;
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, tractor_id, provider_id: user.id }),
    });
    fetchBookings();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-earth-100 relative overflow-hidden">
        {/* Realistic Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/farming/1920/1080" 
            alt="Farming Background" 
            className="w-full h-full object-cover opacity-20"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-earth-100/50 to-earth-100" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 relative z-10"
        >
            <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-moss-600 rounded-3xl flex items-center justify-center shadow-lg mb-4 rotate-3 relative overflow-hidden">
              <TractorIcon className="w-10 h-10 text-white z-10" />
              <Sprout className="w-8 h-8 text-white/30 absolute -bottom-1 -right-1 rotate-12" />
            </div>
            <h1 className="text-3xl font-bold text-moss-700 font-serif">TRACTO FARM SERVICES</h1>
            <p className="text-slate-500 text-xs mt-1 text-center">Smart Agricultural Service Booking</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {isRegistering && !isOtpSent && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-moss-600 transition-all outline-none text-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Username
                  </label>
                  <div className="relative">
                    <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="Choose a unique username"
                      className={`w-full pl-12 pr-4 py-4 bg-earth-50 border-none rounded-2xl focus:ring-2 transition-all outline-none text-lg ${
                        isUsernameAvailable === true ? 'focus:ring-moss-600' : isUsernameAvailable === false ? 'focus:ring-red-500' : 'focus:ring-slate-300'
                      }`}
                    />
                    {isUsernameAvailable === true && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-moss-600" />}
                    {isUsernameAvailable === false && <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />}
                  </div>
                  {isUsernameAvailable === false && <p className="text-[10px] text-red-500 mt-1 ml-1 font-bold">Username already taken</p>}
                </div>
              </div>
            )}

            {!isOtpSent || isForgotPassword ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-12 pr-4 py-4 bg-earth-50 border-none rounded-2xl focus:ring-2 focus:ring-moss-600 transition-all outline-none text-lg disabled:opacity-50"
                      disabled={isOtpSent && isForgotPassword}
                    />
                  </div>
                </div>

                {isForgotPassword && isOtpSent && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                      Enter OTP
                    </label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="6-digit OTP"
                        className="w-full pl-12 pr-4 py-4 bg-earth-50 border-none rounded-2xl focus:ring-2 focus:ring-moss-600 transition-all outline-none text-lg tracking-widest text-center"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    {isForgotPassword ? 'New Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isForgotPassword ? "Enter new password" : "Enter your password"}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-moss-600 transition-all outline-none text-lg"
                    />
                  </div>
                  {!isRegistering && !isForgotPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setIsOtpSent(false);
                        setOtp('');
                      }}
                      className="text-[10px] font-bold text-moss-600 mt-2 ml-1 cursor-pointer hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>

                {isRegistering && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter 10 digit number"
                        className="w-full pl-12 pr-4 py-4 bg-earth-50 border-none rounded-2xl focus:ring-2 focus:ring-moss-600 transition-all outline-none text-lg"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Enter OTP
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    className="w-full pl-12 pr-4 py-4 bg-earth-50 border-none rounded-2xl focus:ring-2 focus:ring-moss-600 transition-all outline-none text-lg tracking-widest text-center"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  OTP sent to {email}
                </p>
              </div>
            )}

            {(!isOtpSent || !isRegistering) && !isForgotPassword && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  {isRegistering ? 'Register as...' : 'Login as...'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('farmer')}
                    className={`py-3 rounded-xl text-[10px] font-bold transition-all border-2 ${
                      role === 'farmer' ? 'bg-moss-600 text-white border-moss-600' : 'bg-white text-slate-500 border-slate-100'
                    }`}
                  >
                    Farmer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('provider')}
                    className={`py-3 rounded-xl text-[10px] font-bold transition-all border-2 ${
                      role === 'provider' ? 'bg-moss-600 text-white border-moss-600' : 'bg-white text-slate-500 border-slate-100'
                    }`}
                  >
                    Service Provider
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {['en', 'te', 'hi'].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    language === l ? 'bg-earth-200 text-moss-700 border-2 border-earth-200' : 'bg-earth-50 text-slate-500 border-2 border-transparent'
                  }`}
                >
                  {l === 'en' ? 'English' : l === 'te' ? 'తెలుగు' : 'हिन्दी'}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-moss-600 text-white rounded-2xl font-semibold text-lg shadow-xl hover:bg-moss-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                isForgotPassword ? (isOtpSent ? 'Reset Password' : 'Send Reset OTP') :
                isRegistering ? (isOtpSent ? 'Verify & Register' : 'Send OTP') : 'Login'
              )}
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (isForgotPassword) {
                  setIsForgotPassword(false);
                } else {
                  setIsRegistering(!isRegistering);
                }
                setError('');
                setIsOtpSent(false);
                setOtp('');
              }}
              className="w-full text-center text-sm font-semibold text-moss-600 mt-2"
            >
              {isForgotPassword ? 'Back to Login' : (isRegistering ? 'Already have an account? Login' : "Don't have an account? Register")}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            By continuing, you agree to our Terms of Service
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-50 pb-24 relative overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img 
          src="https://picsum.photos/seed/tractor/1920/1080" 
          alt="Dashboard Background" 
          className="w-full h-full object-cover opacity-[0.03]"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-earth-200 px-6 py-4 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-moss-600 rounded-xl flex items-center justify-center shadow-md shrink-0 relative overflow-hidden">
            <TractorIcon className="w-5 h-5 text-white z-10" />
            <Sprout className="w-4 h-4 text-white/30 absolute -bottom-1 -right-1" />
          </div>
          <div>
            <h2 className="font-bold text-moss-700 font-serif leading-none">TRACTO FARM SERVICES</h2>
            <span className="text-[10px] text-moss-600 font-bold uppercase tracking-widest">{user.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-moss-600/10 rounded-full border border-moss-600/20">
            <div className="w-2 h-2 bg-moss-600 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-moss-600 uppercase tracking-widest">Live Safety Active</span>
          </div>
          <button onClick={() => {
            fetchBookings();
            fetchNotifications();
          }} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setView('notifications')} className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <Bell className="w-6 h-6" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-clay-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                {notifications.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setView('profile')}
            className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm hover:bg-slate-300 transition-colors cursor-pointer"
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-6 h-6 text-slate-500" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Welcome Section */}
              <section>
                <h1 className="text-3xl font-bold text-slate-900 font-serif mb-2">
                  {language === 'te' ? `నమస్కారం, ${user.name}` : language === 'hi' ? `नमस्ते, ${user.name}` : `Hello, ${user.name}`}
                </h1>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <MapPin className="w-4 h-4 text-moss-600" />
                  <span>{userLocation}</span>
                  <button 
                    onClick={() => {
                      const newLoc = prompt('Enter your village/location:', userLocation);
                      if (newLoc) setUserLocation(newLoc);
                    }}
                    className="text-[10px] font-bold text-moss-600 uppercase tracking-widest hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
                <p className="text-slate-500 text-sm mt-2">
                  {user.role === 'farmer' ? 'Book tractors & agricultural services easily.' : 
                   user.role === 'provider' ? 'Manage your fleet and service bookings.' : 
                   'Help farmers book agricultural services.'}
                </p>
              </section>

              {/* Farmer Specific View */}
              {user.role === 'farmer' && (
                <>
                  {/* Emergency Alert Button */}
                  <div className="p-4 bg-clay-500/10 rounded-2xl border border-clay-500/20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-clay-600 rounded-2xl flex items-center justify-center shadow-lg shadow-clay-200 animate-pulse">
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-clay-600 uppercase tracking-tight">Emergency Alert</h4>
                        <p className="text-[10px] text-clay-600 font-bold">Need immediate help? Tap to notify nearby providers.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSendAlert('emergency')}
                      disabled={isSendingAlert}
                      className="px-4 py-2 bg-clay-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-clay-700 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSendingAlert ? 'Sending...' : 'Alert'}
                    </button>
                  </div>

                  {/* Weather Alerts */}
                  <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                        <CloudRain className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-sky-700 uppercase tracking-widest">Weather: {weather.condition}</h4>
                          <span className="text-[8px] font-bold text-sky-500">{weather.temp} • {weather.humidity} Humidity</span>
                        </div>
                        <p className="text-[10px] text-sky-600 font-medium">Current location: {userLocation}. Updates every 5 seconds.</p>
                      </div>
                      <button 
                        onClick={() => setIsChangingLocation(!isChangingLocation)}
                        className="p-2 bg-sky-100 text-sky-600 rounded-lg hover:bg-sky-200 transition-colors cursor-pointer"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                    </div>

                    {isChangingLocation && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="flex gap-2"
                      >
                        <input 
                          type="text" 
                          placeholder="Enter village name..."
                          value={newLocationInput}
                          onChange={(e) => setNewLocationInput(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <button 
                          onClick={() => {
                            if (newLocationInput.trim()) {
                              setUserLocation(newLocationInput);
                              setWeather(prev => ({ ...prev, location: newLocationInput }));
                              setNewLocationInput('');
                              setIsChangingLocation(false);
                            }
                          }}
                          className="px-4 py-2 bg-sky-600 text-white rounded-xl text-[10px] font-bold uppercase"
                        >
                          Set
                        </button>
                      </motion.div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: 'Plowing', icon: TractorIcon, color: 'bg-clay-500/10 text-clay-600' },
                      { name: 'Sowing', icon: Sprout, color: 'bg-moss-600/10 text-moss-600' },
                      { name: 'Manuring', icon: Wheat, color: 'bg-earth-200 text-moss-700' },
                      { name: 'Irrigation', icon: Droplets, color: 'bg-earth-100 text-moss-600' },
                      { name: 'Weeding', icon: Scissors, color: 'bg-earth-200 text-clay-600' },
                      { name: 'Harvesting', icon: Wheat, color: 'bg-earth-100 text-clay-600' },
                    ].map((service) => (
                      <button 
                        key={service.name} 
                        onClick={() => {
                          setSelectedService(service.name);
                          setView('manual_booking');
                        }}
                        className="p-4 bg-white rounded-2xl shadow-sm border border-earth-200 flex flex-col items-center gap-2 text-center transition-all border-transparent hover:border-moss-600"
                      >
                        <div className={`w-10 h-10 ${service.color} rounded-xl flex items-center justify-center`}>
                          <service.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{service.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Government Schemes */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Government Schemes</h3>
                      <button 
                        onClick={() => setView('schemes')}
                        className="text-[10px] font-bold text-moss-600 hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-2">
                      {[
                        { title: 'PM Kisan Scheme', desc: 'Direct benefit transfer of ₹6,000 per year.', date: 'Mar 10' },
                        { title: 'Tractor Subsidy', desc: 'Get up to 50% subsidy on tractor rentals.', date: 'Mar 15' },
                      ].map((scheme, i) => (
                        <div key={i} className="p-3 bg-white rounded-xl border border-earth-200 flex items-center justify-between gap-4">
                          <div>
                            <h5 className="text-[10px] font-bold text-slate-900">{scheme.title}</h5>
                            <p className="text-[8px] text-slate-500">{scheme.desc}</p>
                          </div>
                          <button 
                            onClick={() => {
                              const speech = new SpeechSynthesisUtterance(scheme.title + ". " + scheme.desc);
                              speech.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
                              window.speechSynthesis.speak(speech);
                            }}
                            className="p-2 bg-earth-100 text-moss-600 rounded-lg hover:bg-earth-200 transition-colors"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Provider Specific View */}
              {user.role === 'provider' && (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Active Fleet</p>
                      <h3 className="text-4xl font-bold font-serif">{tractors.length} Tractors</h3>
                      <div className="mt-4 flex gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-moss-600/20 text-moss-600 text-[10px] font-bold rounded-full border border-moss-600/30">
                          <CheckCircle2 className="w-3 h-3" />
                          {tractors.filter(t => t.status === 'available').length} AVAILABLE
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-clay-500/20 text-clay-500 text-[10px] font-bold rounded-full border border-clay-500/30">
                          <Clock className="w-3 h-3" />
                          {tractors.filter(t => t.status === 'busy').length} BUSY
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Today's Earnings</p>
                            <p className="text-2xl font-black text-moss-600">₹4,200</p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Jobs Done</p>
                            <p className="text-2xl font-black text-white">12</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <TractorIcon className="absolute -right-8 -bottom-8 w-40 h-40 text-white/5 -rotate-12" />
                  </div>

                  {/* Active Job Tracking */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest ml-1">Live Job Status</h3>
                    <div className="p-4 bg-white rounded-2xl border border-earth-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-moss-600/10 rounded-xl flex items-center justify-center">
                            <TractorIcon className="w-5 h-5 text-moss-600" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">Mahindra Arjun 555</h4>
                            <p className="text-[10px] text-slate-500">Plowing • 2.5 Acres • Ramapur</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-moss-600 text-white text-[8px] font-black rounded-full animate-pulse">LIVE</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                          <span>Progress</span>
                          <span>65%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="w-[65%] h-full bg-moss-600" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleUpdateJobStatus(1)} // Mock ID
                          className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold cursor-pointer hover:bg-slate-800 transition-colors"
                        >
                          Update Status
                        </button>
                        <button 
                          onClick={() => handleCallFarmer('Ramesh Kumar', '+91 98765 43210')}
                          className="px-4 py-2 bg-earth-100 text-moss-600 rounded-xl text-[10px] font-bold flex items-center gap-2 cursor-pointer"
                        >
                          <Phone className="w-3 h-3" /> Call Farmer
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold font-serif text-slate-900">Your Fleet</h3>
                      <button onClick={() => setView('profile')} className="text-moss-600 text-sm font-bold cursor-pointer">Manage</button>
                    </div>
                    
                    {/* Status Filter */}
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {['all', 'available', 'busy', 'maintenance'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setTractorFilter(status as any)}
                          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border flex items-center gap-2 ${
                            tractorFilter === status 
                              ? 'bg-moss-600 text-white border-moss-600 shadow-lg shadow-moss-200' 
                              : 'bg-white text-slate-400 border-earth-200 hover:border-moss-600'
                          }`}
                        >
                          {status === 'available' && <CheckCircle2 className="w-3 h-3" />}
                          {status === 'busy' && <Clock className="w-3 h-3" />}
                          {status === 'maintenance' && <AlertTriangle className="w-3 h-3" />}
                          {status}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
                      {tractors
                        .filter(t => tractorFilter === 'all' || t.status === tractorFilter)
                        .map(t => (
                        <div 
                          key={t.id} 
                          onClick={() => setSelectedTractorDetails(t)}
                          className={`min-w-[200px] bg-white rounded-3xl border shadow-sm overflow-hidden cursor-pointer transition-all hover:scale-[1.02] ${
                            t.status === 'available' ? 'border-moss-600/20 hover:border-moss-600' :
                            t.status === 'busy' ? 'border-clay-500/20 hover:border-clay-500' :
                            'border-clay-600/20 hover:border-clay-600'
                          }`}
                        >
                          <div className="h-24 bg-slate-100 relative">
                            <img 
                              src={t.image_url || `https://picsum.photos/seed/${t.model}/400/200`} 
                              alt={t.model}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                              <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg backdrop-blur-md ${
                                t.status === 'available' ? 'bg-moss-600/90 text-white' : 
                                t.status === 'busy' ? 'bg-clay-500/90 text-white' : 
                                'bg-clay-600/90 text-white'
                              }`}>
                                {t.status === 'available' && <CheckCircle2 className="w-2 h-2" />}
                                {t.status === 'busy' && <Clock className="w-2 h-2" />}
                                {t.status === 'maintenance' && <AlertTriangle className="w-2 h-2" />}
                                {t.status}
                              </span>
                              <span className="px-2 py-1 bg-slate-900/80 text-moss-600 text-[8px] font-black rounded-full shadow-lg backdrop-blur-md border border-white/10">
                                {t.ai_health_score || 95}% HEALTH
                              </span>
                            </div>
                            {/* Status Bar */}
                            <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                              t.status === 'available' ? 'bg-moss-600' :
                              t.status === 'busy' ? 'bg-clay-500' :
                              'bg-clay-600'
                            }`} />
                          </div>
                          <div className="p-3">
                            <h4 className="font-bold text-slate-900 text-sm">{t.model}</h4>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {t.location}
                              </p>
                              <p className="text-[10px] font-bold text-moss-600">₹{t.price_per_acre}/ac</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {tractors.length === 0 && (
                        <div className="w-full p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                          <TractorIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 font-bold">No tractors added yet</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold font-serif text-slate-900">New Requests</h3>
                    <button onClick={() => setView('bookings')} className="text-moss-600 text-sm font-bold cursor-pointer">View All</button>
                  </div>

                  <div className="space-y-4">
                    {bookings.filter(b => b.status === 'pending').slice(0, 3).map(booking => (
                      <div key={booking.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                              <UserIcon className="w-6 h-6 text-slate-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900">{booking.farmer_name}</h4>
                                <span className="text-[10px] text-moss-600 font-bold">@{booking.farmer_username}</span>
                              </div>
                              <p className="text-[10px] font-bold text-moss-600 uppercase mb-1">{booking.service_type}</p>
                              <p className="text-xs text-slate-500">{booking.acres} Acres • {booking.location}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <select 
                            className="flex-1 p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-moss-600 cursor-pointer"
                            onChange={(e) => {
                              if (e.target.value === 'add_new') {
                                setView('profile'); // Or a dedicated add tractor view if we had one
                                return;
                              }
                              setSelectedTractorId(parseInt(e.target.value));
                            }}
                            value={selectedTractorId || ''}
                          >
                            <option value="">Select Tractor</option>
                            {tractors.map(t => (
                              <option key={t.id} value={t.id}>{t.model}</option>
                            ))}
                            <option value="add_new">+ Add New Tractor</option>
                          </select>
                          <button 
                            onClick={() => {
                              if (!selectedTractorId) {
                                alert('Please select a tractor first.');
                                return;
                              }
                              updateBookingStatus(booking.id, 'accepted', selectedTractorId);
                              setSelectedTractorId(null);
                            }}
                            className="p-2 bg-moss-600 text-white rounded-xl hover:bg-moss-700 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                            className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'manual_booking' && (
            <motion.div
              key="manual_booking"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setView('home')} className="p-2 bg-slate-100 rounded-full cursor-pointer">
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
                <h2 className="text-2xl font-bold font-serif text-slate-900">Book {selectedService}</h2>
              </div>

              <form onSubmit={handleManualBooking} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Acres</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={manualAcres}
                    onChange={(e) => setManualAcres(e.target.value)}
                    placeholder="e.g. 2.5"
                    className="w-full p-4 bg-white border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-moss-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Date</label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full p-4 bg-white border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-moss-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Location</label>
                  <input
                    type="text"
                    required
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder="Village/Town name"
                    className="w-full p-4 bg-white border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-moss-600"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Contact Number</label>
                    <input
                      type="tel"
                      required
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      placeholder="Your phone number"
                      className="w-full p-4 bg-white border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-moss-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Full Address</label>
                    <input
                      type="text"
                      required
                      value={manualFarmerAddress}
                      onChange={(e) => setManualFarmerAddress(e.target.value)}
                      placeholder="Street, Landmark, etc."
                      className="w-full p-4 bg-white border border-earth-200 rounded-2xl outline-none focus:ring-2 focus:ring-moss-600"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-moss-600 text-white rounded-2xl font-bold shadow-lg hover:bg-moss-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Confirm Booking'}
                </button>
              </form>
            </motion.div>
          )}

          {view === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold font-serif text-slate-900">Booking History</h2>
              <div className="space-y-4">
                {bookings.map(booking => (
                  <div key={booking.id} className="p-5 bg-white rounded-3xl border border-earth-200 shadow-sm space-y-4">
                    {editingBookingId === booking.id ? (
                      <form onSubmit={handleUpdateBookingDetails} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Acres</label>
                            <input
                              type="number"
                              value={editBookingAcres}
                              onChange={(e) => setEditBookingAcres(e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Service</label>
                            <select
                              value={editBookingService}
                              onChange={(e) => setEditBookingService(e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-sm"
                            >
                              <option value="Plowing">Plowing</option>
                              <option value="Sowing">Sowing</option>
                              <option value="Harvesting">Harvesting</option>
                              <option value="Spraying">Spraying</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Date</label>
                          <input
                            type="date"
                            value={editBookingDate}
                            onChange={(e) => setEditBookingDate(e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Location</label>
                          <input
                            type="text"
                            value={editBookingLocation}
                            onChange={(e) => setEditBookingLocation(e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 py-3 bg-moss-600 text-white rounded-xl text-xs font-bold cursor-pointer">Save Changes</button>
                          <button type="button" onClick={() => setEditingBookingId(null)} className="flex-1 py-3 bg-earth-100 text-moss-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                booking.status === 'accepted' ? 'bg-moss-600/10 text-moss-600' :
                                booking.status === 'pending' ? 'bg-clay-500/10 text-clay-500' :
                                booking.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {booking.status}
                              </span>
                              {user.role === 'farmer' && booking.status === 'pending' && (
                                <button 
                                  onClick={() => handleCancelBooking(booking.id)}
                                  className="text-[10px] text-red-600 font-bold hover:underline cursor-pointer"
                                >
                                  Cancel
                                </button>
                              )}
                              {user.role === 'provider' && booking.farmer_username && (
                                <span className="text-[10px] text-moss-600 font-bold">@{booking.farmer_username}</span>
                              )}
                              {user.role === 'farmer' && booking.provider_username && (
                                <span className="text-[10px] text-moss-600 font-bold">@{booking.provider_username}</span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">{booking.acres} Acres {booking.service_type}</h3>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Date</p>
                            <p className="text-sm font-semibold text-slate-700">{booking.date}</p>
                          </div>
                        </div>

                        {viewingBookingId === booking.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="pt-4 border-t border-slate-50 space-y-3"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Location</p>
                                <p className="text-xs font-medium text-slate-700">{booking.location}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Service Type</p>
                                <p className="text-xs font-medium text-slate-700">{booking.service_type}</p>
                              </div>
                            </div>
                            {user.role === 'farmer' && booking.provider_name && (
                              <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Provider</p>
                                <p className="text-xs font-medium text-slate-700">{booking.provider_name} ({booking.provider_phone})</p>
                              </div>
                            )}
                            {user.role === 'provider' && booking.farmer_name && (
                              <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Farmer</p>
                                <p className="text-xs font-medium text-slate-700">{booking.farmer_name} ({booking.farmer_phone})</p>
                              </div>
                            )}
                          </motion.div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <button 
                            onClick={() => setViewingBookingId(viewingBookingId === booking.id ? null : booking.id)}
                            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                          >
                            <Info className="w-3 h-3" />
                            {viewingBookingId === booking.id ? 'Hide Details' : 'View Details'}
                          </button>

                          <div className="flex gap-3">
                            {user.role === 'farmer' && booking.status === 'pending' && (
                              <button 
                                onClick={() => {
                                  setEditingBookingId(booking.id);
                                  setEditBookingAcres(booking.acres.toString());
                                  setEditBookingDate(booking.date);
                                  setEditBookingLocation(booking.location);
                                  setEditBookingService(booking.service_type);
                                }}
                                className="text-[10px] font-bold text-moss-600 uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </button>
                            )}
                             {user.role === 'provider' && booking.status === 'accepted' && (
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => handleCallFarmer(booking.farmer_name || 'Farmer', booking.farmer_phone || 'N/A')}
                                  className="text-[10px] font-bold text-moss-600 uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                                >
                                  <Phone className="w-3 h-3" />
                                  Call
                                </button>
                                <button 
                                  onClick={() => updateBookingStatus(booking.id, 'completed')}
                                  className="text-[10px] font-bold text-moss-600 uppercase tracking-widest cursor-pointer"
                                >
                                  Mark Completed
                                </button>
                              </div>
                            )}
                            {user.role === 'farmer' && booking.status === 'completed' && !booking.rating && (
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      onClick={() => {
                                        const feedback = prompt('Any feedback for the service?');
                                        handleRateBooking(booking.id, star, feedback || '');
                                      }}
                                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                                    >
                                      <Star className={`w-4 h-4 ${star <= (booking.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                                    </button>
                                  ))}
                                </div>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">Rate Service</span>
                              </div>
                            )}
                            {booking.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs font-bold text-slate-700">{booking.rating}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold font-serif text-slate-900">Notifications</h2>
              <div className="space-y-3">
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => markNotificationAsRead(n.id)}
                    className={`p-4 bg-white rounded-2xl border-l-4 shadow-sm cursor-pointer transition-all hover:bg-earth-50 ${
                      n.type === 'read' ? 'border-earth-200 opacity-60' : 
                      n.type === 'alert' ? 'border-clay-500 bg-clay-500/5' : 'border-moss-600'
                    }`}
                  >
                    <p className="text-sm text-slate-700">{n.message}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(n.created_at).toLocaleTimeString()}
                      </span>
                      {n.type !== 'read' && (
                        <span className="text-[8px] font-bold text-moss-600 uppercase">New</span>
                      )}
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400">No notifications yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'schemes' && (
            <motion.div
              key="schemes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pb-20"
            >
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setView('home')} className="p-2 bg-slate-100 rounded-full cursor-pointer">
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
                <h2 className="text-2xl font-bold font-serif text-slate-900">Government Schemes</h2>
              </div>

              <div className="space-y-4">
                {[
                  { title: 'PM Kisan Samman Nidhi', desc: 'Financial assistance of ₹6,000 per year to small and marginal farmers.', status: 'Active', color: 'bg-moss-600' },
                  { title: 'PM Fasal Bima Yojana', desc: 'Crop insurance scheme to provide financial support in case of crop failure.', status: 'Apply Now', color: 'bg-clay-600' },
                  { title: 'Tractor Subsidy Scheme', desc: 'Get up to 50% subsidy on purchase of new tractors and machinery.', status: 'Mar 15 Deadline', color: 'bg-sky-600' },
                  { title: 'Soil Health Card', desc: 'Free soil testing and recommendations for balanced use of fertilizers.', status: 'Available', color: 'bg-earth-600' },
                  { title: 'Kisan Credit Card', desc: 'Easy credit for agricultural needs at low interest rates.', status: 'Active', color: 'bg-indigo-600' },
                ].map((scheme, i) => (
                  <div key={i} className="p-6 bg-white rounded-3xl border border-earth-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className={`px-3 py-1 ${scheme.color} text-white text-[8px] font-black rounded-full uppercase tracking-widest`}>
                        {scheme.status}
                      </div>
                      <button 
                        onClick={() => {
                          const speech = new SpeechSynthesisUtterance(scheme.title + ". " + scheme.desc);
                          speech.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
                          window.speechSynthesis.speak(speech);
                        }}
                        className="p-2 bg-earth-100 text-moss-600 rounded-full hover:bg-earth-200 transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{scheme.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{scheme.desc}</p>
                    </div>
                    <button 
                      onClick={() => alert(`Redirecting to ${scheme.title} application portal...`)}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      Learn More & Apply
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 pb-20"
            >
              {/* Search User */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Find User</h3>
                <form onSubmit={handleSearchUser} className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isSearching ? (
                      <Loader2 className="w-5 h-5 text-moss-600 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Search by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                    className="w-full pl-12 pr-24 py-4 bg-white border border-earth-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-moss-600 transition-all outline-none"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchQuery && (
                      <button 
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResult(null);
                        }}
                        className="p-2 text-slate-300 hover:text-slate-500 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-moss-600 text-white rounded-xl text-xs font-bold hover:bg-moss-700 transition-all cursor-pointer shadow-sm"
                    >
                      Search
                    </button>
                  </div>
                </form>

                <AnimatePresence>
                  {/* Search Result Modal */}
                  {searchResult && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSearchResult(null)}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
                      >
                        {/* Header/Banner */}
                        <div className="h-32 bg-moss-600 relative">
                          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                          <button 
                            onClick={() => setSearchResult(null)}
                            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all cursor-pointer z-20"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Profile Info */}
                        <div className="px-8 pb-8 -mt-12 relative z-10">
                          <div className="flex items-end gap-4 mb-6">
                            <div className="w-24 h-24 bg-white rounded-3xl p-1 shadow-xl">
                              <div className="w-full h-full bg-earth-100 rounded-[1.25rem] flex items-center justify-center">
                                <UserIcon className="w-12 h-12 text-moss-600" />
                              </div>
                            </div>
                            <div className="pb-2">
                              <h2 className="text-2xl font-black text-slate-900 leading-tight">{searchResult.name}</h2>
                              <p className="text-moss-600 font-bold">@{searchResult.username}</p>
                            </div>
                          </div>

                          <div className="space-y-6">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                              <span className="px-3 py-1 bg-earth-200 text-moss-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                                {searchResult.role}
                              </span>
                              <span className="px-3 py-1 bg-earth-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                                <Languages className="w-3 h-3" />
                                {searchResult.language === 'en' ? 'English' : searchResult.language === 'te' ? 'Telugu' : 'Hindi'}
                              </span>
                              <span className="px-3 py-1 bg-moss-600/10 text-moss-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                                Active
                              </span>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 gap-4">
                              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                  <Mail className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                                  <p className="text-sm font-bold text-slate-700">{searchResult.email}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                  <Phone className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</p>
                                  <p className="text-sm font-bold text-slate-700">{searchResult.phone}</p>
                                </div>
                              </div>

                              {searchResult.last_active && (
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                    <Calendar className="w-5 h-5 text-slate-400" />
                                  </div>
                                  <div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Last Active</p>
                                    <p className="text-sm font-bold text-slate-700">
                                      {new Date(searchResult.last_active).toLocaleDateString()} at {new Date(searchResult.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {searchResult.address && (
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                    <MapPin className="w-5 h-5 text-slate-400" />
                                  </div>
                                  <div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Address</p>
                                    <p className="text-sm font-bold text-slate-700">{searchResult.address}</p>
                                  </div>
                                </div>
                              )}

                              {searchResult.bio && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bio</p>
                                  <p className="text-xs text-slate-600 italic leading-relaxed">"{searchResult.bio}"</p>
                                </div>
                              )}

                              {searchResult.experience && (
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                    <Briefcase className="w-5 h-5 text-slate-400" />
                                  </div>
                                  <div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Experience</p>
                                    <p className="text-sm font-bold text-slate-700">{searchResult.experience}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <button 
                              onClick={() => setSearchResult(null)}
                              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 transition-all cursor-pointer"
                            >
                              Close Profile
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                  {/* Tractor Details Modal */}
                  {selectedTractorDetails && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedTractorDetails(null)}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
                      >
                        <div className="h-48 bg-slate-100 relative">
                          <img 
                            src={selectedTractorDetails.image_url || `https://picsum.photos/seed/${selectedTractorDetails.model}/600/400`} 
                            alt={selectedTractorDetails.model}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button 
                            onClick={() => setSelectedTractorDetails(null)}
                            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-md transition-all cursor-pointer z-20"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="px-8 pb-8 pt-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedTractorDetails.model}</h2>
                              <p className="text-moss-600 font-bold flex items-center gap-1 mt-1">
                                <MapPin className="w-4 h-4" /> {selectedTractorDetails.location}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              selectedTractorDetails.status === 'available' ? 'bg-moss-600/10 text-moss-600' : 'bg-clay-500/10 text-clay-500'
                            }`}>
                              {selectedTractorDetails.status}
                            </span>
                          </div>

                          <div className="space-y-6">
                            {/* AI Health Score */}
                            <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-bold text-moss-600 uppercase tracking-widest">AI Health Score</p>
                                <span className="text-xl font-black text-white">{selectedTractorDetails.ai_health_score || 95}%</span>
                              </div>
                              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${selectedTractorDetails.ai_health_score || 95}%` }}
                                  className={`h-full ${
                                    (selectedTractorDetails.ai_health_score || 95) > 80 ? 'bg-moss-600' : 
                                    (selectedTractorDetails.ai_health_score || 95) > 50 ? 'bg-clay-500' : 'bg-clay-600'
                                  }`}
                                />
                              </div>
                              {selectedTractorDetails.ai_maintenance_tip && (
                                <p className="text-[10px] text-slate-300 mt-3 flex items-start gap-2 italic">
                                  <Info className="w-3 h-3 shrink-0 mt-0.5 text-moss-600" />
                                  AI Tip: {selectedTractorDetails.ai_maintenance_tip}
                                </p>
                              )}
                            </div>

                            {/* Specifications Grid */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Power</p>
                                <p className="text-xs font-black text-slate-700">{selectedTractorDetails.hp || 45} HP</p>
                              </div>
                              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Year</p>
                                <p className="text-xs font-black text-slate-700">{selectedTractorDetails.year || 2022}</p>
                              </div>
                              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Fuel</p>
                                <p className="text-xs font-black text-slate-700">{selectedTractorDetails.fuel_type || 'Diesel'}</p>
                              </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Machinery Details</p>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {selectedTractorDetails.description || 'No description provided for this machinery.'}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-earth-100 rounded-2xl border border-earth-200">
                                <p className="text-[8px] font-bold text-moss-600 uppercase tracking-widest mb-1">Acre Price</p>
                                <p className="text-lg font-black text-moss-700">₹{selectedTractorDetails.price_per_acre}<span className="text-[10px] font-bold">/acre</span></p>
                              </div>
                              <div className="p-4 bg-clay-500/10 rounded-2xl border border-clay-500/20">
                                <p className="text-[8px] font-bold text-clay-600 uppercase tracking-widest mb-1">Hour Price</p>
                                <p className="text-lg font-black text-clay-700">₹{selectedTractorDetails.price_per_hour}<span className="text-[10px] font-bold">/hr</span></p>
                              </div>
                            </div>

                            {/* Booking History */}
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <History className="w-4 h-4 text-moss-600" />
                                Past Bookings
                              </h3>
                              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {tractorBookingHistory.length > 0 ? (
                                  [...tractorBookingHistory]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map(b => (
                                      <div key={b.id} className="p-3 bg-white border border-earth-200 rounded-xl flex items-center justify-between shadow-sm">
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <p className="text-xs font-bold text-slate-800">{b.service_type}</p>
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                                              b.status === 'completed' ? 'bg-moss-600/10 text-moss-600' : 
                                              b.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                              {b.status}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {b.date} • {b.acres} acres
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-[10px] font-black text-moss-700">{b.farmer_name || b.farmer_username}</p>
                                          <p className="text-[8px] text-slate-400">Farmer</p>
                                        </div>
                                      </div>
                                    ))
                                ) : (
                                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-[10px] text-slate-400 italic">No past bookings recorded for this machinery.</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Maintenance History */}
                            <div>
                              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-clay-600" />
                                Maintenance History
                              </h3>
                              <div className="space-y-2">
                                {selectedTractorDetails.maintenance_history && selectedTractorDetails.maintenance_history.length > 0 ? (
                                  selectedTractorDetails.maintenance_history.map((log, idx) => (
                                    <div key={idx} className="p-3 bg-clay-50 rounded-xl border border-clay-100">
                                      <div className="flex justify-between items-start mb-1">
                                        <p className="text-xs font-bold text-slate-900">{log.type}</p>
                                        <span className="text-[10px] font-bold text-clay-600">₹{log.cost}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-500">{log.date}</p>
                                      <p className="text-[10px] text-slate-600 mt-1 italic">{log.notes}</p>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                    <p className="text-xs text-slate-400 italic">No maintenance logs recorded yet.</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Last service: {selectedTractorDetails.last_service || 'N/A'}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* AI Analysis Section */}
                            <div className="pt-4 border-t border-earth-200">
                              {!aiReport ? (
                                <button 
                                  onClick={handleGenerateAIReport}
                                  disabled={isGeneratingReport}
                                  className="w-full py-4 bg-moss-600 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-moss-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                                >
                                  {isGeneratingReport ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Analyzing Machinery...
                                    </>
                                  ) : (
                                    <>
                                      <Mic className="w-4 h-4" />
                                      Generate AI Performance Report
                                    </>
                                  )}
                                </button>
                              ) : (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="p-5 bg-earth-100 rounded-3xl border border-earth-200"
                                >
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 bg-moss-600 rounded-full flex items-center justify-center">
                                      <TractorIcon className="w-3 h-3 text-white" />
                                    </div>
                                    <h4 className="text-xs font-bold text-moss-700 uppercase tracking-widest">AI Performance Report</h4>
                                  </div>
                                  <div className="text-xs text-moss-600 leading-relaxed whitespace-pre-wrap">
                                    {aiReport}
                                  </div>
                                  <button 
                                    onClick={() => setAiReport('')}
                                    className="mt-4 text-[10px] font-bold text-moss-600 hover:underline"
                                  >
                                    Clear Report
                                  </button>
                                </motion.div>
                              )}
                            </div>

                            <button 
                              onClick={() => setSelectedTractorDetails(null)}
                              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-slate-800 transition-all cursor-pointer"
                            >
                              Close Details
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-24 h-24 bg-earth-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                        {isCapturingPhoto ? (
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        ) : isEditingProfile && editAvatarUrl ? (
                          <img src={editAvatarUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserIcon className="w-12 h-12 text-moss-600" />
                        )}
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                      
                      {/* Edit Profile Button */}
                      <button 
                        onClick={() => {
                          setEditName(user.name);
                          setEditEmail(user.email);
                          setEditPhone(user.phone);
                          setEditLanguage(user.language);
                          setEditUsername(user.username);
                          setEditAddress(user.address || '');
                          setEditBio(user.bio || '');
                          setEditExperience(user.experience || '');
                          setEditAvatarUrl(user.avatar_url || '');
                          setIsEditingProfile(!isEditingProfile);
                        }}
                        className="absolute -right-1 -bottom-1 p-2 bg-moss-600 text-white rounded-full shadow-lg border-2 border-white hover:bg-moss-700 transition-colors cursor-pointer z-10"
                      >
                        {isEditingProfile ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      </button>

                      {/* Camera Button */}
                      <button 
                        onClick={() => {
                          if (isCapturingPhoto) {
                            capturePhoto();
                          } else {
                            startCamera();
                          }
                        }}
                        className="absolute -left-1 -bottom-1 p-2 bg-slate-900 text-white rounded-full shadow-lg border-2 border-white hover:bg-slate-800 transition-colors cursor-pointer z-10"
                      >
                        {isCapturingPhoto ? <Camera className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                      </button>

                      {isCapturingPhoto && (
                        <button 
                          onClick={stopCamera}
                          className="absolute -left-1 top-0 p-2 bg-red-500 text-white rounded-full shadow-lg border-2 border-white hover:bg-red-600 transition-colors cursor-pointer z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      {isEditingProfile && !isCapturingPhoto && (
                        <div className="absolute -top-1 -left-1">
                          <label className="p-2 bg-moss-600 text-white rounded-full shadow-lg border-2 border-white hover:bg-moss-700 transition-colors cursor-pointer flex items-center justify-center">
                            <PlusCircle className="w-4 h-4" />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleFileUpload}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold font-serif text-slate-900">{user.name}</h2>
                  <p className="text-moss-600 font-bold text-sm">@{user.username}</p>
                  <div className="flex flex-col items-center gap-1 mt-2">
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {user.email}
                    </p>
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {user.phone}
                    </p>
                    {user.address && (
                      <p className="text-slate-500 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {user.address}
                      </p>
                    )}
                  </div>
                  <span className="inline-block mt-3 px-3 py-1 bg-earth-200 text-moss-700 text-[10px] font-bold uppercase tracking-widest rounded-full">
                    {user.role}
                  </span>
                </div>
              </div>

              {isEditingProfile ? (
                <motion.form 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleUpdateProfile} 
                  className="space-y-4 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Full Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Username</label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Email</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Phone</label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Address</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                        placeholder="Your village/town address"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Bio</label>
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600 min-h-[100px]"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                    {user.role === 'provider' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Experience</label>
                        <input
                          type="text"
                          value={editExperience}
                          onChange={(e) => setEditExperience(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                          placeholder="e.g. 10 years in farming"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Language</label>
                      <select
                        value={editLanguage}
                        onChange={(e) => setEditLanguage(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="te">Telugu</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-moss-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-moss-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
                  </button>
                </motion.form>
              ) : (
                <div className="space-y-4">
                  {user.bio && (
                    <div className="p-4 bg-earth-50 rounded-2xl border border-earth-100 italic text-slate-600 text-xs">
                      "{user.bio}"
                    </div>
                  )}

                  {user.role === 'provider' && (
                  <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2">
                      <TractorIcon className="w-6 h-6 text-moss-600" />
                      Manage Fleet
                    </h3>
                    
                    <form onSubmit={handleAddTractor} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Tractor Model"
                          value={newTractorModel}
                          onChange={(e) => setNewTractorModel(e.target.value)}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Location"
                          value={newTractorLocation}
                          onChange={(e) => setNewTractorLocation(e.target.value)}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Image URL"
                          value={newTractorImage}
                          onChange={(e) => setNewTractorImage(e.target.value)}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                        />
                        <input
                          type="number"
                          placeholder="₹/Acre"
                          value={newTractorPrice}
                          onChange={(e) => setNewTractorPrice(e.target.value)}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                        />
                        <input
                          type="number"
                          placeholder="₹/Hour"
                          value={newTractorPerHour}
                          onChange={(e) => setNewTractorPerHour(e.target.value)}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          placeholder="Horsepower (HP)"
                          value={newTractorHp}
                          onChange={(e) => setNewTractorHp(e.target.value)}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                        />
                        <input
                          type="number"
                          placeholder="Year"
                          value={newTractorYear}
                          onChange={(e) => setNewTractorYear(e.target.value)}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <select
                          value={newTractorFuelType}
                          onChange={(e) => setNewTractorFuelType(e.target.value)}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                        >
                          <option value="Diesel">Diesel</option>
                          <option value="Petrol">Petrol</option>
                          <option value="Electric">Electric</option>
                        </select>
                        <div className="col-span-2 grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Last Service"
                            onFocus={(e) => e.target.type = 'date'}
                            onBlur={(e) => e.target.type = 'text'}
                            value={newTractorLastService}
                            onChange={(e) => setNewTractorLastService(e.target.value)}
                            className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                          />
                          <input
                            type="text"
                            placeholder="Next Service"
                            onFocus={(e) => e.target.type = 'date'}
                            onBlur={(e) => e.target.type = 'text'}
                            value={newTractorNextService}
                            onChange={(e) => setNewTractorNextService(e.target.value)}
                            className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600"
                          />
                        </div>
                      </div>
                      <textarea
                        placeholder="Description (Machinery details...)"
                        value={newTractorDescription}
                        onChange={(e) => setNewTractorDescription(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-moss-600 min-h-[80px]"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '+ Add Tractor'}
                      </button>
                    </form>

                    <div className="space-y-3">
                      {tractors.map(t => (
                        <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                          {editingTractorId === t.id ? (
                            <form onSubmit={handleUpdateTractor} className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={editTractorModel}
                                  onChange={(e) => setEditTractorModel(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                  placeholder="Model"
                                />
                                <input
                                  type="text"
                                  value={editTractorLocation}
                                  onChange={(e) => setEditTractorLocation(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                  placeholder="Location"
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  value={editTractorImage}
                                  onChange={(e) => setEditTractorImage(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                  placeholder="Image URL"
                                />
                                <input
                                  type="number"
                                  value={editTractorPrice}
                                  onChange={(e) => setEditTractorPrice(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                  placeholder="₹/Acre"
                                />
                                <input
                                  type="number"
                                  value={editTractorPerHour}
                                  onChange={(e) => setEditTractorPerHour(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                  placeholder="₹/Hour"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="number"
                                  value={editTractorHp}
                                  onChange={(e) => setEditTractorHp(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                  placeholder="HP"
                                />
                                <input
                                  type="number"
                                  value={editTractorYear}
                                  onChange={(e) => setEditTractorYear(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                  placeholder="Year"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={editTractorFuelType}
                                  onChange={(e) => setEditTractorFuelType(e.target.value)}
                                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                >
                                  <option value="Diesel">Diesel</option>
                                  <option value="Petrol">Petrol</option>
                                  <option value="Electric">Electric</option>
                                </select>
                                <div className="grid grid-cols-2 gap-1">
                                  <input
                                    type="text"
                                    value={editTractorLastService}
                                    onFocus={(e) => e.target.type = 'date'}
                                    onBlur={(e) => e.target.type = 'text'}
                                    onChange={(e) => setEditTractorLastService(e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[10px]"
                                    placeholder="Last Svc"
                                  />
                                  <input
                                    type="text"
                                    value={editTractorNextService}
                                    onFocus={(e) => e.target.type = 'date'}
                                    onBlur={(e) => e.target.type = 'text'}
                                    onChange={(e) => setEditTractorNextService(e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[10px]"
                                    placeholder="Next Svc"
                                  />
                                </div>
                              </div>
                              <textarea
                                value={editTractorDescription}
                                onChange={(e) => setEditTractorDescription(e.target.value)}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm min-h-[60px]"
                                placeholder="Description"
                              />
                              <select
                                value={editTractorStatus}
                                onChange={(e) => setEditTractorStatus(e.target.value as any)}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                              >
                                <option value="available">Available</option>
                                <option value="busy">Busy</option>
                                <option value="maintenance">Maintenance</option>
                              </select>
                              <div className="flex gap-2">
                                <button type="submit" className="flex-1 py-2 bg-moss-600 text-white rounded-lg text-xs font-bold">Save</button>
                                <button type="button" onClick={() => setEditingTractorId(null)} className="flex-1 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold">Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-200 rounded-lg overflow-hidden">
                                  <img 
                                    src={t.image_url || `https://picsum.photos/seed/${t.model}/100/100`} 
                                    alt={t.model}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 text-sm">{t.model}</p>
                                  <p className="text-[10px] text-slate-500">{t.location}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                                  t.status === 'available' ? 'bg-earth-200 text-moss-600' : 
                                  t.status === 'maintenance' ? 'bg-red-100 text-red-600' :
                                  'bg-orange-100 text-orange-600'
                                }`}>
                                  {t.status}
                                </span>
                                <button 
                                  onClick={() => handleGenerateReport(t)}
                                  className="p-1 text-slate-400 hover:text-moss-600 transition-colors"
                                  title="Generate AI Report"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingTractorId(t.id);
                                    setEditTractorModel(t.model);
                                    setEditTractorLocation(t.location);
                                    setEditTractorStatus(t.status as any);
                                    setEditTractorImage(t.image_url || '');
                                    setEditTractorDescription(t.description || '');
                                    setEditTractorPrice(t.price_per_acre?.toString() || '1000');
                                    setEditTractorPerHour(t.price_per_hour?.toString() || '500');
                                    setEditTractorHp(t.hp?.toString() || '45');
                                    setEditTractorYear(t.year?.toString() || '2022');
                                    setEditTractorFuelType(t.fuel_type || 'Diesel');
                                    setEditTractorLastService(t.last_service || '');
                                    setEditTractorNextService(t.next_service || '');
                                  }}
                                  className="p-1 text-slate-400 hover:text-moss-600 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Languages className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">Language</span>
                  </div>
                  <span className="text-sm font-bold text-moss-600 uppercase">{language}</span>
                </div>

                <button 
                  onClick={() => {
                    setUser(null);
                    localStorage.removeItem('tracto_user');
                  }}
                  className="w-full p-4 bg-clay-500/10 text-clay-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-clay-500/20"
                >
                  <XCircle className="w-5 h-5" />
                  Logout
                </button>
              </div>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass px-6 py-4 flex justify-around items-center border-t border-slate-100">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1 cursor-pointer ${view === 'home' ? 'text-moss-600' : 'text-slate-400'}`}>
          <TractorIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Home</span>
        </button>
        <button onClick={() => setView('bookings')} className={`flex flex-col items-center gap-1 cursor-pointer ${view === 'bookings' ? 'text-moss-600' : 'text-slate-400'}`}>
          <History className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Bookings</span>
        </button>
        <button onClick={() => setView('profile')} className={`flex flex-col items-center gap-1 cursor-pointer ${view === 'profile' ? 'text-moss-600' : 'text-slate-400'}`}>
          <UserIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Profile</span>
        </button>
      </nav>
      <AnimatePresence>
        {isCalling && (
          <PhoneIVR 
            language={language}
            onBookingComplete={handleBooking}
            onHangUp={() => setIsCalling(false)}
            bookings={bookings}
            tractors={tractors}
            userLocation={userLocation}
          />
        )}
        {isCallingFarmer && selectedFarmer && (
          <FarmerCallScreen 
            name={selectedFarmer.name}
            phone={selectedFarmer.phone}
            onHangUp={() => setIsCallingFarmer(false)}
          />
        )}
        {isMatchingTractors && pendingBookingData && (
          <TractorMatchingScreen 
            acres={pendingBookingData.acres}
            date={pendingBookingData.date}
            location={pendingBookingData.location}
            serviceType={pendingBookingData.service_type}
            latitude={pendingBookingData.latitude}
            longitude={pendingBookingData.longitude}
            onConfirm={finalizeBooking}
            onCancel={() => {
              setIsMatchingTractors(false);
              setPendingBookingData(null);
            }}
          />
        )}
        {selectedTractorDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 bg-moss-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Tractor Performance Report</h3>
                    <p className="text-xs opacity-80">{selectedTractorDetails.model}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTractorDetails(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {isGeneratingReport ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="w-10 h-10 text-moss-600 animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Analyzing performance data...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Health Score</p>
                        <div className="flex items-end gap-2">
                          <span className={`text-3xl font-bold ${
                            (selectedTractorDetails.ai_health_score || 0) > 80 ? 'text-moss-600' : 
                            (selectedTractorDetails.ai_health_score || 0) > 50 ? 'text-orange-500' : 'text-red-500'
                          }`}>
                            {selectedTractorDetails.ai_health_score || 85}
                          </span>
                          <span className="text-sm text-slate-400 mb-1">/100</span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Bookings</p>
                        <p className="text-3xl font-bold text-slate-900">
                          {bookings.filter(b => b.tractor_id === selectedTractorDetails.id).length}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Specifications</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 bg-white border border-slate-100 rounded-xl text-center">
                          <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Power</p>
                          <p className="text-sm font-bold text-slate-900">{selectedTractorDetails.hp || 45} HP</p>
                        </div>
                        <div className="p-3 bg-white border border-slate-100 rounded-xl text-center">
                          <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Year</p>
                          <p className="text-sm font-bold text-slate-900">{selectedTractorDetails.year || 2022}</p>
                        </div>
                        <div className="p-3 bg-white border border-slate-100 rounded-xl text-center">
                          <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Fuel</p>
                          <p className="text-sm font-bold text-slate-900">{selectedTractorDetails.fuel_type || 'Diesel'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Last Service</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-900">{selectedTractorDetails.last_service || 'N/A'}</span>
                        </div>
                        <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-moss-600" />
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Next Service</span>
                          </div>
                          <span className="text-[10px] font-bold text-moss-600">{selectedTractorDetails.next_service || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="prose prose-sm max-w-none">
                      <div className="bg-earth-50 p-4 rounded-2xl border border-earth-100">
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {aiReport}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Activity</h4>
                      <div className="space-y-2">
                        {bookings
                          .filter(b => b.tractor_id === selectedTractorDetails.id)
                          .slice(0, 3)
                          .map(b => (
                            <div key={b.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl text-xs">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-moss-600" />
                                <span className="font-medium">{b.service_type}</span>
                              </div>
                              <span className="text-slate-400">{b.date}</span>
                            </div>
                          ))}
                        {bookings.filter(b => b.tractor_id === selectedTractorDetails.id).length === 0 && (
                          <p className="text-center text-slate-400 text-xs py-4">No recent activity found.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button 
                  onClick={() => setSelectedTractorDetails(null)}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
