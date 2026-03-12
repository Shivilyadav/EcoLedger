import React from 'react';
import { motion } from 'framer-motion';
import { User, Building2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useVoiceGuide } from '../hooks/useVoiceGuide';

const PortalSelection = () => {
    const navigate = useNavigate();
    const { speakAction } = useVoiceGuide();
    const { t } = useTranslation();

    const handleSelect = (role) => {
        localStorage.setItem('ecoledger_role', role);
        if (role === 'waste_picker') {
            speakAction('select_user');
            setTimeout(() => navigate('/user/home'), 1500);
        } else if (role === 'agent') {
            speakAction('select_user'); // Reusing user voice for now
            setTimeout(() => navigate('/agent/login'), 1500);
        } else {
            speakAction('select_org');
            setTimeout(() => navigate('/mnc/login'), 1500);
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center py-12">
            <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="text-center mb-16"
            >
                <h1 className="text-7xl font-black heading-emerald tracking-tighter mb-6">
                    EcoLedger
                </h1>
                <p className="text-emerald-100/40 text-2xl font-medium max-w-2xl mx-auto">
                    {t('portal_selection_title')}
                </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 w-full max-w-7xl px-6">
                {/* Waste Picker Card */}
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect('waste_picker')}
                    className="glass-morphism p-12 rounded-[3.5rem] cursor-pointer group border-emerald-500/10 hover:border-emerald-500/40 transition-all relative overflow-hidden"
                >
                    <div className="leaf-accent opacity-20" />
                    <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mb-8 group-hover:bg-emerald-500/20 transition-colors">
                        <User className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h3 className="text-4xl font-black text-white mb-4">
                        {t('i_am_a')} <span className="text-emerald-400">{t('picker')}</span>
                    </h3>
                    <p className="text-emerald-100/40 text-lg mb-8">
                        {t('picker_desc')}
                    </p>
                    <div className="flex items-center gap-2 text-emerald-400 font-bold group-hover:gap-4 transition-all">
                        {t('enter_user_portal')} <ArrowRight className="w-5 h-5" />
                    </div>
                    
                    <div className="absolute top-6 right-8 opacity-10">
                        <Zap className="w-24 h-24 text-emerald-500" />
                    </div>
                </motion.div>

                {/* Field Agent Card */}
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect('agent')}
                    className="glass-morphism p-12 rounded-[3.5rem] cursor-pointer group border-orange-500/10 hover:border-orange-500/40 transition-all relative overflow-hidden"
                >
                    <div className="leaf-accent opacity-10" style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />
                    <div className="w-20 h-20 rounded-3xl bg-orange-500/10 flex items-center justify-center mb-8 group-hover:bg-orange-500/20 transition-colors">
                        <ShieldCheck className="w-10 h-10 text-orange-400" />
                    </div>
                    <h3 className="text-4xl font-black text-white mb-4">
                        {t('field')} <span className="text-orange-400">{t('agent')}</span>
                    </h3>
                    <p className="text-emerald-100/40 text-lg mb-8">
                        {t('agent_desc')}
                    </p>
                    <div className="flex items-center gap-2 text-orange-400 font-bold group-hover:gap-4 transition-all">
                        {t('open_agent_portal')} <ArrowRight className="w-5 h-5" />
                    </div>

                    <div className="absolute top-6 right-8 opacity-10">
                        <User className="w-24 h-24 text-orange-500" />
                    </div>
                </motion.div>

                {/* MNC Card */}
                <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect('company')}
                    className="glass-morphism p-12 rounded-[3.5rem] cursor-pointer group border-purple-500/10 hover:border-purple-500/40 transition-all relative overflow-hidden"
                >
                    <div className="leaf-accent opacity-10" style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
                    <div className="w-20 h-20 rounded-3xl bg-purple-500/10 flex items-center justify-center mb-8 group-hover:bg-purple-500/20 transition-colors">
                        <Building2 className="w-10 h-10 text-purple-400" />
                    </div>
                    <h3 className="text-4xl font-black text-white mb-4">{t('organization')}</h3>
                    <p className="text-emerald-100/40 text-lg mb-8">
                        {t('org_desc')}
                    </p>
                    <div className="flex items-center gap-2 text-purple-400 font-bold group-hover:gap-4 transition-all">
                        {t('corporate_console')} <ArrowRight className="w-5 h-5" />
                    </div>

                    <div className="absolute top-6 right-8 opacity-10">
                        <Zap className="w-24 h-24 text-purple-500" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default PortalSelection;
