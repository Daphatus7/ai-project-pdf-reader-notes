/**
 * @file        AuthProvider.tsx
 * @description 全局 Auth 上下文，让任何组件都能访问用户状态
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../api/services/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
	session: Session | null;
	user: User | null;
	loading: boolean;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// 初始化时获取 session
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			setLoading(false);
		});

		// 监听变化
		const { data: { subscription } } = supabase.auth.onAuthStateChange(
			(_event, session) => {
				setSession(session);
			}
		);

		return () => subscription.unsubscribe();
	}, []);

	const signOut = async () => {
		await supabase.auth.signOut();
		setSession(null);
	};

	return (
		<AuthContext.Provider value={{
			session,
			user: session?.user ?? null,
			loading,
			signOut,
		}}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
