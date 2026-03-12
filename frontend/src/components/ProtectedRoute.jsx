import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('ecoledger_token');
    const location = useLocation();

    if (!token) {
        const isMnc = location.pathname.startsWith('/mnc');
        return <Navigate to={isMnc ? "/mnc/login" : "/user/login"} state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
