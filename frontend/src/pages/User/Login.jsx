import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useVoiceGuide } from '../../hooks/useVoiceGuide';
import { apiUrl } from '../../lib/api';

const Login = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { speakAction } = useVoiceGuide();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const [isRegister, setIsRegister] = useState(false);
    const [fullName, setFullName] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setInfo('');
        speakAction(isRegister ? 'click_register' : 'click_login');

        try {
            const endpoint = isRegister ? '/api/register' : '/api/login';
            const body = isRegister 
                ? { full_name: fullName, identifier, password }
                : { identifier, password };

            const res = await fetch(apiUrl(endpoint), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Authentication failed. Please check your credentials.');
            }

            if (isRegister) {
                setIsRegister(false);
                setInfo(t('registration_submitted_await_key'));
                setFullName('');
                setPassword('');
                return;
            }

            const user = data.user || {};
            localStorage.setItem('ecoledger_token', data.token || '');
            localStorage.setItem('ecoledger_user', JSON.stringify(user));
            localStorage.setItem('ecoledger_role', user.role || 'waste_picker');
            navigate('/user/dashboard');
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
                className="w-full max-w-[450px] glass-morphism p-12 rounded-[4rem] relative overflow-hidden"
            >
                <div className="leaf-accent" />
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center border border-emerald-500/20 mx-auto mb-8 shadow-inner">
                        <Leaf className="w-10 h-10 text-emerald-400 fill-emerald-400/10" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-3 tracking-tighter">{t('welcome')}</h2>
                    <p className="text-emerald-100/40 text-sm font-bold uppercase tracking-widest">{t('access_secure_ledger')}</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-8">
                    {isRegister && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-3"
                        >
                            <input
                                type="text"
                                required
                                value={fullName}
                                onFocus={() => speakAction('focus_name')}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-emerald-950/40 border border-emerald-500/10 rounded-[1.75rem] py-5 px-8 focus:border-emerald-500/40 transition-all outline-none text-white font-medium"
                                placeholder={t('full_name')}
                            />
                        </motion.div>
                    )}
                    <div className="space-y-3">
                        <input
                            type="text"
                            required
                            value={identifier}
                            onFocus={() => speakAction('focus_identifier')}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full bg-emerald-950/40 border border-emerald-500/10 rounded-[1.75rem] py-5 px-8 focus:border-emerald-500/40 transition-all outline-none text-white font-medium"
                            placeholder={t('assigned_key')}
                        />
                    </div>
                    <div className="space-y-3">
                        <input
                            type="password"
                            required
                            value={password}
                            onFocus={() => speakAction('focus_password')}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-emerald-950/40 border border-emerald-500/10 rounded-[1.75rem] py-5 px-8 focus:border-emerald-500/40 transition-all outline-none text-white font-medium"
                            placeholder={t('password')}
                        />
                    </div>

                    {error && <p className="text-red-400 text-xs font-bold text-center">{error}</p>}
                    {info && <p className="text-emerald-300 text-xs font-bold text-center">{info}</p>}

                    <div className="flex flex-col gap-4">
                        <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-4 text-xl py-6 rounded-[2rem]">
                            {loading ? <Loader2 className="animate-spin" /> : <>{isRegister ? t('create_account') : t('sign_in')} <ArrowRight /></>}
                        </button>
                        
                        <button 
                            type="button"
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-emerald-400/60 font-bold text-sm hover:text-emerald-400 transition-colors"
                        >
                            {isRegister ? t('already_have_account') : t('new_here_join_picker')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;
