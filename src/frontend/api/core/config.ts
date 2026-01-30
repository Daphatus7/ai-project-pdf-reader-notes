/**
 * API configuration for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const apiConfig = {
	baseUrl: API_BASE_URL,
	timeout: 30000, // 30 seconds
	endpoints: {
		auth: {
			login: '/api/v1/auth/login',
			register: '/api/v1/auth/register',
			logout: '/api/v1/auth/logout',
			refresh: '/api/v1/auth/refresh',
		},
		llm: {
			chat: '/api/v1/llm/chat',
			chatStream: '/api/v1/llm/chat/',
		},
	},
} as const;
