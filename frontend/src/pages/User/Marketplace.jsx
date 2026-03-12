import React, { useEffect, useState } from 'react';
import { Tag, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/api';

const Marketplace = () => {
    const { t } = useTranslation();
    const [credits, setCredits] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(apiUrl('/marketplace'));
                const data = await res.json();
                setCredits(Array.isArray(data) ? data : (data?.items || []));
            } catch (e) {
                setCredits([]);
            }
        })();
    }, []);

    return (
        <div className="space-y-20">
            <div>
                <span className="px-5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[10px] uppercase tracking-widest rounded-full mb-6 inline-block">
                    {t('global_exchange')}
                </span>
                <h2 className="text-7xl font-black heading-emerald tracking-tighter leading-none mb-6">
                    {t('marketplace_title')}
                </h2>
            </div>

            {credits.length === 0 ? (
                <p className="text-emerald-800 font-bold text-center py-10">{t('no_marketplace_items')}</p>
            ) : (
                <div className="grid md:grid-cols-2 gap-10">
                    {credits.map((c) => (
                        <motion.div
                            key={c.id || `${c.type}-${c.weight}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass-morphism p-12 rounded-[4rem] relative overflow-hidden group"
                        >
                            <div className="leaf-accent" />
                            <Tag className="w-10 h-10 text-emerald-500 mb-8" />
                            <h3 className="text-4xl font-black text-white mb-2">{c.type}</h3>
                            <p className="text-emerald-100/20 font-bold mb-8">
                                {c.weight} {t('batch_label')}
                            </p>
                            <div className="flex justify-between items-center">
                                <span className="text-3xl font-black text-emerald-400">{c.price}</span>
                                <button
                                    className="p-5 bg-emerald-500 rounded-3xl text-white opacity-60 cursor-not-allowed"
                                    disabled
                                >
                                    <ShoppingCart className="w-6 h-6" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Marketplace;

