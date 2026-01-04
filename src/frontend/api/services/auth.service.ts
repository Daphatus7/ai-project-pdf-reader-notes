/**
 * @file        auth.service.ts
 * @description Supabase 认证服务 - 提供完整的用户认证功能
 *
 * @author      [Peiyu Wang]
 * @created     Sunday
 * @license     © 2026 . All rights reserved.
 */

import { createClient, Session, User, AuthError } from '@supabase/supabase-js';
import type { LoginRequest, RegisterRequest } from '../types/auth';

// 初始化 Supabase 客户端
const supabase = createClient(
	import.meta.env.VITE_SUPABASE_URL,
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
);

/**
 * 认证响应统一格式
 */
interface AuthResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * 用户登录
 * @param credentials - 登录凭证 { email, password }
 * @returns 登录结果，包含 session 和 user 信息
 */
export async function login(credentials: {
	email: string;
	password: string;
}): Promise<AuthResponse<{ session: Session; user: User }>> {
	try {
		const { data, error } = await supabase.auth.signInWithPassword({
			email: credentials.email,
			password: credentials.password,
		});

		if (error) throw error;

		return {
			success: true,
			data: {
				session: data.session!,
				user: data.user!,
			},
		};
	} catch (error) {
		const authError = error as AuthError;
		return {
			success: false,
			error: authError.message || '登录失败',
		};
	}
}

/**
 * 用户注册
 * @param userData - 注册信息 { email, password }
 * @returns 注册结果
 */
export async function register(userData: {
	email: string;
	password: string;
	metadata?: {
		username?: string;
		firstname?: string;
		lastname?: string;
	};
}): Promise<AuthResponse<{ session: Session | null; user: User }>> {
	try {
		const { data, error } = await supabase.auth.signUp({
			email: userData.email,
			password: userData.password,
			options: {
				data: userData.metadata || {},
			},
		});

		if (error) throw error;

		return {
			success: true,
			data: {
				session: data.session,
				user: data.user!,
			},
		};
	} catch (error) {
		const authError = error as AuthError;
		return {
			success: false,
			error: authError.message || '注册失败',
		};
	}
}

/**
 * 用户登出
 * @returns 登出结果
 */
export async function logout(): Promise<AuthResponse> {
	try {
		const { error } = await supabase.auth.signOut();
		if (error) throw error;

		return { success: true };
	} catch (error) {
		const authError = error as AuthError;
		return {
			success: false,
			error: authError.message || '登出失败',
		};
	}
}

/**
 * 获取当前用户信息
 * @returns 当前登录的用户，如果未登录返回 null
 */
export async function getCurrentUser(): Promise<User | null> {
	try {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		return user;
	} catch (error) {
		console.error('获取用户信息失败:', error);
		return null;
	}
}

/**
 * 获取当前 session
 * @returns 当前的 session，如果未登录返回 null
 */
export async function getSession(): Promise<Session | null> {
	try {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		return session;
	} catch (error) {
		console.error('获取 session 失败:', error);
		return null;
	}
}

/**
 * 获取访问令牌
 * @returns 访问令牌，如果未登录返回 null
 */
export async function getAccessToken(): Promise<string | null> {
	const session = await getSession();
	return session?.access_token ?? null;
}

/**
 * 刷新 session
 * @returns 新的 session
 */
export async function refreshToken(): Promise<AuthResponse<{ session: Session }>> {
	try {
		const { data, error } = await supabase.auth.refreshSession();
		if (error) throw error;

		return {
			success: true,
			data: {
				session: data.session!,
			},
		};
	} catch (error) {
		const authError = error as AuthError;
		return {
			success: false,
			error: authError.message || '刷新 token 失败',
		};
	}
}

/**
 * 更新用户资料
 * @param updates - 要更新的用户信息
 * @returns 更新结果
 */
export async function updateProfile(updates: {
	email?: string;
	password?: string;
	data?: {
		username?: string;
		firstname?: string;
		lastname?: string;
		[key: string]: any;
	};
}): Promise<AuthResponse<{ user: User }>> {
	try {
		const { data, error } = await supabase.auth.updateUser(updates);
		if (error) throw error;

		return {
			success: true,
			data: {
				user: data.user!,
			},
		};
	} catch (error) {
		const authError = error as AuthError;
		return {
			success: false,
			error: authError.message || '更新资料失败',
		};
	}
}

/**
 * 监听认证状态变化
 * @param callback - 状态变化时的回调函数
 * @returns 取消监听的函数
 */
export function onAuthStateChange(
	callback: (event: string, session: Session | null) => void
) {
	const {
		data: { subscription },
	} = supabase.auth.onAuthStateChange(callback);

	// 返回取消订阅的函数
	return () => subscription.unsubscribe();
}

// 导出 supabase 客户端供其他模块使用
export { supabase };