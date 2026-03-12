import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { voiceScripts } from '../data/voiceScripts';

export const useVoiceGuide = () => {
    const { i18n } = useTranslation();
    const location = useLocation();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [voicesLoaded, setVoicesLoaded] = useState(false);

    const speechSupported =
        typeof window !== 'undefined' &&
        !!window.speechSynthesis &&
        typeof window.SpeechSynthesisUtterance !== 'undefined';

    useEffect(() => {
        if (!speechSupported) {
            setVoicesLoaded(true);
            return;
        }
        const loadVoices = () => {
            try {
                window.speechSynthesis.getVoices();
            } finally {
                setVoicesLoaded(true);
            }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    const stop = () => {
        if (!speechSupported) return;
        window.speechSynthesis.cancel();
        window.activeUtterance = null;
        setIsSpeaking(false);
    };

    const speakAction = (actionKey) => {
        if (!speechSupported) return;
        if (isMuted) return;
        
        const script = voiceScripts[i18n.language]?.[actionKey] || voiceScripts['en']?.[actionKey];
        if (!script) return;

        stop();

        const langCode = i18n.language === 'en' ? 'en-US' : i18n.language === 'hi' ? 'hi-IN' : 'mr-IN';
        const utterance = new SpeechSynthesisUtterance(script);
        utterance.lang = langCode;
        
        const voices = window.speechSynthesis.getVoices();
        
        // Exact Language Match First
        let targetVoice = voices.find(v => v.lang.replace('_', '-').toLowerCase() === langCode.toLowerCase());
        
        // Google Voices usually have the best quality
        const googleVoice = voices.find(v => v.name.includes('Google') && v.lang.includes(langCode.split('-')[0]));
        if (googleVoice) targetVoice = googleVoice;

        // Broad Fallbacks
        if (!targetVoice && langCode === 'hi-IN') targetVoice = voices.find(v => v.lang.includes('hi') || v.name.includes('Hindi') || v.lang.includes('IN'));
        // Marathi fallback to Hindi if explicit Marathi voice is missing
        if (!targetVoice && langCode === 'mr-IN') targetVoice = voices.find(v => v.lang.includes('mr') || v.name.includes('Marathi') || v.lang.includes('hi') || v.lang.includes('IN')); 

        if (targetVoice) utterance.voice = targetVoice;
        
        utterance.rate = 0.85; 
        utterance.pitch = 1.0;

        utterance.onend = () => {
            setIsSpeaking(false);
            window.activeUtterance = null;
        };
        
        utterance.onerror = (e) => {
            console.error("Web Speech API Error:", e);
            setIsSpeaking(false);
            window.activeUtterance = null;
        };
        
        window.activeUtterance = utterance; // GC Hack

        try {
            window.speechSynthesis.resume?.();
            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
        } catch (e) {
            console.error("Web Speech API speak() failed:", e);
            setIsSpeaking(false);
            window.activeUtterance = null;
        }
    };

    const runGuide = () => {
        const path = location.pathname;
        const guideMap = {
            '/': 'home_intro',
            '/user/home': 'user_home_intro',
            '/user/login': 'user_login_intro',
            '/user/dashboard': 'user_dashboard_intro',
            '/user/upload': 'user_upload_intro',
            '/user/marketplace': 'user_marketplace_intro',
            '/mnc/login': 'mnc_login_intro',
            '/mnc/register': 'mnc_register_intro',
            '/mnc/dashboard': 'mnc_dashboard_intro',
            '/agent/login': 'agent_login_intro',
            '/agent/dashboard': 'agent_dashboard_intro',
        };
        const actionKey = guideMap[path] || 'home_intro';
        speakAction(actionKey);
    };

    useEffect(() => {
        if (!speechSupported) return;
        if (!isMuted && voicesLoaded) {
            stop();
            const timer = setTimeout(runGuide, 1000);
            return () => clearTimeout(timer);
        }
    }, [location.pathname, i18n.language, isMuted, voicesLoaded]);

    return { speakAction, stop, isSpeaking, isMuted, setIsMuted, runGuide };
};
