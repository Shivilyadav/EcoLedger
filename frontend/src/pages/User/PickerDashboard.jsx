import React, { useState, useEffect } from 'react';
import { Leaf, Award, Activity, Wallet, Sparkles, ExternalLink, Zap, Shield, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../lib/api';

const GRADE_COLORS = { 'A+': '#4ade80', A: '#86efac', B: '#facc15', C: '#fb923c', D: '#f87171' };

const PickerDashboard = () => {
    const { t }         = useTranslation();
    const [user, setUser]               = useState(null);
    const [creditScore, setCreditScore] = useState(null);
    const [tokens, setTokens]           = useState([]);
    const [payments, setPayments]       = useState([]);
    const [loadingTokens, setLoadingTokens] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('ecoledger_user');
        if (stored) {
            try {
                const u = JSON.parse(stored);
                setUser(u);
                fetchData(u);
                
                // Auto-refresh every 30 seconds for live payment sync
                const interval = setInterval(() => fetchData(u), 30000);
                return () => clearInterval(interval);
            } catch (e) {
                console.error("Failed to parse picker user", e);
                setLoadingTokens(false);
            }
        } else {
            setLoadingTokens(false);
        }
    }, []);

    const fetchData = async (u) => {
        if (!u) return;
        try {
            const wallet = u.wallet_address || u.user_id || '1';

            // Fetch credit score
            const scoreRes = await fetch(`${API_BASE_URL}/green-credit-score/${wallet}`);
            if (scoreRes.ok) {
                const scoreData = await scoreRes.json();
                setCreditScore(scoreData);
            }

            // Fetch minted tokens
            const tokenRes = await fetch(`${API_BASE_URL}/my-tokens/${wallet}`);
            if (tokenRes.ok) {
                const tokenData = await tokenRes.json();
                setTokens(tokenData.tokens || []);
            }

            // Fetch payments
            const payRes = await fetch(`${API_BASE_URL}/api/picker/payments?picker_id=${u.user_id || 'anonymous_picker'}`);
            if (payRes.ok) {
                const payData = await payRes.json();
                setPayments(payData.payments || []);
            }
        } catch (e) {
            console.warn('Dashboard fetch error:', e);
        } finally {
            setLoadingTokens(false);
        }
    };

    const getDisplayName = (u) => {
        const raw = u?.full_name ?? u?.company_name ?? 'Environmentalist';
        if (typeof raw === 'string') return raw;
        if (raw && typeof raw === 'object') {
            const candidate = raw.name || raw.full_name || raw.displayName || raw.value;
            if (typeof candidate === 'string') return candidate;
        }
        if (raw == null) return 'Environmentalist';
        return String(raw);
    };

    const firstName = getDisplayName(user).trim().split(/\s+/)[0];
    const totalEco  = (tokens || []).reduce((s, t) => s + parseFloat((t?.eco_reward || '0').replace(' ECO','') || 0), 0);
    const totalKg   = (tokens || []).reduce((s, t) => s + parseFloat((t?.weight || '0').replace(' kg','') || 0), 0);

    const weightByType = (tokens || []).reduce((acc, token) => {
        const type = String(token?.plastic_type || '').toUpperCase();
        const kg = parseFloat(String(token?.weight || '0').replace(' kg', '')) || 0;
        if (!type) return acc;
        acc[type] = (acc[type] || 0) + kg;
        return acc;
    }, {});

    const pct = (kg) => (totalKg > 0 ? Math.round((kg / totalKg) * 100) : 0);
    const petPct = pct(weightByType.PET || 0);
    const hdpePct = pct(weightByType.HDPE || 0);
    const ldpePct = pct(weightByType.LDPE || 0);

    return (
        <div className="space-y-14">
            {/* ── Hero ── */}
            <div className="grid md:grid-cols-3 gap-8 items-start">
                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="md:col-span-3">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-4 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[10px] uppercase tracking-widest rounded-full flex items-center gap-2">
                            <Sparkles className="w-3 h-3" /> {t('real_time_impact')}
                        </span>
                    </div>
                    <h2 className="text-7xl font-black text-white tracking-tighter leading-none mb-6">
                        {t('hello')}, <br />
                        <span className="heading-emerald">{firstName}</span>
                    </h2>
                    <p className="text-emerald-100/40 text-2xl font-medium max-w-2xl leading-relaxed">
                        {t('you_have_diverted')} <span className="text-emerald-400 font-bold">{(totalKg || 0).toFixed(1)} kg</span> {t('total_plastic_kg')} — {t('and_minted')} <span className="text-emerald-400 font-bold">{(tokens || []).length}</span> {t('tokens_label')} {t('on_polygon')}.
                    </p>
                    <div className="mt-8 px-6 py-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl inline-flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60">{t('agent_picker_id_label')}</p>
                            <p className="text-white font-black tracking-widest">{user?.user_id || 'PCKR-000000'}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid lg:grid-cols-3 gap-8">
                <StatCard icon={<Leaf   className="w-8 h-8 text-emerald-400" />} label={t('plastic_collected')} value={(totalKg || 0).toFixed(1)} unit="kg" />
                <StatCard icon={<Wallet className="w-8 h-8 text-emerald-400" />} label={t('eco_tokens_earned')} value={(totalEco || 0).toFixed(0)} unit="ECO" />
                <StatCard icon={<Award  className="w-8 h-8 text-emerald-400" />}
                    label={t('green_score')}
                    value={creditScore ? creditScore.green_credit_score : '…'}
                    unit={creditScore?.grade || ''} />
            </div>

            {/* ── Credit Score Bar ── */}
            {creditScore && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="glass-morphism p-10 rounded-[3rem] relative overflow-hidden">
                    <div className="leaf-accent" />
                    <div className="flex items-center gap-3 mb-6">
                        <Shield className="w-7 h-7 text-emerald-400" />
                        <h3 className="text-2xl font-black text-white">{t('green_credit_score')}</h3>
                        <span className="ml-auto text-5xl font-black text-emerald-400">
                            {creditScore.green_credit_score}
                        </span>
                    </div>
                    <div className="h-4 bg-emerald-950/60 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(creditScore.green_credit_score / 1000) * 100}%` }}
                            transition={{ duration: 1.5 }}
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, #065f46, #4ade80)' }}
                        />
                    </div>
                    <div className="flex justify-between text-emerald-900 text-sm mt-2 font-bold">
                        <span>0</span><span>1000</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <Stat label={t('transactions')}      value={creditScore.total_transactions} />
                        <Stat label={t('total_plastic_kg')} value={creditScore.plastic_collected_kg} />
                    </div>
                </motion.div>
            )}

            {/* ── NFT Token List ── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass-morphism p-10 rounded-[3rem] relative overflow-hidden">
                <div className="leaf-accent" />
                <div className="flex items-center gap-3 mb-8">
                    <Zap className="w-7 h-7 text-purple-400" />
                    <h3 className="text-2xl font-black text-white">{t('my_plastic_nfts')}</h3>
                    <span className="ml-auto px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-full text-sm font-bold">
                        {(tokens || []).length} {t('tokens_label')}
                    </span>
                </div>

                {loadingTokens ? (
                    <p className="text-emerald-700 font-bold animate-pulse">{t('loading_tokens')}</p>
                ) : tokens.length === 0 ? (
                    <p className="text-emerald-800 font-bold">{t('no_tokens_yet')}</p>
                ) : (
                    <div className="space-y-4">
                        {tokens.map((token) => (
                            <div key={token.token_id}
                                className="bg-black/30 rounded-2xl p-5 flex items-center gap-4 border border-white/5 hover:border-purple-500/20 transition-all">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-purple-300 font-black text-sm">#{token.token_id}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-black">{token.plastic_type} — {token.weight}</p>
                                    <p className="text-emerald-400 text-sm font-bold">{token.eco_reward}</p>
                                    <p className="text-emerald-900 text-xs truncate">
                                        {new Date(token.minted_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <a href={token.explorer_url} target="_blank" rel="noreferrer"
                                    className="flex-shrink-0 text-purple-400 hover:text-purple-300 transition-colors">
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* ── Payments List ── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass-morphism p-10 rounded-[3rem] relative overflow-hidden">
                <div className="leaf-accent" />
                <div className="flex items-center gap-3 mb-8">
                    <Wallet className="w-7 h-7 text-emerald-400" />
                    <h3 className="text-2xl font-black text-white">{t('recent_payments')}</h3>
                </div>

                {payments.length === 0 ? (
                    <p className="text-emerald-800 font-bold text-center py-6">{t('no_payments_yet')}</p>
                ) : (
                    <div className="space-y-4">
                        {payments.map((p) => (
                            <div key={p.payment_id}
                                className="bg-black/30 rounded-2xl p-6 flex items-center justify-between border border-white/5">
                                <div>
                                    <p className="text-white font-black">{t('collection_id')} #{p.upload_id}</p>
                                    <p className="text-emerald-400/60 text-[10px] font-black uppercase tracking-tighter mb-1">
                                        {t('processed_by')}: <span className="text-emerald-400">{p.company_id || 'System'}</span>
                                    </p>
                                    <p className="text-emerald-900 text-xs font-bold uppercase tracking-widest">
                                        {t('ref_label')}: {p.payment_id} • {new Date(p.paid_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-emerald-400">₹ {p.amount}</p>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 bg-emerald-500/5 px-2 py-1 rounded-md">
                                        {p.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* ── Activity ── */}
            <div className="glass-morphism p-12 rounded-[4rem] relative overflow-hidden">
                <div className="leaf-accent" />
                <h3 className="text-3xl font-black text-white mb-10 flex items-center gap-4">
                    <Activity className="w-8 h-8 text-emerald-500" /> {t('activity_analytics')}
                </h3>
                {(tokens || []).length === 0 ? (
                    <p className="text-emerald-800 font-bold text-center py-6">{t('no_tokens_yet')}</p>
                ) : (
                    <div className="space-y-10">
                        <ProgressBar label={t('pet_processing')}  value={petPct} />
                        <ProgressBar label={t('hdpe_recovery')}   value={hdpePct} />
                        <ProgressBar label={t('ldpe_collection')} value={ldpePct} />
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, unit }) => (
    <div className="glass-morphism p-12 rounded-[3.5rem] relative group border-white/5 hover:border-emerald-500/20 transition-all">
        <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center mb-8">{icon}</div>
        <p className="text-emerald-800 font-black text-[10px] uppercase tracking-widest mb-3">{label}</p>
        <div className="flex items-baseline gap-3">
            <span className="text-5xl font-black text-white tracking-tighter">{value}</span>
            <span className="text-emerald-100/20 font-bold">{unit}</span>
        </div>
    </div>
);

const Stat = ({ label, value }) => (
    <div className="bg-black/20 p-4 rounded-2xl">
        <p className="text-emerald-900 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
        <p className="font-black text-white text-lg">{value ?? '—'}</p>
    </div>
);

const ProgressBar = ({ label, value }) => (
    <div>
        <div className="flex justify-between items-center mb-4 font-black">
            <span className="text-xl text-emerald-50">{label}</span>
            <span className="text-2xl text-emerald-400">{value}%</span>
        </div>
        <div className="h-4 bg-emerald-950/60 rounded-full border border-emerald-500/10 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1.5 }}
                className="h-full bg-emerald-500" />
        </div>
    </div>
);

export default PickerDashboard;
