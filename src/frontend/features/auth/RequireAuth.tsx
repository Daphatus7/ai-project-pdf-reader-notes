/**
 * @file        RequireAuth.tsx
 * @description 保护需要登录的路由
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider.tsx';
import React from "react";

interface RequireAuthProps {
	children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
	const { session, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return <div className="flex h-screen items-center justify-center">Loading...</div>;
	}

	if (!session) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <>{children}</>;
}
