
import { apiConfig } from '../core/config';
import { ApiError } from '../core/errors';
import { supabase } from './supabase';

export interface LoginRequest {
	email: string;
	password: string;
}

export interface RegisterRequest {
	email: string;
	username: string;
	password: string;
	full_name?: string;
}

export interface RegisterResponse {
	id: string;
	email: string;
	username: string;
	full_name: string | null;
	status: string;
}

export interface AuthSession {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	expires_at?: number;
	token_type: string;
	user: {
		id: string;
		email: string;
		[key: string]: unknown;
	};
}

export interface LoginResponse {
	session: AuthSession;
	user: AuthSession['user'];
}

/**
 * Register via backend API
 */
export async function registerViaApi(data: RegisterRequest): Promise<RegisterResponse> {
	const url = `${apiConfig.baseUrl}${apiConfig.endpoints.auth.register}`;

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		let errorMessage = `Registration failed: ${response.status}`;
		try {
			const errorData = await response.json();
			if (errorData?.detail) {
				errorMessage = errorData.detail;
			}
		} catch {
			// ignore json parse error
		}
		throw new ApiError(errorMessage, response.status);
	}

	return response.json();
}

/**
 * Login via backend API and set session in Supabase client
 */
export async function loginViaApi(email: string, password: string): Promise<LoginResponse> {
	const url = `${apiConfig.baseUrl}${apiConfig.endpoints.auth.login}`;

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, password }),
	});

	if (!response.ok) {
		let errorMessage = `Login failed: ${response.status}`;
		try {
			const errorData = await response.json();
			if (errorData?.detail) {
				errorMessage = errorData.detail;
			}
		} catch {
			// ignore json parse error
		}
		throw new ApiError(errorMessage, response.status);
	}

	const data = await response.json();

	// Set session in Supabase client for subsequent requests
	if (data.session) {
		await supabase.auth.setSession({
			access_token: data.session.access_token,
			refresh_token: data.session.refresh_token,
		});
	}

	return data;
}

/**
 * Login with debug credentials from environment variables
 */
export async function loginWithDebugCredentials(): Promise<LoginResponse> {
	const email = import.meta.env.VITE_DEBUG_EMAIL;
	const password = import.meta.env.VITE_DEBUG_PASSWORD;

	if (!email || !password) {
		throw new ApiError('Debug credentials not configured in environment variables');
	}

	return loginViaApi(email, password);
}

/**
 * Legacy: Login via Supabase SDK directly
 */
export async function getAccessToken(email: string, password: string) {
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) {
		console.log('Error: ', error.message);
		throw new ApiError(error.message);
	}
	return data;
}

/**
 * Login with Google OAuth via Supabase
 */
export async function loginWithGoogle() {
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: window.location.origin,
		},
	});
	if (error) throw new ApiError(error.message);
	return data;
}

/**
 * Logout user
 */
export async function logout() {
	const { error } = await supabase.auth.signOut();
	if (error) {
		console.log('Logout error:', error.message);
	}
}

