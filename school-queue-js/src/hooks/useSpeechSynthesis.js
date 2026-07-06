import { useState, useEffect, useCallback } from 'react';

export const useSpeechSynthesis = () => {
  const [voices, setVoices] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  
  // NEW: Tracks if the voice is patiently waiting in the browser's invisible queue
  const [queued, setQueued] = useState(false); 

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(({ text, voice, rate = 1, pitch = 1 }) => {
    if (!window.speechSynthesis) return;

    // 1. Instantly mark as queued so the UI buttons disable immediately
    setQueued(true);

    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;

    // 2. When it's finally this window's turn to speak...
    utterance.onstart = () => {
      setQueued(false); // It leaves the queue...
      setSpeaking(true); // ...and starts talking!
    };
    
    // 3. When it completely finishes talking
    utterance.onend = () => {
      setSpeaking(false);
    };
    
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setQueued(false);
      setSpeaking(false);
    };

    // Send it to the browser's native queue engine
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak, voices, speaking, queued };
};