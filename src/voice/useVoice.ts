/**
 * useVoice — React hook for voice interaction
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  VoiceEngine,
  VoiceLanguage,
  VoiceCommand,
  ParsedCommand,
  VoiceState,
  getVoiceEngine,
} from './engine';

type UseVoiceOptions = {
  language?: VoiceLanguage;
  autoListen?: boolean;
  onCommand?: (cmd: VoiceCommand) => void;
  onTranscript?: (text: string) => void;
};

type UseVoiceReturn = {
  state: VoiceState;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => Promise<string>;
  processTranscript: (text: string) => Promise<ParsedCommand | null>;
  speak: (text: string) => Promise<void>;
  speakTemplate: (key: string, vars?: Record<string, string>) => Promise<void>;
  stopSpeaking: () => void;
  setLanguage: (lang: VoiceLanguage) => void;
  error: string | null;
};

export function useVoice(options?: UseVoiceOptions): UseVoiceReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<VoiceEngine | null>(null);

  useEffect(() => {
    const engine = getVoiceEngine({ language: options?.language });
    engineRef.current = engine;

    engine.setCallbacks({
      onStateChange: setState,
      onTranscript: (text) => {
        setTranscript(text);
        options?.onTranscript?.(text);
      },
      onCommand: options?.onCommand,
      onError: setError,
    });

    return () => {
      engine.stopSpeaking();
    };
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    await engineRef.current?.startListening();
  }, []);

  const stopListening = useCallback(async () => {
    return engineRef.current?.stopListening() || '';
  }, []);

  const processTranscript = useCallback(async (text: string) => {
    return engineRef.current?.processTranscript(text) || null;
  }, []);

  const speak = useCallback(async (text: string) => {
    return engineRef.current?.speak(text) || Promise.resolve();
  }, []);

  const speakTemplate = useCallback(async (key: string, vars?: Record<string, string>) => {
    return engineRef.current?.speakTemplate(key, vars) || Promise.resolve();
  }, []);

  const stopSpeaking = useCallback(() => {
    engineRef.current?.stopSpeaking();
  }, []);

  const setLanguage = useCallback((lang: VoiceLanguage) => {
    engineRef.current?.setLanguage(lang);
  }, []);

  return {
    state,
    transcript,
    startListening,
    stopListening,
    processTranscript,
    speak,
    speakTemplate,
    stopSpeaking,
    setLanguage,
    error,
  };
}
