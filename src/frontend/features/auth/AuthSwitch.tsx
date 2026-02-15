/**
 * @file        AuthSwitch.tsx
 * @description 根据登录状态显示不同内容
 */

import { useAuth } from './AuthProvider.tsx';
import React from "react";

interface AuthSwitchProps {
	authenticated: React.ReactNode;
	unauthenticated: React.ReactNode;
}

export default function AuthSwitch({ authenticated, unauthenticated }: AuthSwitchProps) {
	const { session, loading } = useAuth();

	if (loading) {
		return <div className="flex h-screen items-center justify-center">Loading...</div>;
	}

	return <>{session ? authenticated : unauthenticated}</>;
}
