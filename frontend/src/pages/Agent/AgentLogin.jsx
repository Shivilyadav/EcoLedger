import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useVoiceGuide } from '../../hooks/useVoiceGuide';
import { apiUrl } from '../../lib/api';

const AgentLogin = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { speakAction } = useVoiceGuide();
    const [assignedKey, setAssignedKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        speakAction('click_login');

        try {
            const res = await fetch(apiUrl('/api/agent/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assigned_key: assignedKey })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Login failed. Please check your assigned key.');
            }

            localStorage.setItem('ecoledger_token', data.token || '');
            localStorage.setItem('ecoledger_user', JSON.stringify(data.agent));
            localStorage.setItem('ecoledger_role', 'agent');
            navigate('/agent/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-[60vh] flex items-center justify-center">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[450px] glass-morphism p-12 rounded-[4rem] relative overflow-hidden border-orange-500/10"
            >
                <div className="leaf-accent" style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-orange-500/10 rounded-[2rem] flex items-center justify-center border border-orange-500/20 mx-auto mb-8 shadow-inner">
                        <ShieldCheck className="w-10 h-10 text-orange-400" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-3 tracking-tighter">{t('agent_portal_title')}</h2>
                    <p className="text-orange-100/40 text-sm font-bold uppercase tracking-widest leading-relaxed">
                        {t('agent_authorized_only')}
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-8">
                    <div className="space-y-3">
                        <input
                            type="text"
                            required
                            value={assignedKey}
                            onChange={(e) => setAssignedKey(e.target.value)}
                            className="w-full bg-orange-950/20 border border-orange-500/10 rounded-[1.75rem] py-5 px-8 focus:border-orange-500/40 transition-all outline-none text-white font-medium"
                            placeholder={t('agent_access_key_placeholder')}
                        />
                    </div>

                    {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}

                    <div className="flex flex-col gap-4">
                        <button type="submit" disabled={loading} className="w-full btn-primary bg-orange-600 hover:bg-orange-500 border-orange-400/50 flex items-center justify-center gap-4 text-xl py-6 rounded-[2rem] shadow-lg shadow-orange-900/20">
                            {loading ? <Loader2 className="animate-spin" /> : <>{t('agent_access_dashboard')} <ArrowRight /></>}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default AgentLogin;
