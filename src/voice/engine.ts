/**
 * Voice Engine — Voice-first interaction for Ushawama
 *
 * Pipeline:  Mic → STT (Whisper/free) → Command Parser → Action → TTS response
 * Languages: English, Kiswahili, Luganda, Kinyarwanda
 *
 * On-device: expo-speech for TTS, expo-av for recording
 * Cloud fallback: OpenAI Whisper API (or self-hosted) for STT
 */

import * as Speech from 'expo-speech';

// ── Types ──

export type VoiceLanguage = 'en' | 'sw' | 'lg' | 'rw';

export type VoiceCommand =
  | { type: 'duty_check'; product: string; destination?: string; origin?: string }
  | { type: 'find_buyer'; product: string; location?: string }
  | { type: 'find_seller'; product: string; location?: string }
  | { type: 'post_product'; product: string; quantity?: string; price?: string }
  | { type: 'continue_lesson' }
  | { type: 'start_lesson'; level?: number }
  | { type: 'track_cargo'; ref?: string }
  | { type: 'search'; query: string }
  | { type: 'help' }
  | { type: 'unknown'; raw: string };

// Same command, but tagged with where the intent came from (Phase 1 — spine or local)
export type ParsedCommand = VoiceCommand & { source?: 'spine' | 'local' };

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export type VoiceCallbacks = {
  onStateChange?: (state: VoiceState) => void;
  onCommand?: (command: VoiceCommand) => void;
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
};

// ── Language mappings ──

const LANG_CODES: Record<VoiceLanguage, string> = {
  en: 'en-US',
  sw: 'sw-KE',
  lg: 'lg-UG',
  rw: 'rw-RW',
};

const TTS_RATE: Record<VoiceLanguage, number> = {
  en: 0.85,
  sw: 0.80,
  lg: 0.80,
  rw: 0.80,
};

// ── Command patterns (multilingual) ──

