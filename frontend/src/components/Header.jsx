import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Award, Scan, Store, LogOut, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Header = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('ecoledger_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user data", e);
                localStorage.removeItem('ecoledger_user');
            }
        }
        
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        // Immediately set the data-lang attr so CSS font switch is instant
        document.documentElement.setAttribute('data-lang', lng);
        localStorage.setItem('ecoledger_lang', lng);
    };

    const logout = () => {
        localStorage.removeItem('ecoledger_token');
        localStorage.removeItem('ecoledger_user');
        localStorage.removeItem('ecoledger_role');
        setUser(null);
        navigate('/');
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-6 py-4 ${scrolled ? 'mt-4 mx-6 rounded-[2.5rem] glass-morphism' : 'mt-0'}`}>
            <div className="container mx-auto flex justify-between items-center">
                
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:border-emerald-400 transition-all">
                        <Leaf className="w-7 h-7 text-emerald-400 fill-emerald-400/10" />
                    </div>
                    <span className="text-2xl font-black heading-emerald tracking-tighter">EcoLedger</span>
                </Link>

                <div className="hidden lg:flex items-center gap-10">
                    {user?.role === 'company' ? (
                        <Link to="/mnc/dashboard" className="text-sm font-bold text-emerald-100 hover:text-emerald-400 transition-colors uppercase tracking-widest">{t('dashboard') || 'Dashboard'}</Link>
                    ) : (
                        <>
                            <Link to="/user/upload" className="text-sm font-bold text-emerald-100 hover:text-emerald-400 transition-colors uppercase tracking-widest">{t('scan_plastic')}</Link>
                            <Link to="/user/dashboard" className="text-sm font-bold text-emerald-100 hover:text-emerald-400 transition-colors uppercase tracking-widest">{t('my_impact')}</Link>
                            <Link to="/user/marketplace" className="text-sm font-bold text-emerald-100 hover:text-emerald-400 transition-colors uppercase tracking-widest">{t('marketplace')}</Link>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-6">
                    {/* Language Switcher */}
                    <div className="flex items-center gap-1 bg-emerald-950/40 p-1.5 rounded-2xl border border-emerald-500/10">
                        <button 
                            onClick={() => changeLanguage('en')} 
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${i18n.language === 'en' ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                            title="English"
                        >EN</button>
                        <button 
                            onClick={() => changeLanguage('hi')} 
                            className={`px-3 py-1.5 rounded-xl font-black tracking-widest transition-all ${i18n.language === 'hi' ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                            style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: '13px' }}
                            title="हिन्दी"
                        >हिं</button>
                        <button 
                            onClick={() => changeLanguage('mr')} 
                            className={`px-3 py-1.5 rounded-xl font-black tracking-widest transition-all ${i18n.language === 'mr' ? 'bg-emerald-500 text-white shadow-lg' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                            style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: '13px' }}
                            title="मराठी"
                        >मरा</button>
                    </div>

                    {user ? (
                        <div className="flex items-center gap-4">
                            <button onClick={logout} className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 hover:bg-red-500/10 hover:border-red-500/20 transition-all text-emerald-100">
                                <LogOut className="w-5 h-5" />
                            </button>
                            <img src={`https://ui-avatars.com/api/?name=${user.full_name}&background=10b981&color=fff&bold=true`} className="w-11 h-11 rounded-xl border border-emerald-500/20" alt="Profile" />
                        </div>
                    ) : (
                        <Link to="/login" className="btn-primary !px-8 !py-3 !text-xs !font-black !rounded-2xl">
                            {t('sign_in')}
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Header;
