/**
 * @file        AuthProvider.tsx
 * @description 全局 Auth 上下文，让任何组件都能访问用户状态
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../../api/services/supabase.ts';
import { apiConfig } from '../../api/core/config.ts';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
	session: Session | null;
	user: User | null;
	loading: boolean;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * OAuth 用户首次登录时，自动创建 profile（静默调用 create-profile）
 * 后端用 upsert，重复调用不会出错
 */
async function ensureProfileExists(session: Session) {
	const user = session.user;
	const displayName =
		user.user_metadata?.full_name ||
		user.user_metadata?.name ||
		user.email ||
		'User';

	try {
		await fetch(`${apiConfig.baseUrl}${apiConfig.endpoints.auth.createProfile}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session.access_token}`,
			},
			body: JSON.stringify({ display_name: displayName }),
		});
	} catch (err) {
		console.error('Failed to ensure profile exists:', err);
	}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);
	const profileChecked = useRef<Set<string>>(new Set());

	useEffect(() => {
		const maybeCreateProfile = async (session: Session | null) => {
			if (!session?.user || profileChecked.current.has(session.user.id)) return;
			profileChecked.current.add(session.user.id);
			await ensureProfileExists(session);
		};

		// 初始化时获取 session（页面刷新也会补建 profile）
		supabase.auth.getSession().then(async ({ data: { session } }) => {
			await maybeCreateProfile(session);
			setSession(session);
			setLoading(false);
		});

		// 监听变化（先建 profile，再 setSession，避免竞态）
		const { data: { subscription } } = supabase.auth.onAuthStateChange(
			async (event, session) => {
				if (event === 'SIGNED_IN') {
					await maybeCreateProfile(session);
				}
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