const COMMAND_PATTERNS: Array<{
  type: VoiceCommand['type'];
  patterns: RegExp[];
}> = [
  {
    type: 'duty_check',
    patterns: [
      /(?:check|calculate|how much)\s+(?:duty|tax|customs?)\s+(?:for|on|of)\s+(.+)/i,
      /(?:duty|tax|customs?)\s+(?:for|on|of)\s+(.+)/i,
      /(?:bring|import|transport)\s+(.+)/i,
      /(?:viwango|kodi)\s+(.+)?/i,           // Swahili: duty/tax
      /(.+)\s+(?:duty|kodi)/i,
    ],
  },
  {
    type: 'find_buyer',
    patterns: [
      /(?:find|look for|search|who wants?)\s+(?:a )?buyer\s+(?:for|buying)\s+(.+)/i,
      /(?:buyer|customer)\s+(?:for|buying)\s+(.+)/i,
      /(?:buy|wants?)\s+(.+)/i,
      /(.+)\s+(?:buyer|customer|mnunuzi)/i,   // Swahili: buyer
    ],
  },
  {
    type: 'find_seller',
    patterns: [
      /(?:find|look for|search|who has?)\s+(?:a )?seller\s+(?:for|selling)\s+(.+)/i,
      /(?:seller|supplier)\s+(?:for|selling)\s+(.+)/i,
      /(?:sell|has)\s+(.+)/i,
      /(.+)\s+(?:seller|supplier|muuzaji)/i,  // Swahili: seller
    ],
  },
  {
    type: 'post_product',
    patterns: [
      /(?:post|list|advertise|sell)\s+(.+)/i,
      /(?:i have|i'm selling|i want to sell)\s+(.+)/i,
      /(?:nina|nauza)\s+(.+)/i,               // Swahili: I have / I'm selling
    ],
  },
  {
    type: 'continue_lesson',
    patterns: [
      /(?:continue|resume|go back to)\s+(?:my )?(?:lesson|reading|learning)/i,
      /(?:endelea|soma)\s+(?:tena|zaidi)?/i,  // Swahili: continue / read more
    ],
  },
  {
    type: 'start_lesson',
    patterns: [
      /(?:start|begin|open)\s+(?:level|lesson)\s*(\d)?/i,
      /(?:anza|anzisha)\s+(?:level|lesson)?\s*(\d)?/i,  // Swahili: start
    ],
  },
  {
    type: 'track_cargo',
    patterns: [
      /(?:track|follow|where is)\s+(?:my\s+)?(?:cargo|shipment|container|order)\s*(.+)?/i,
      /(?:wapi|fuata)\s+(.+)?(?:mzigo|kargo|cargo)/i,
    ],
  },
  {
    type: 'help',
    patterns: [
      /(?:help|what can you do|how do i|options)/i,
      /(?:msaada|nisaidie|nini naweza)/i,      // Swahili: help / what can I
    ],
  },
];

// ── TTS response templates ──

const RESPONSES: Record<VoiceLanguage, Record<string, string>> = {
  en: {
    listening: "I'm listening. Tell me what you need.",
    processing: "Let me check that for you...",
    duty_intro: "Here's the duty information for {product}:",
    buyer_intro: "I found {count} buyers looking for {product}:",
    seller_intro: "I found {count} sellers offering {product}:",
    lesson_continue: "Welcome back! Let's continue where you left off.",
    lesson_start: "Starting {name}. Get ready to learn!",
    help: "You can say: check duty for maize, find buyers for beans, continue my lesson, or post a product.",
    error: "Sorry, I didn't understand that. Please try again.",
    no_results: "I couldn't find any results for {product}. Try a different product name.",
  },
  sw: {
    listening: "Nasikiliza. Niambie unachohitaji.",
    processing: "Nakagua hiyo kwako...",
    duty_intro: "Hii ni taarifa ya kodi kwa {product}:",
    buyer_intro: "Nimepata wanunuzi {count} wanaotafuta {product}:",
    seller_intro: "Nimepata wauzaji {count} wanaouza {product}:",
    lesson_continue: "Karibu tena! Tuendele tulipoishia.",
    lesson_start: "Kuanza {name}. Jiandae kujifunza!",
    help: "Unaweza kusema: angalia kodi ya mahindi, tafuta wanunuzi wa maharage, endelea somo langu, au orodhesha bidhaa.",
    error: "Samahani, sikuelewa. Tafadhali jaribu tena.",
    no_results: "Sijapata matokeo kwa {product}. Jaribu jina lingine la bidhaa.",
  },
  lg: {
    listening: "Nuwulire. Nambira kino okikiza.",
    processing: "Nolaba ekyo kuwe...",
    duty_intro: "Bino ebyafaayo by'ekaddu ku {product}:",
    buyer_intro: "Nanonya abannunzizi {count} banooba {product}:",
    seller_intro: "Nanonya abalimuzi {count} balagirako {product}:",
    lesson_continue: "Tugamba nnyo! Tweyongera ku kintwe twali.",
    lesson_start: "Kutandika {name}. Teekateeka okusoma!",
    help: "Ojogera: kennga ekaddu kya emaali, nonya abannunzizi, yongera somo lyange.",
    error: "Nsonyiwa, simanyi kino. Njogera kino ntya.",
    no_results: "Sinnanonye ebintu ku {product}. Gezezza erinnya ly'okintu ekirala.",
  },
  rw: {
    listening: "Mpumva. Mwambye ukeneye iki.",
    processing: "Ndarakira icyo...",
    duty_intro: "Uyu ni amakuru y'inguzo kuri {product}:",
    buyer_intro: "Nabonye abaguzi {count} bashaka {product}:",
    seller_intro: "Nabonye abacuruzi {count} barindagura {product}:",
    lesson_continue: "Murakaza neza! Twaromeze aho twari.",
    lesson_start: "Gutangira {name}. Witegure kumenya!",
    help: "Usobora kuvuga: reba inguzo y'ibigori, ona abaguzi, Subira isomo ryanjye.",
    error: "Mfise ubusabane, nti mvumbuye. Ongera ugerageze.",
    no_results: "Ntavumbuye icyerekezo kuri {product}. Gerageza izina ry'ikintu iringiye.",
  },
};

// ── Web Speech Recognition (Chrome/Edge, zero keys — demo STT) ──

function webSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// Pick the first MediaRecorder mime the browser really supports, best first.
function pickWebAudioMime(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch { /* keep trying */ }
  }
  return '';
}

