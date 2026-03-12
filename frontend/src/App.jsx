import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import VoiceAgent from './components/VoiceAgent';
import ErrorBoundary from './components/ErrorBoundary';
import PortalSelection from './pages/PortalSelection';
import { useTranslation } from 'react-i18next';

// User Portal Pages
import UserHome from './pages/User/Home';
import PickerDashboard from './pages/User/PickerDashboard';
import UploadPlastic from './pages/User/UploadPlastic';
import UserLogin from './pages/User/Login';
import UserMarketplace from './pages/User/Marketplace';

// MNC Portal Pages
import MncLogin from './pages/MNC/MncLogin';
import MncRegister from './pages/MNC/MncRegister';
import MncDashboard from './pages/MNC/MncDashboard';

// Agent Portal Pages
import AgentLogin from './pages/Agent/AgentLogin';
import AgentDashboard from './pages/Agent/AgentDashboard';

import ProtectedRoute from './components/ProtectedRoute';
import './i18n';

const LoadingFallback = () => {
    const { t } = useTranslation();
    return (
        <div className="text-center py-20 animate-pulse font-black text-3xl text-emerald-500">
            {t('app_loading')}
        </div>
    );
};

function App() {
    return (
        <BrowserRouter>
            <div className="app-shell text-emerald-50">
                <Header />
                <main className="relative z-10 container mx-auto px-6 py-24 lg:py-32">
                    <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                                {/* Entry Point */}
                                <Route path="/" element={<PortalSelection />} />

                                {/* User Portal Routes */}
                                <Route path="/user/home" element={<UserHome />} />
                                <Route path="/user/login" element={<UserLogin />} />
                                <Route 
                                    path="/user/dashboard" 
                                    element={
                                        <ProtectedRoute>
                                            <PickerDashboard />
                                        </ProtectedRoute>
                                    } 
                                />
                                <Route 
                                    path="/user/upload" 
                                    element={
                                        <ProtectedRoute>
                                            <UploadPlastic />
                                        </ProtectedRoute>
                                    } 
                                />
                                <Route 
                                    path="/user/marketplace" 
                                    element={
                                        <ProtectedRoute>
                                            <UserMarketplace />
                                        </ProtectedRoute>
                                    } 
                                />

                                {/* MNC Portal Routes */}
                                <Route path="/mnc/login" element={<MncLogin />} />
                                <Route path="/mnc/register" element={<MncRegister />} />
                                <Route 
                                    path="/mnc/dashboard" 
                                    element={
                                        <ProtectedRoute>
                                            <MncDashboard />
                                        </ProtectedRoute>
                                    } 
                                />

                                {/* Agent Portal Routes */}
                                <Route path="/agent/login" element={<AgentLogin />} />
                                <Route 
                                    path="/agent/dashboard" 
                                    element={
                                        <ProtectedRoute>
                                            <AgentDashboard />
                                        </ProtectedRoute>
                                    } 
                                />

                                {/* Fallback */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Suspense>
                    </ErrorBoundary>
                </main>
                <VoiceAgent />
            </div>
        </BrowserRouter>
    );
}

export default App;
