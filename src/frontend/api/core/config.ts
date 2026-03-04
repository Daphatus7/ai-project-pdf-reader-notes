/**
 * API configuration for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiConfig = {
	baseUrl: API_BASE_URL,
	timeout: 30000, // 30 seconds
	endpoints: {
		auth: {
			login: '/api/v1/auth/login',
			register: '/api/v1/auth/register',
			logout: '/api/v1/auth/logout',
			refresh: '/api/v1/auth/refresh',
			createProfile: '/api/v1/auth/create-profile',
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
		usage: '/api/v1/usage',
		billing: {
			checkout: '/api/v1/billing/checkout',
			portal: '/api/v1/billing/portal',
			cancel: '/api/v1/billing/cancel',
			resume: '/api/v1/billing/resume',
			subscription: '/api/v1/billing/subscription',
		},
		projects: {
			base: '/api/v1/projects',
			documents: (projectId: string) => `/api/v1/projects/${projectId}/documents`,
			document: (projectId: string, documentId: string) =>
				`/api/v1/projects/${projectId}/documents/${documentId}`,
			documentUrl: (projectId: string, documentId: string) =>
				`/api/v1/projects/${projectId}/documents/${documentId}/url`,
		},
		documents: {
			// SSE stream endpoint; connect after upload to receive processing status
			stream: (jobId: string) => `/api/v1/stream/${jobId}`,
		},
	},
} as const;