// ── Main Engine ──

export class VoiceEngine {
  private language: VoiceLanguage = 'en';
  private callbacks: VoiceCallbacks = {};
  private recording: any = null;
  private state: VoiceState = 'idle';
  private sttEndpoint: string | null = null; // Whisper API URL
  private parseEndpoint: string | null = null; // Ushawama /api/voice/parse (spine)
  private webRec: any = null; // active Web SpeechRecognition
  private mediaRec: any = null; // active MediaRecorder (web recording path)
  private webResolve: ((text: string) => void) | null = null;

  constructor(options?: { language?: VoiceLanguage; sttEndpoint?: string; parseEndpoint?: string }) {
    if (options?.language) this.language = options.language;
    if (options?.sttEndpoint) this.sttEndpoint = options.sttEndpoint;
    if (options?.parseEndpoint) this.parseEndpoint = options.parseEndpoint;
  }

  setLanguage(lang: VoiceLanguage) {
    this.language = lang;
  }

  setCallbacks(cb: VoiceCallbacks) {
    this.callbacks = cb;
  }

  private setState(state: VoiceState) {
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  // ── TTS ──

  async speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.setState('speaking');
      Speech.speak(text, {
        language: LANG_CODES[this.language],
        rate: TTS_RATE[this.language],
        pitch: 1.0,
        onDone: () => { this.setState('idle'); resolve(); },
        onStopped: () => { this.setState('idle'); resolve(); },
        onError: () => { this.setState('idle'); resolve(); },
      });
    });
  }

  async speakTemplate(templateKey: string, vars: Record<string, string> = {}): Promise<void> {
    let text = RESPONSES[this.language]?.[templateKey] || RESPONSES.en[templateKey] || templateKey;
    for (const [key, value] of Object.entries(vars)) {
      text = text.replace(`{${key}}`, value);
    }
    return this.speak(text);
  }

  stopSpeaking() {
    Speech.stop();
    this.setState('idle');
  }

  // ── STT (Recording + Whisper) ──

  async startListening(): Promise<void> {
    try {
      this.setState('listening');
      this.callbacks.onTranscript?.('');

      // Web build: MediaRecorder -> our Gemini /transcribe endpoint.
      // Works on every browser (desktop Chrome/Edge + phone Safari/Chrome);
      // if the mic is denied we fall through to the SpeechRecognition path.
      if (typeof MediaRecorder !== 'undefined' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mime = pickWebAudioMime();
          const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
          const chunks: BlobPart[] = [];
          rec.ondataavailable = (e: any) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };
          rec.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
            this.mediaRec = null;
            const type = (rec.mimeType || mime || 'audio/webm').split(';')[0];
            const blob = new Blob(chunks, { type });
            void this.transcribeBlob(blob).then((t) => {
              const r = this.webResolve;
              this.webResolve = null;
              r?.(t);
            });
          };
          rec.onerror = () => {
            stream.getTracks().forEach((t) => t.stop());
            this.mediaRec = null;
            this.callbacks.onError?.('Speech recording failed');
            const r = this.webResolve;
            this.webResolve = null;
            r?.('');
            this.setState('idle');
          };
          this.mediaRec = rec;
          rec.start();
          return;
        } catch {
          // permission denied / no mic — drop to speech-recognition fallback
          this.mediaRec = null;
        }
      }

      // Fallback: built-in SpeechRecognition (Chrome/Edge, live interim text).
      const SR = webSpeechRecognition();
      if (SR) {
        const rec = new SR();
        this.webRec = rec;
        rec.lang = LANG_CODES[this.language];
        rec.interimResults = true;
        rec.continuous = false;
        rec.maxAlternatives = 1;
        let finalTxt = '';
        let interimTxt = '';
        rec.onresult = (evt: any) => {
          finalTxt = '';
          interimTxt = '';
          for (let i = evt.resultIndex; i < evt.results.length; i++) {
            if (evt.results[i].isFinal) finalTxt += evt.results[i][0].transcript;
            else interimTxt += evt.results[i][0].transcript;
          }
          this.callbacks.onTranscript?.((finalTxt || interimTxt).trim());
        };
        rec.onend = () => {
          this.webRec = null;
          const text = (finalTxt || interimTxt).trim();
          const resolve = this.webResolve;
          this.webResolve = null;
          resolve?.(text);
          if (text) this.processTranscript(text);
          else this.setState('idle');
        };
        rec.onerror = (e: any) => {
          this.webRec = null;
          this.callbacks.onError?.(
            e?.error ? `Speech recognition error: ${e.error}` : 'Speech recognition failed',
          );
          const resolve = this.webResolve;
          this.webResolve = null;
          resolve?.('');
          this.setState('idle');
        };
        rec.start();
        return;
      }

      // Native: record audio then transcribe.
      const { Audio } = require('expo-av');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true });

      const options = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: 2,
          audioEncoder: 3,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: 2,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 64000,
        },
      };

      const recording = new Audio.Recording();
      await recording.startAsync(options);
      this.recording = recording;
    } catch (e: any) {
      this.setState('error');
      this.callbacks.onError?.(e?.message || 'Failed to start recording');
    }
  }

  async stopListening(): Promise<string> {
    // Web: finalize the in-flight MediaRecorder (onstop -> transcribe -> resolve)
    if (this.mediaRec) {
      const rec = this.mediaRec;
      this.mediaRec = null;
      return new Promise<string>((resolve) => {
        this.webResolve = resolve;
        setTimeout(() => {
          const r = this.webResolve;
          this.webResolve = null;
          r?.('');
        }, 25000); // safety: never hang the UI
        try {
          rec.stop();
        } catch {
          resolve('');
        }
      });
    }

    // Web: finalize the in-flight SpeechRecognition (onend resolves the promise)
    if (this.webRec) {
      const rec = this.webRec;
      const promise = new Promise<string>((resolve) => { this.webResolve = resolve; });
      rec.stop();
      const timer = setTimeout(() => {
        const r = this.webResolve;
        this.webResolve = null;
        r?.('');
      }, 10000);
      const text = await promise;
      clearTimeout(timer);
      return text;
    }

    if (!this.recording) {
      this.callbacks.onError?.('No active recording');
      return '';
    }

    this.setState('processing');
    this.callbacks.onTranscript?.('Transcribing...');

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Send to Whisper API (or use local STT)
      const transcript = await this.transcribeAudio(uri);
      await this.processTranscript(transcript);

      return transcript;
    } catch (e: any) {
      this.setState('error');
      this.callbacks.onError?.(e?.message || 'Transcription failed');
      return '';
    }
  }

  private async transcribeAudio(uri: string): Promise<string> {
    // Prefer our Gemini transcribe endpoint (works on device + web alike).
    const url = this.getTranscribeUrl() || this.sttEndpoint;
    if (!url) return this.nativeSTT(uri);

    // Cloud STT endpoint (our /api/voice/transcribe, or a Whisper-compatible one)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: this.buildFormData(uri),
      });
      const data = await response.json().catch(() => null);
      if (data?.text) return String(data.text).trim();
      return this.nativeSTT(uri);
    } catch {
      return this.nativeSTT(uri);
    }
  }

  /**
   * Post a recorded web blob to Gemini STT, then run the shared pipeline.
   * Resolves the final transcript ('' on failure) without throwing.
   */
  private async transcribeBlob(blob: Blob): Promise<string> {
    const url = this.getTranscribeUrl();
    if (!url) {
      this.setState('idle');
      return '';
    }
    this.setState('processing');
    this.callbacks.onTranscript?.('Transcribing...');
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': blob.type || 'audio/webm',
          'X-Audio-Lang': this.language,
        },
        body: blob,
      });
      const data = await resp.json().catch(() => null);
      const text = String(data?.text || '').trim();
      if (!resp.ok || !text) {
        this.callbacks.onError?.(data?.error || 'Transcription failed');
        this.setState('idle');
        return '';
      }
      this.callbacks.onTranscript?.(text);
      await this.processTranscript(text);
      return text;
    } catch (e: any) {
      this.setState('idle');
      this.callbacks.onError?.(e?.message || 'Transcription failed');
      return '';
    }
  }

  private async nativeSTT(_uri: string): Promise<string> {
    // Fallback: use expo-speech recognition (available on Android/iOS)
    // Falls back to returning empty string if not available
    try {
      const { Speech: SpeechRecog } = require('expo-speech');
      // expo-speech doesn't have native STT; we rely on Whisper in production
      // For MVP, we return empty and prompt user to type
      return '';
    } catch {
      return '';
    }
  }

  private buildFormData(uri: string): FormData {
    const fd = new globalThis.FormData();
    fd.append('file', { uri, type: 'audio/m4a', name: 'recording.m4a' } as any);
    fd.append('model', 'whisper-1');
    fd.append('lang', this.language);
    fd.append('language', this.language === 'lg' ? 'en' : this.language === 'rw' ? 'en' : this.language);
    return fd;
  }

  // ── Command Parser ──

  parseCommand(text: string): VoiceCommand {
    if (!text || text.trim().length === 0) {
      return { type: 'unknown', raw: '' };
    }

    const cleaned = text.trim();

    for (const { type, patterns } of COMMAND_PATTERNS) {
      for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) {
          return this.buildCommand(type, match);
        }
      }
    }

    // Fallback: treat as search query
    return { type: 'search', query: cleaned };
  }

  private buildCommand(type: VoiceCommand['type'], match: RegExpMatchArray): VoiceCommand {
    const extracted = match[1]?.trim() || '';

    switch (type) {
      case 'duty_check':
        return { type, product: extracted };
      case 'find_buyer':
        return { type, product: extracted };
      case 'find_seller':
        return { type, product: extracted };
      case 'post_product':
        return { type, product: extracted };
      case 'continue_lesson':
        return { type };
      case 'start_lesson':
        return { type, level: match[1] ? parseInt(match[1], 10) : undefined };
      case 'track_cargo':
        return { type, ref: extracted || undefined };
      case 'help':
        return { type };
      default:
        return { type: 'unknown', raw: match[0] };
    }
  }

  // ── Phase 1 spine parser (server NLU first, local regex fallback) ──

  private getApiBase(): string {
    if (this.parseEndpoint) return this.parseEndpoint.replace(/\/api\/voice\/parse$/, '').replace(/\/+$/, '');

    // Web: build against the same host the page was opened from (port 4000).
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:4000`;
    }

    // Native: derive the API host from the Metro dev-server host (Expo Go)
    // so it works on ANY network the device loads from — LAN, hotspot, etc.
    try {
      const Constants = require('expo-constants');
      const hostUri =
        Constants?.expoConfig?.hostUri ||
        Constants?.manifest2?.extra?.expoClient?.hostUri ||
        Constants?.manifest?.debuggerHost;
      if (hostUri) return `http://${String(hostUri).split(':')[0]}:4000`;
    } catch { /* continue to env/default */ }

    const fromEnv = typeof process !== 'undefined' && (process.env as Record<string, string | undefined>).EXPO_PUBLIC_USHAWAMA_API;
    if (fromEnv) return fromEnv.replace(/\/+$/, '');
    // Development default: same machine API server
    return 'http://localhost:4000';
  }

  private getParseUrl(): string | null {
    return `${this.getApiBase()}/api/voice/parse`;
  }

  private getTranscribeUrl(): string | null {
    return `${this.getApiBase()}/api/voice/transcribe`;
  }

  private async callSpine(text: string): Promise<ParsedCommand | null> {
    const url = this.getParseUrl();
    if (!url) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ text, lang: this.language }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (!data?.ok || !data?.command) return null;
      return this.buildSpineCommand(data.command, data.intent, data.slots);
    } catch {
      return null; // API down / timeout -> local fallback
    } finally {
      clearTimeout(timer);
    }
  }

  private buildSpineCommand(
    serverCmd: { type?: string; value?: string },
    intent?: string,
    slots?: Record<string, string | null>,
  ): ParsedCommand {
    const val = (slots || {});
    const s = (k: string) => (val[k] && String(val[k]).trim() ? String(val[k]).trim() : undefined);
    switch (serverCmd.type || intent) {
      case 'duty_check':
        return { type: 'duty_check', product: s('product') || serverCmd.value || '', destination: s('destination'), source: 'spine' };
      case 'find_buyer':
        return { type: 'find_buyer', product: s('product') || serverCmd.value || '', location: s('destination') || s('origin'), source: 'spine' };
      case 'find_seller':
        return { type: 'find_seller', product: s('product') || serverCmd.value || '', location: s('origin') || s('destination'), source: 'spine' };
      case 'post_product':
        return { type: 'post_product', product: s('product') || '', quantity: s('quantity'), source: 'spine' };
      case 'track_cargo':
        return { type: 'track_cargo', ref: s('destination') || serverCmd.value || undefined, source: 'spine' };
      case 'help':
        return { type: 'help', source: 'spine' };
      default:
        return this.parseCommand(serverCmd.value || '') as ParsedCommand;
    }
  }

  /**
   * Phase 1 parse: ask the Ushawama API (spine NLU) first; on failure time out,
   * disable or unknown intent the local regex parser wins (offline-first).
   */
  async parseCommandSmart(text: string): Promise<ParsedCommand> {
    const spineCmd = await this.callSpine(text);
    if (spineCmd) return spineCmd;
    const local = this.parseCommand(text) as ParsedCommand;
    local.source = 'local';
    return local;
  }

  /**
   * Shared transcript pipeline: transcript -> spine/local parse -> onCommand.
   * Used by web STT, Whisper, and typed input so every path behaves the same.
   */
  async processTranscript(text: string): Promise<ParsedCommand | null> {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      this.setState('idle');
      return null;
    }
    this.setState('processing');
    this.callbacks.onTranscript?.(trimmed);
    const command = await this.parseCommandSmart(trimmed);
    this.callbacks.onCommand?.(command);
    this.setState('idle');
    return command;
  }

  // ── Convenience: speak response + wait ──

  async respondAndListen(templateKey: string, vars?: Record<string, string>): Promise<void> {
    await this.speakTemplate(templateKey, vars);
    // After responding, start listening again for follow-up
  }

  getState(): VoiceState {
    return this.state;
  }

  getLanguage(): VoiceLanguage {
    return this.language;
  }
}

// ── Singleton for app-wide use ──

let _instance: VoiceEngine | null = null;

export function getVoiceEngine(options?: { language?: VoiceLanguage; sttEndpoint?: string; parseEndpoint?: string }): VoiceEngine {
  if (!_instance) {
    _instance = new VoiceEngine(options);
  }
  return _instance;
}
