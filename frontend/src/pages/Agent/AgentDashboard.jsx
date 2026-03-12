import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    History, 
    MapPin, 
    User, 
    Trash2, 
    Scale, 
    CheckCircle2, 
    Loader2,
    ArrowRight,
    Camera,
    RotateCcw,
    Sparkles,
    Shield
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVoiceGuide } from '../../hooks/useVoiceGuide';
import { apiUrl } from '../../lib/api';

const AgentDashboard = () => {
    const { t } = useTranslation();
    const { speakAction } = useVoiceGuide();
    const [agent, setAgent] = useState(null);
    const [tempPickerId, setTempPickerId] = useState('');
    const [step, setStep] = useState('idle');
    const [preview, setPreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [aiResult, setAiResult] = useState(null);
    const [formData, setFormData] = useState({ plastic_type: 'PET', weight: '1.5' });
    const [result, setResult] = useState(null);
    const [stats, setStats] = useState({ today_collections: 0, total_plastic_kg: 0 });
    const fileInputRef = useRef(null);

    const fetchStats = async (agentId) => {
        try {
            const res = await fetch(apiUrl(`/api/agent/stats?agent_id=${encodeURIComponent(agentId || 'unknown')}`));
            const data = await res.json();
            setStats({ today_collections: data.today_collections || 0, total_plastic_kg: data.total_plastic_kg || 0 });
        } catch (e) {
            console.error('Failed to fetch agent stats', e);
        }
    };

    useEffect(() => {
        const stored = localStorage.getItem('ecoledger_user');
        if (stored) {
            const a = JSON.parse(stored);
            setAgent(a);
            fetchStats(a.agent_id);
        }
    }, []);

    const parsePickerId = (raw) => {
        const value = String(raw || '').trim();
        if (!value) return '';
        if (value.startsWith('{') && value.endsWith('}')) {
            try {
                const obj = JSON.parse(value);
                if (obj?.type === 'picker' && obj?.picker_id) return String(obj.picker_id).trim();
                if (obj?.t === 'picker' && obj?.id) return String(obj.id).trim();
            } catch (e) {}
        }
        const parts = value.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 3 && parts[0].toUpperCase() === 'ECOLEDGER' && parts[1].toUpperCase() === 'PICKER') {
            return parts.slice(2).join('|').trim();
        }
        return value;
    };

    const handleScanComplete = () => {
        const pickerId = parsePickerId(tempPickerId);
        if (!pickerId) return;
        setTempPickerId(pickerId);
        setStep('photo'); // go to photo capture step
        speakAction('click_scan_btn');
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));
        runAiScan(file);
    };

    const runAiScan = async (file) => {
        setStep('scanning_ai');
        speakAction('scanning');
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await fetch(apiUrl('/verify-plastic'), { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok || data.status === 'rejected') throw new Error(data.reason || 'AI verification failed');
            const ai = data.data;
            setAiResult(ai);
            setFormData({
                plastic_type: ai.plastic_type || 'PET',
                weight: parseFloat(ai.estimated_weight) || '1.0'
            });
            setStep('scanned');
            speakAction('scan_success');
        } catch (err) {
            console.error(err);
            // fallback to manual if AI fails
            setStep('scanned');
        }
    };

    const handleSubmitCollection = async () => {
        setStep('processing');
        try {
            const res = await fetch(apiUrl('/api/agent/scan'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    picker_id: tempPickerId,
                    agent_id: agent?.agent_id,
                    plastic_type: formData.plastic_type,
                    weight: `${formData.weight} kg`,
                    image_url: ""
                })
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data);
                setStep('success');
                speakAction('nft_minted');
                fetchStats(agent?.agent_id);
            }
        } catch (err) {
            console.error(err);
            setStep('scanned');
        }
    };

    const resetForm = () => {
        setStep('idle');
        setTempPickerId('');
        setResult(null);
        setPreview(null);
        setSelectedFile(null);
        setAiResult(null);
    };

    const GRADES = { 'A+': 'text-emerald-300', A: 'text-green-400', B: 'text-yellow-400', C: 'text-orange-400', D: 'text-red-400' };

    const GUIDELINES = [
        t('agent_guideline_1'),
        t('agent_guideline_2'),
        t('agent_guideline_3'),
        t('agent_guideline_4'),
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-24">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass-morphism p-10 rounded-[3rem] relative overflow-hidden">
                <div className="leaf-accent opacity-10" style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 rounded-3xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <User className="w-10 h-10 text-orange-400" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter">
                            {t('agent_dashboard_title')}
                        </h1>
                        <p className="text-orange-200/40 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> {agent?.area || 'Assigned Sector'}
                        </p>
                    </div>
                </div>
                <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-xs font-black uppercase tracking-tighter text-white/40 mb-1">{t('agent_status_label')}</p>
                    <p className="text-orange-400 font-black">{t('agent_active_duty')}</p>
                </div>
            </header>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Main Action Area */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-morphism p-10 rounded-[4rem] border-orange-500/20 relative overflow-hidden"
                >
                    <AnimatePresence mode="wait">

                        {/* STEP 1: Enter Picker ID */}
                        {step === 'idle' && (
                            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-32 h-32 bg-orange-500/10 rounded-full flex items-center justify-center mb-10 relative">
                                    <User className="w-16 h-16 text-orange-400" />
                                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute inset-0 rounded-full bg-orange-500/5" />
                                </div>
                                <h2 className="text-3xl font-black text-white mb-4">{t('agent_new_collection')}</h2>
                                <p className="text-orange-100/40 max-w-xs mx-auto mb-10 text-lg">{t('agent_scan_hint')}</p>
                                <div className="w-full flex gap-4">
                                    <input 
                                        type="text"
                                        placeholder={t('agent_manual_id_placeholder')}
                                        value={tempPickerId}
                                        onChange={e => setTempPickerId(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleScanComplete()}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none text-white font-bold focus:border-orange-500/40 transition-all"
                                    />
                                    <button onClick={handleScanComplete}
                                        className="bg-orange-500 hover:bg-orange-400 text-black font-black px-8 rounded-2xl flex items-center gap-2 transition-all">
                                        {t('agent_process')} <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 2: Take Photo for AI Scan */}
                        {step === 'photo' && (
                            <motion.div key="photo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2 mb-8">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">{t('agent_picker_id_label')}: {tempPickerId}</span>
                                </div>
                                <div className="w-32 h-32 bg-orange-500/10 rounded-full flex items-center justify-center mb-8 relative">
                                    <Camera className="w-16 h-16 text-orange-400" />
                                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="absolute inset-0 rounded-full bg-orange-500/5" />
                                </div>
                                <h2 className="text-3xl font-black text-white mb-3">{t('scan_plastic')}</h2>
                                <p className="text-orange-100/40 mb-10 text-lg max-w-xs">
                                    AI will auto-detect plastic type and weight from the photo.
                                </p>
                                <input type="file" ref={fileInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
                                <button onClick={() => fileInputRef.current?.click()}
                                    className="w-full btn-primary bg-orange-600 hover:bg-orange-500 border-orange-400/50 flex items-center justify-center gap-4 text-xl py-6 rounded-3xl mb-4">
                                    <Camera className="w-6 h-6" /> Take Photo
                                </button>
                                <button onClick={() => setStep('idle')}
                                    className="text-orange-400/40 font-bold hover:text-orange-400 transition-colors uppercase text-xs tracking-widest">
                                    ← Back
                                </button>
                            </motion.div>
                        )}

                        {/* STEP 3: AI Scanning */}
                        {step === 'scanning_ai' && (
                            <motion.div key="scanning_ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-24 text-center">
                                {preview && <img src={preview} alt="capture" className="w-40 h-40 object-cover rounded-3xl mb-8 border-4 border-orange-500/20" />}
                                <Loader2 className="w-16 h-16 text-orange-400 animate-spin mb-6" />
                                <h2 className="text-2xl font-black text-white mb-2">AI Analysing...</h2>
                                <p className="text-orange-100/40">{t('agent_blockchain_msg').replace('Blockchain', 'AI')}</p>
                            </motion.div>
                        )}

                        {/* STEP 4: AI Result + Confirm */}
                        {step === 'scanned' && (
                            <motion.div key="scanned" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                className="space-y-6 py-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-white">{t('agent_log_details')}</h2>
                                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">ID: {tempPickerId}</span>
                                    </div>
                                </div>

                                {/* AI Result Badge */}
                                {aiResult && (
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">AI Detected</p>
                                            <p className="text-white font-black">{aiResult.plastic_type} · {aiResult.estimated_weight}</p>
                                            <p className="text-emerald-400/60 text-xs font-bold">
                                                Confidence: {Math.round((aiResult.confidence || 0) * 100)}% · Grade: <span className={GRADES[aiResult.recyclability_grade] || 'text-white'}>{aiResult.recyclability_grade}</span>
                                            </p>
                                        </div>
                                        <Shield className="w-6 h-6 text-emerald-400/40" />
                                    </div>
                                )}

                                {/* Preview thumbnail + retake */}
                                {preview && (
                                    <div className="flex items-center gap-4">
                                        <img src={preview} alt="capture" className="w-20 h-20 object-cover rounded-2xl border-2 border-white/10" />
                                        <button onClick={() => { setPreview(null); setSelectedFile(null); setAiResult(null); setStep('photo'); }}
                                            className="flex items-center gap-2 text-orange-400/60 hover:text-orange-400 font-bold text-sm transition-colors">
                                            <RotateCcw className="w-4 h-4" /> Retake Photo
                                        </button>
                                    </div>
                                )}

                                {/* Editable Fields */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-orange-100/40 font-bold uppercase text-xs flex items-center gap-2"><Trash2 className="w-3 h-3"/> {t('agent_plastic_category')}</label>
                                        <select value={formData.plastic_type} onChange={e => setFormData({ ...formData, plastic_type: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none text-white font-bold appearance-none">
                                            {['PET','HDPE','PVC','LDPE','PP','PS','Mixed'].map(t => (
                                                <option key={t} className="bg-emerald-950 text-white">{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-orange-100/40 font-bold uppercase text-xs flex items-center gap-2"><Scale className="w-3 h-3"/> {t('agent_weight_kg')}</label>
                                        <input type="number" step="0.1" value={formData.weight}
                                            onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 outline-none text-white font-bold" />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button onClick={resetForm}
                                        className="flex-1 py-4 rounded-3xl border border-white/10 font-black text-white/40 hover:bg-white/5 transition-colors">
                                        {t('agent_discard')}
                                    </button>
                                    <button onClick={handleSubmitCollection}
                                        className="flex-[2] btn-primary bg-emerald-600 hover:bg-emerald-500 border-emerald-400/50 flex items-center justify-center gap-3 text-lg py-4 rounded-3xl">
                                        {t('agent_complete_transfer')} <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 5: Processing */}
                        {step === 'processing' && (
                            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-24 text-center">
                                <Loader2 className="w-20 h-20 text-orange-400 animate-spin mb-8" />
                                <h2 className="text-3xl font-black text-white mb-2">{t('agent_syncing')}</h2>
                                <p className="text-orange-100/40 text-lg">{t('agent_blockchain_msg')}</p>
                            </motion.div>
                        )}

                        {/* STEP 6: Success */}
                        {step === 'success' && (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-8">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                                </div>
                                <h2 className="text-4xl font-black text-white mb-2">{t('agent_well_done')}</h2>
                                <p className="text-emerald-400 font-black text-xl mb-12">
                                    {result?.eco_reward} {t('agent_credited_to')} {result?.picker_id}
                                </p>
                                <button onClick={resetForm}
                                    className="w-full btn-primary bg-orange-600 hover:bg-orange-500 border-orange-400/50 flex items-center justify-center gap-4 text-xl py-6 rounded-3xl">
                                    {t('agent_new_scan')} <ArrowRight className="w-6 h-6" />
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </motion.div>

                {/* Info Area */}
                <div className="space-y-8">
                    <div className="glass-morphism p-10 rounded-[4rem] border-white/5 relative overflow-hidden">
                        <History className="absolute top-10 right-10 w-24 h-24 text-white/5 -rotate-12" />
                        <h3 className="text-2xl font-black text-white mb-8">{t('agent_duty_summary')}</h3>
                        <div className="grid grid-cols-2 gap-6 relative z-10">
                            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5">
                                <p className="text-xs font-black uppercase tracking-tighter text-white/40 mb-2">{t('agent_todays_collections')}</p>
                                <p className="text-4xl font-black text-white">{stats.today_collections}</p>
                            </div>
                            <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5">
                                <p className="text-xs font-black uppercase tracking-tighter text-white/40 mb-2">{t('agent_total_plastic')}</p>
                                <p className="text-4xl font-black text-orange-400">{stats.total_plastic_kg} <span className="text-sm">kg</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-morphism p-10 rounded-[4rem] border-white/5">
                        <h3 className="text-xl font-black text-white mb-6">{t('agent_field_guidelines')}</h3>
                        <ul className="space-y-4">
                            {GUIDELINES.map((text, i) => (
                                <li key={i} className="flex gap-4 text-orange-100/40 font-medium leading-relaxed">
                                    <div className="w-6 h-6 rounded-full bg-orange-500/10 border border-orange-500/20 flex-shrink-0 flex items-center justify-center text-[10px] text-orange-400 font-bold">
                                        {i + 1}
                                    </div>
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentDashboard;
