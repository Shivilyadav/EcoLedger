import React, { useState } from 'react';
import { Volume2, VolumeX, Play, RotateCcw, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceGuide } from '../hooks/useVoiceGuide';
import { useTranslation } from 'react-i18next';

const VoiceAgent = () => {
    const { t } = useTranslation();
    const { isSpeaking, isMuted, setIsMuted, runGuide, stop } = useVoiceGuide();
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="fixed bottom-10 right-10 z-[200]">
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="absolute bottom-20 right-0 w-72 glass-morphism p-6 rounded-[2.5rem] border-emerald-500/20 shadow-2xl mb-4"
                    >
                        <div className="leaf-accent" />
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{t('voice_assistant')}</span>
                            <button onClick={() => setExpanded(false)} className="text-emerald-900 hover:text-emerald-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <button 
                                onClick={runGuide}
                                className="w-full flex items-center justify-between p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10 hover:border-emerald-500/40 transition-all text-emerald-100 font-bold"
                            >
                                <div className="flex items-center gap-3">
                                    <Play className={`w-4 h-4 ${isSpeaking ? 'animate-pulse text-emerald-400' : ''}`} />
                                    {t('voice_replay')}
                                </div>
                                <RotateCcw className="w-3 h-3 opacity-30" />
                            </button>

                            <button 
                                onClick={() => setIsMuted(!isMuted)}
                                className="w-full flex items-center gap-3 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-emerald-100/60 font-bold"
                            >
                                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                {isMuted ? t('voice_unmute') : t('voice_mute')}
                            </button>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-500 animate-ping' : 'bg-emerald-900'}`} />
                            <span className="text-[10px] font-bold text-emerald-100/30 uppercase">
                                {t('voice_status')}: {isSpeaking ? t('voice_status_speaking') : t('voice_status_ready')}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setExpanded(!expanded)}
                className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-all duration-500 shadow-2xl relative
                    ${expanded ? 'bg-emerald-500 border-emerald-300 text-white' : 'glass-morphism border-emerald-500/20 text-emerald-400'}
                `}
            >
                <div className="absolute -inset-2 bg-emerald-500/20 blur-xl rounded-full opacity-50" />
                <MessageSquare className="w-7 h-7 relative z-10" />
                {isSpeaking && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-emerald-900 animate-bounce" />}
            </motion.button>
        </div>
    );
};

export default VoiceAgent;
