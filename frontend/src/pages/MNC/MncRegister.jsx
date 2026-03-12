import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, ArrowRight, Loader2, FileText, MapPin, UserCheck, Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/api';

const MncRegister = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        company_name:      '',
        gstin:             '',
        company_email:     '',
        company_phone:     '',
        authorized_person: '',
        company_address:   '',
        password:          ''
    });
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');

        try {
            const res = await fetch(apiUrl('/api/company/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Registration failed');

            navigate('/mnc/login', { 
                state: { 
                    message: t('registration_submitted_await_key')
                } 
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen py-20 flex items-center justify-center">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[800px] glass-morphism p-12 rounded-[5rem] relative overflow-hidden border-purple-500/10"
            >
                <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/5 blur-3xl -ml-32 -mt-32 rounded-full" />
                
                <div className="text-center mb-12">
                    <h2 className="text-5xl font-black text-white mb-2 tracking-tighter">{t('register_organization')}</h2>
                    <p className="text-purple-400/40 text-sm font-black uppercase tracking-widest">{t('join_circular_economy')}</p>
                </div>

                <form onSubmit={handleRegister} className="grid md:grid-cols-2 gap-6">
                    <Input icon={<Building2 />} name="company_name" placeholder={t('company_name')} value={formData.company_name} onChange={handleChange} />
                    <Input icon={<FileText />}  name="gstin"        placeholder={t('gstin_tax')} value={formData.gstin} onChange={handleChange} />
                    <Input icon={<Mail />}      name="company_email" placeholder={t('corporate_email')} type="email" value={formData.company_email} onChange={handleChange} />
                    <Input icon={<Phone />}     name="company_phone" placeholder={t('contact_number')} value={formData.company_phone} onChange={handleChange} />
                    <Input icon={<UserCheck />} name="authorized_person" placeholder={t('authorized_person')} value={formData.authorized_person} onChange={handleChange} />
                    <Input icon={<MapPin />}    name="company_address" placeholder={t('hq_address')} value={formData.company_address} onChange={handleChange} />
                    
                    <div className="md:col-span-2">
                        <input
                            type="password"
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-purple-500/10 rounded-3xl py-5 px-8 focus:border-purple-500/40 transition-all outline-none text-white font-medium"
                            placeholder={t('create_system_password')}
                        />
                    </div>

                    {error && <p className="md:col-span-2 text-red-400 text-xs font-bold text-center">{error}</p>}

                    <div className="md:col-span-2 flex flex-col gap-6 mt-6">
                        <button type="submit" disabled={loading} 
                            className="w-full py-6 rounded-3xl text-xl font-black flex items-center justify-center gap-4
                                bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-950/20 hover:scale-[1.01] transition-all">
                            {loading ? <Loader2 className="animate-spin" /> : <>{t('submit_registration')} <ArrowRight /></>}
                        </button>
                        
                        <Link to="/mnc/login" className="text-center text-purple-400/40 font-bold hover:text-purple-300 transition-colors">
                            {t('already_registered_login')}
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const Input = ({ icon, ...props }) => (
    <div className="relative group">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-purple-400/20 group-focus-within:text-purple-400 transition-colors">
            {React.cloneElement(icon, { size: 20 })}
        </div>
        <input
            required
            {...props}
            className="w-full bg-black/40 border border-purple-500/10 rounded-3xl py-5 pl-16 pr-8 focus:border-purple-500/40 transition-all outline-none text-white font-medium"
        />
    </div>
);

export default MncRegister;
