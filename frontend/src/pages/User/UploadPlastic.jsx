import React, { useState } from 'react';
import { Camera, Loader2, CheckCircle, XCircle, Zap, ExternalLink, Shield, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useVoiceGuide } from '../../hooks/useVoiceGuide';
import { apiUrl } from '../../lib/api';

const GRADE_COLORS = {
    'A+': 'text-emerald-300', A: 'text-green-400',
    B:   'text-yellow-400',   C: 'text-orange-400', D: 'text-red-400',
};

const UploadPlastic = () => {
    const { t } = useTranslation();
    const { speakAction } = useVoiceGuide();
    const [preview,      setPreview]      = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading,      setLoading]      = useState(false);
    const [minting,      setMinting]      = useState(false);
    const [result,       setResult]       = useState(null);   // AI scan result
    const [mintResult,   setMintResult]   = useState(null);   // Blockchain tx result
    const [error,        setError]        = useState('');
    const [companies,    setCompanies]    = useState([]);
    const [selectedMnc,  setSelectedMnc]  = useState('');
    const [user, setUser] = useState(null);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const reset = () => {
        setPreview(null); setSelectedFile(null);
        setResult(null);  setMintResult(null); setError('');
        setSelectedMnc('');
    };

    React.useEffect(() => {
        const stored = localStorage.getItem('ecoledger_user');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse user in UploadPlastic", e);
            }
        }
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const res = await fetch(apiUrl('/api/companies'));
            const data = await res.json();
            setCompanies(data.companies || []);
            if (data.companies?.length > 0) setSelectedMnc(data.companies[0].id);
        } catch (e) {
            console.error('Failed to load companies');
        }
    };

    const handleScan = async () => {
        if (!selectedFile) return;
        setLoading(true); setError(''); setResult(null); setMintResult(null);
        speakAction('scanning');
        try {
            const form = new FormData();
            form.append('file', selectedFile);
            const res  = await fetch(apiUrl('/verify-plastic'), { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Verification failed');
            setResult(data);
            if (data.status === 'approved') speakAction('scan_success');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMint = async () => {
        if (!result?.data) return;
        setMinting(true); setError('');
        try {
            const ai      = result.data;
            const payload = {
                picker_id:      user?.user_id        || 'anonymous_picker',
                company_id:     selectedMnc, 
                plastic_type:   ai.plastic_type,
                weight:         ai.estimated_weight,
                confidence:     ai.confidence,
                image_url:      result.image_url    || '',
            };

            const uploadRes = await fetch(apiUrl('/api/uploads'), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });

            const mintPayload = {
                ...payload,
                wallet_address: user?.wallet_address || '',
                identifier:     user?.full_name     || 'anonymous',
                image_hash:     await _fileHash(selectedFile),
            };
            const res  = await fetch(apiUrl('/mint-token'), {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(mintPayload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Processing failed');
            
            setMintResult(data.blockchain);
            speakAction('mint_success');
        } catch (err) {
            setError(err.message);
        } finally {
            setMinting(false);
        }
    };

    const _fileHash = async (file) => {
        const buf    = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
    };

    return (
        <div className="max-w-4xl mx-auto py-12">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
                <h2 className="text-6xl font-black heading-emerald tracking-tighter mb-4">{t('ai_scan_mint_title')}</h2>
                <p className="text-emerald-100/40 text-xl font-medium">
                    {t('ai_scan_mint_subtitle')}
                </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="glass-morphism p-10 rounded-[4rem] relative overflow-hidden">
                <div className="leaf-accent" />

                {!preview ? (
                    <label className="flex flex-col items-center justify-center border-4 border-dashed border-emerald-500/10
                        rounded-[3rem] p-28 cursor-pointer hover:bg-emerald-500/5 transition-all group"
                        onMouseEnter={() => speakAction('click_scan_btn')}>
                        <Camera className="w-16 h-16 text-emerald-900 group-hover:text-emerald-400 transition-colors mb-4" />
                        <span className="text-2xl font-black text-emerald-700">{t('capture_upload_image')}</span>
                        <span className="text-emerald-900 text-sm mt-2">{t('accepted_formats')}</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden"
                            onChange={e => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                setSelectedFile(f); setPreview(URL.createObjectURL(f));
                                setResult(null); setMintResult(null); setError('');
                            }} />
                    </label>
                ) : (
                    <div className="space-y-8">
                        <div className="relative">
                            <img src={preview} alt="Scan" className="w-full h-[360px] object-cover rounded-[2.5rem] border-4 border-emerald-950" />
                            <button onClick={reset}
                                className="absolute top-4 right-4 bg-black/60 text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-red-900/70 transition-all">
                                × {t('retake')}
                            </button>
                        </div>

                        {!result && !loading && (
                            <button onClick={handleScan}
                                className="w-full btn-primary py-5 text-xl rounded-[2rem] flex items-center justify-center gap-3">
                                <Shield className="w-6 h-6" /> {t('run_ai_analysis')}
                            </button>
                        )}

                        {loading && (
                            <div className="flex flex-col items-center gap-3 py-4">
                                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                                <p className="text-emerald-400 font-bold text-lg">{t('analysing_ai')}</p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-900/20 p-4 rounded-2xl border border-red-500/20 flex items-center gap-3">
                                <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                                <p className="text-red-300 font-medium">{error}</p>
                            </div>
                        )}

                        <AnimatePresence>
                            {result && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                    className={`p-8 rounded-[2.5rem] border ${
                                        result.status === 'approved'
                                            ? 'bg-emerald-500/10 border-emerald-500/20'
                                            : 'bg-red-900/20 border-red-500/20'
                                    }`}>

                                    <div className="flex items-center gap-3 mb-6">
                                        {result.status === 'approved'
                                            ? <CheckCircle className="w-10 h-10 text-emerald-400" />
                                            : <XCircle    className="w-10 h-10 text-red-400" />}
                                        <h4 className="text-3xl font-black text-white">
                                            {result.status === 'approved' ? `✅ ${t('verified_label')}` : `❌ ${t('rejected_label')}`}
                                        </h4>
                                    </div>

                                    {result.status === 'approved' && result.data && (() => {
                                        const ai = result.data;
                                        const gradeColor = GRADE_COLORS[ai.recyclability_grade] || 'text-white';
                                        return (
                                            <>
                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                    <Stat label={t('plastic_type')}     value={ai.plastic_type} />
                                                    <Stat label={t('resin_code')}       value={`♻ ${ai.resin_code}`} />
                                                    <Stat label={t('estimated_weight')}      value={ai.estimated_weight} />
                                                    <Stat label={t('confidence')}       value={`${(ai.confidence * 100).toFixed(1)}%`} />
                                                    <Stat label={t('recyclability')}    value={ai.recyclability_grade} valueClass={gradeColor} />
                                                    <Stat label={t('estimated_value')}       value={`$${ai.estimated_value_usd}`} />
                                                    <Stat label={t('eco_tokens')}       value={`${ai.eco_tokens_earned} ECO`} valueClass="text-emerald-300" />
                                                    <Stat label={t('fraud_score')}      value={`${(ai.fraud_probability * 100).toFixed(1)}%`}
                                                        valueClass={ai.fraud_probability < 0.2 ? 'text-green-400' : 'text-orange-400'} />
                                                </div>

                                                <div className="mb-8 p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                                                    <p className="text-emerald-900 text-[10px] uppercase font-black tracking-widest mb-3">{t('assign_recycler')}</p>
                                                    <select 
                                                        value={selectedMnc}
                                                        onChange={(e) => setSelectedMnc(e.target.value)}
                                                        className="w-full bg-emerald-950/40 border border-emerald-500/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-emerald-500/40 transition-all cursor-pointer"
                                                    >
                                                        {companies.map(c => (
                                                            <option key={c.id} value={c.id} className="bg-emerald-950 font-bold">{c.name}</option>
                                                        ))}
                                                        {companies.length === 0 && <option value="">{t('no_organizations')}</option>}
                                                    </select>
                                                </div>

                                                {!mintResult && !minting && (
                                                    <button onClick={handleMint}
                                                        className="w-full py-5 rounded-[2rem] text-xl font-black flex items-center justify-center gap-3
                                                            bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-500 hover:to-emerald-400
                                                            text-white transition-all shadow-lg shadow-purple-900/40">
                                                        <Zap className="w-6 h-6" /> {t('mint_nft_polygon')}
                                                    </button>
                                                )}
                                                {minting && (
                                                    <div className="flex flex-col items-center gap-3 py-4">
                                                        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                                                        <p className="text-purple-300 font-bold">{t('minting_polygon')}</p>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}

                                    {result.status !== 'approved' && (
                                        <div className="space-y-4">
                                            <p className="text-red-300 font-bold">{result.reason}</p>
                                            {result.details?.fraud_flags?.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {result.details.fraud_flags.map((flag, i) => (
                                                        <span key={i} className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[10px] uppercase font-black">
                                                            {flag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {mintResult && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                    className="p-8 rounded-[2.5rem] bg-gradient-to-br from-purple-900/30 to-emerald-900/30
                                        border border-purple-500/20">
                                    <div className="flex items-center gap-3 mb-6">
                                        <Leaf className="w-10 h-10 text-emerald-400" />
                                        <h4 className="text-3xl font-black text-white">🎉 {t('nft_minted')}</h4>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <Stat label={t('token_id')}     value={`#${mintResult.token_id}`} valueClass="text-purple-300" />
                                        <Stat label={t('network')}      value={mintResult.network}         valueClass="text-purple-300" />
                                        <Stat label={t('eco_reward')}   value={mintResult.eco_reward}      valueClass="text-emerald-300" />
                                        <Stat label={t('gas_used')}     value={mintResult.gas_used?.toLocaleString()} />
                                        <Stat label={t('block')}        value={mintResult.block_number?.toLocaleString()} />
                                        <Stat label={t('mode')}         value={mintResult.mode === 'live' ? `🟢 ${t('mode_live')}` : `🔵 ${t('mode_demo')}`}
                                            valueClass={mintResult.mode === 'live' ? 'text-green-400' : 'text-blue-400'} />
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <a href={mintResult.explorer_url} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-2 text-purple-300 hover:text-purple-200 font-bold transition-colors">
                                            <ExternalLink className="w-5 h-5" />
                                            {t('view_tx_polygonscan')}
                                        </a>
                                        {mintResult.token_url && (
                                            <a href={mintResult.token_url} target="_blank" rel="noreferrer"
                                                className="flex items-center gap-2 text-emerald-300 hover:text-emerald-200 font-bold transition-colors">
                                                <ExternalLink className="w-5 h-5" />
                                                {t('view_nft_polygonscan')}
                                            </a>
                                        )}
                                    </div>

                                    <button onClick={reset}
                                        className="w-full mt-6 py-4 rounded-2xl border border-emerald-500/30 text-emerald-400
                                            font-bold hover:bg-emerald-500/10 transition-all">
                                        {t('scan_another_plastic')}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

const Stat = ({ label, value, valueClass = 'text-white' }) => (
    <div className="bg-black/20 p-4 rounded-2xl">
        <p className="text-emerald-900 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
        <p className={`font-black text-lg ${valueClass}`}>{value ?? '—'}</p>
    </div>
);

export default UploadPlastic;
