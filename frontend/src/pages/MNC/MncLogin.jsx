import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Building2, ArrowRight, Loader2, Globe, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/api';

const MncLogin = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [assignedKey, setAssignedKey] = useState('');
    const [password, setPassword] = useState('');
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState('');
    const [info] = useState(location.state?.message || '');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');

        try {
            const res = await fetch(apiUrl('/api/company/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigned_key: assignedKey, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Corporate account not found');

            const company = data.company || {};
            localStorage.setItem('ecoledger_token', data.token || '');
            localStorage.setItem('ecoledger_user', JSON.stringify(company));
            localStorage.setItem('ecoledger_role', company.role || 'company');
            navigate('/mnc/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-[70vh] flex items-center justify-center">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[500px] glass-morphism p-12 rounded-[4.5rem] relative overflow-hidden border-purple-500/10"
            >
                {/* Corporate Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl -mr-16 -mt-16" />
                
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-purple-500/10 rounded-[2rem] flex items-center justify-center border border-purple-500/20 mx-auto mb-8">
                        <Building2 className="w-10 h-10 text-purple-400" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-2 tracking-tighter italic">{t('corporate_console')}</h2>
                    <p className="text-purple-400/40 text-xs font-black uppercase tracking-widest">{t('sustainability_dashboard_access')}</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6" noValidate>
                    <div>
                        <input
                            type="text"
                            name="assigned_key"
                            inputMode="text"
                            autoComplete="off"
                            spellCheck={false}
                            required
                            value={assignedKey}
                            onChange={(e) => setAssignedKey(e.target.value)}
                            className="w-full bg-black/40 border border-purple-500/10 rounded-3xl py-5 px-8 focus:border-purple-500/40 transition-all outline-none text-white font-medium placeholder-purple-900/40"
                            placeholder={t('assigned_key')}
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-purple-500/10 rounded-3xl py-5 px-8 focus:border-purple-500/40 transition-all outline-none text-white font-medium placeholder-purple-900/40"
                            placeholder={t('password')}
                        />
                    </div>

                    {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}
                    {info && <p className="text-emerald-300 text-xs font-bold text-center">{info}</p>}

                    <button type="submit" disabled={loading} 
                        className="w-full py-6 rounded-3xl text-xl font-black flex items-center justify-center gap-4
                            bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-950/20 hover:scale-[1.02] active:scale-95 transition-all">
                        {loading ? <Loader2 className="animate-spin" /> : <>{t('enter_console')} <ArrowRight /></>}
                    </button>
                    
                    <div className="text-center">
                        <Link to="/mnc/register" className="text-purple-400/40 text-sm font-bold hover:text-purple-300 transition-colors">
                            {t('need_corporate_registration')} {t('register_mnc')}
                        </Link>
                    </div>
                </form>

                <div className="mt-12 pt-8 border-t border-white/5 flex justify-center gap-6 opacity-30">
                    <Globe className="w-5 h-5 text-purple-400" />
                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                </div>
            </motion.div>
        </div>
    );
};

export default MncLogin;
