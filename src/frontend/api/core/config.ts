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
			thread: '/api/v1/llm/thread',
			threadList: '/api/v1/llm/thread/list',
			threadLoad: '/api/v1/llm/thread/load',
		},
		notes: {
			base: '/api/v1/notes',
		},
		projects: {
			base: '/api/v1/projects',
			documents: (projectId: string) => `/api/v1/projects/${projectId}/documents`,
			document: (projectId: string, documentId: string) =>
				`/api/v1/projects/${projectId}/documents/${documentId}`,
			documentUrl: (projectId: string, documentId: string) =>
				`/api/v1/projects/${projectId}/documents/${documentId}/url`,
		},
	},
} as const;
