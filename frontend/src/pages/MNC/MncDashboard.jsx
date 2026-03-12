import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, CheckCircle, XCircle, Wallet, 
    TrendingUp, Shield, Package, ArrowRight, ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/api';

const MncDashboard = () => {
    const { t } = useTranslation();
    const [user, setUser] = useState(null);
    const [uploads, setUploads] = useState([]);
    const [stats, setStats] = useState({ total_offsets: 0, active_collectors: 0, verified_plastic: 0, impact_budget: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'approved'

    useEffect(() => {
        const stored = localStorage.getItem('ecoledger_user');
        if (stored) {
            try {
                const u = JSON.parse(stored);
                setUser(u);
                fetchData(u);
            } catch (e) {
                console.error("Failed to parse company user", e);
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, [activeTab]);

    const fetchData = async (u = user) => {
        if (!u) return;
        setLoading(true);
        try {
            const companyId = u.company_id || u.user_id;
            // Fetch Stats
            const statsRes = await fetch(apiUrl(`/api/company/stats?company_id=${companyId}`));
            if (statsRes.ok) setStats(await statsRes.json());

            // Fetch Uploads filtered by tab
            const res = await fetch(apiUrl(`/api/company/uploads?company_id=${companyId}&status=${activeTab}`));
            const data = await res.json();
            setUploads(data.uploads || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (uploadId, action) => {
        try {
            const companyId = user?.company_id || user?.user_id;
            const res = await fetch(apiUrl(`/api/company/uploads/${uploadId}/${action}`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_id: companyId })
            });
            if (res.ok) fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handlePayment = async (upload) => {
        try {
            const companyId = user?.company_id || user?.user_id;
            const res = await fetch(apiUrl('/api/company/payments'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    upload_id: upload.upload_id,
                    picker_user_id: upload.picker_user_id,
                    company_id: companyId,
                    amount: parseFloat(upload.weight) * 12.5 || 0.0 // Ensure valid number
                })
            });
            if (res.ok) fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-12 pb-24">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-5 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 font-black text-[10px] uppercase tracking-widest rounded-full">
                            {t('corporate_node')}
                        </span>
                    </div>
                    <h2 className="text-7xl font-black text-white tracking-tighter leading-none italic">
                        {user?.company_name || user?.full_name || t('organization')}
                    </h2>
                </div>
                
                <div className="flex gap-4">
                    <div className="bg-black/30 p-6 rounded-[2.5rem] border border-white/5 min-w-[200px]">
                        <p className="text-purple-400/40 text-[10px] uppercase font-black tracking-widest mb-1">{t('impact_budget')}</p>
                        <p className="text-3xl font-black text-white">₹ {stats?.impact_budget?.toLocaleString() || '0'}</p>
                    </div>
                </div>
            </header>

            {/* ── Analytics ── */}
            <div className="grid lg:grid-cols-3 gap-8">
                <AnalyticCard label={t('total_offsets')} value={stats.total_offsets} unit={t('unit_tons')} icon={<TrendingUp />} />
                <AnalyticCard label={t('active_collectors')} value={stats.active_collectors} unit={t('unit_users')} icon={<Shield />} color="text-emerald-400" />
                <AnalyticCard label={t('verified_plastic_label')} value={stats.verified_plastic} unit="kg" icon={<Package />} color="text-blue-400" />
            </div>

            {/* ── Main Work Area ── */}
            <section className="glass-morphism p-10 rounded-[4rem] relative overflow-hidden">
                <div className="leaf-accent opacity-10" style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <h3 className="text-3xl font-black text-white flex items-center gap-4 italic">
                        <CheckCircle className="w-8 h-8 text-purple-500" />
                        {t('supply_chain_ledger')}
                    </h3>

                    {/* Tabs */}
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                        <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} label={t('verification_queue')} count={activeTab === 'pending' ? (uploads || []).length : null} />
                        <TabButton active={activeTab === 'approved'} onClick={() => setActiveTab('approved')} label={t('awaiting_payment')} count={activeTab === 'approved' ? (uploads || []).length : null} />
                    </div>
                </div>

                <div className="space-y-6">
                    {loading ? (
                        <p className="text-purple-300 font-bold animate-pulse">{t('syncing_ledger')}</p>
                    ) : uploads.length === 0 ? (
                        <div className="bg-black/30 p-12 rounded-[3rem] text-center border border-white/5">
                            <p className="text-purple-400/40 font-bold text-xl">
                                {activeTab === 'pending' ? t('no_pending_uploads') : t('no_items_awaiting_payment')}
                            </p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {uploads.map((upload) => (
                                <motion.div 
                                    key={upload.upload_id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-black/40 p-8 rounded-[3rem] flex flex-col md:flex-row items-center gap-8 border border-white/5 hover:border-purple-500/20 transition-all group"
                                >
                                    <div className="w-24 h-24 rounded-[1.5rem] bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                                        <Package className="w-8 h-8 text-purple-400 relative z-10" />
                                        <div className="absolute inset-0 bg-purple-500/5 group-hover:scale-110 transition-transform" />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-2xl font-black text-white">{upload.plastic_type}</span>
                                            <span className="text-purple-400 font-black">•</span>
                                            <span className="text-xl font-bold text-purple-300">{upload.weight}</span>
                                        </div>
                                        <p className="text-purple-400/40 text-[10px] font-black uppercase tracking-[0.2em]">
                                            {t('collector_label')}: {upload.picker_user_id} • {t('ref_label')}: {upload.upload_id}
                                        </p>
                                    </div>

                                    <div className="flex gap-4">
                                        {activeTab === 'pending' ? (
                                            <>
                                                <button 
                                                    onClick={() => handleAction(upload.upload_id, 'reject')}
                                                    className="px-6 py-4 rounded-2xl bg-red-500/10 text-red-400 font-black flex items-center gap-2 hover:bg-red-500/20 transition-all"
                                                >
                                                    <XCircle className="w-5 h-5" /> {t('reject')}
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(upload.upload_id, 'approve')}
                                                    className="px-10 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-950/20"
                                                >
                                                    <CheckCircle className="w-5 h-5" /> {t('verify_approve')}
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                onClick={() => handlePayment(upload)}
                                                className="px-12 py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-purple-950/20"
                                            >
                                                <Wallet className="w-6 h-6" /> {t('process_payment')}
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </section>
        </div>
    );
};

const TabButton = ({ active, onClick, label, count }) => (
    <button
        onClick={onClick}
        className={`px-8 py-4 rounded-xl font-black text-sm transition-all flex items-center gap-3 ${
            active ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-400/40 hover:text-purple-400'
        }`}
    >
        {label}
        {count !== null && (
            <span className={`px-2 py-0.5 rounded-md text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-400'}`}>
                {count}
            </span>
        )}
    </button>
);

const AnalyticCard = ({ label, value, unit, icon, color = "text-purple-400" }) => (
    <div className="glass-morphism p-10 rounded-[3.5rem] relative group border-white/5 hover:border-purple-500/20 transition-all">
        <div className={`w-14 h-14 rounded-[1.5rem] bg-purple-500/10 flex items-center justify-center mb-8 ${color}`}>
            {React.cloneElement(icon, { size: 28 })}
        </div>
        <p className="text-purple-400/40 font-black text-[10px] uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-baseline gap-3">
            <span className="text-5xl font-black text-white tracking-tighter">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            <span className="text-purple-100/20 font-bold">{unit}</span>
        </div>
    </div>
);

export default MncDashboard;
