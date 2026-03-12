import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const Home = () => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-40 pb-40">
            <section className="relative text-center max-w-6xl mx-auto pt-20">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 font-black text-xs uppercase tracking-widest mb-12"
            >
                <Sparkles className="w-4 h-4" />
                {t('saving_earth_tagline')}
            </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[5rem] md:text-[8rem] font-black leading-[0.85] tracking-[-0.05em] heading-emerald mb-12"
                >
                    {t('nature_meets')} <br />
                    <span className="text-white">{t('digital_wealth')}</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xl md:text-3xl text-emerald-100/60 max-w-3xl mx-auto mb-20 leading-relaxed font-medium"
                >
                    {t('hero_desc')}
                </motion.p>

                <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
                    <Link to="/user/login" className="btn-primary flex items-center gap-4 text-xl py-6 px-14 rounded-[2.5rem] group">
                        {t('start_collection')}
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform" />
                    </Link>
                    <Link to="/user/marketplace" className="btn-secondary flex items-center gap-4 text-xl py-6 px-14 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 font-black rounded-[2.5rem] transition-all">
                        {t('marketplace')}
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Home;
