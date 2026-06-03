/**
 * Projects & Documents API service
 */

import type { Project, Document } from '@/frontend/components/source/type';
import { get, post, del, upload } from '../core/client';
import { apiConfig } from '../core/config';

const PROJECTS_BASE = apiConfig.endpoints.projects.base;

/**
 * Cache of signed document URLs, keyed by documentId.
 *
 * Why: the backend re-signs a fresh URL (with a new ?token=...) on every call.
 * Since the URL is the HTTP cache key, a changing URL forces the browser — and
 * the PDF viewer, which is keyed on fileUrl — to re-download the (immutable) PDF
 * on every open. Reusing the same URL while it is still valid lets the browser
 * cache hit and avoids re-mounting the viewer.
 *
 * The backend signs with expires_in=3600s; we expire our cache 5 min early to
 * avoid handing out a URL that dies mid-view, then transparently re-sign.
 */
const SIGNED_URL_TTL_MS = (3600 - 300) * 1000;
const documentUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Cache of blob object URLs for downloaded PDFs, keyed by documentId.
 *
 * Why: PDFs are immutable, but the viewer re-downloads them on every open
 * because navigating back unmounts the reader and remounts pdf.js, and the
 * signed-URL response is not reliably HTTP-cacheable. We download the bytes
 * once, wrap them in a Blob, and hand the viewer a stable `blob:` URL — served
 * from memory with no further network round-trips.
 *
 * Why a blob URL rather than raw bytes: passing a Uint8Array makes pdf.js
 * transfer (detach) its ArrayBuffer to the worker, after which the viewer's own
 * internal fileUrl comparison crashes on the detached buffer. A URL string
 * sidesteps that entirely. Object URLs live until revoked (on delete) or page
 * reload; this cache is in-memory only.
 */
const documentObjectUrlCache = new Map<string, string>();

export const projectsService = {
	async listProjects(): Promise<Project[]> {
		const response = await get<{ projects: Project[] }>(PROJECTS_BASE);
		return response.projects;
	},

	async createProject(data: { name: string; description?: string }): Promise<string> {
		const response = await post<{ response: string }>(PROJECTS_BASE, data);
		return response.response;
	},

	async deleteProject(projectId: string): Promise<string> {
		const response = await del<{ response: string }>(`${PROJECTS_BASE}/${projectId}`);
		return response.response;
	},

	async listDocuments(projectId: string): Promise<Document[]> {
		const endpoint = apiConfig.endpoints.projects.documents(projectId);
		const response = await get<{ documents: Document[] }>(endpoint);
		return response.documents;
	},

	async uploadDocument(
		projectId: string,
		file: File,
		sourceName?: string,
	): Promise<{ success: boolean; message: string; job_id?: string }> {
		const formData = new FormData();
		formData.append('file', file);
		if (sourceName) {
			formData.append('source_name', sourceName);
		}
		const endpoint = apiConfig.endpoints.projects.documents(projectId);
		return await upload<{ success: boolean; message: string; job_id?: string }>(endpoint, formData);
	},

	async deleteDocument(projectId: string, documentId: string): Promise<string> {
		const endpoint = apiConfig.endpoints.projects.document(projectId, documentId);
		const response = await del<{ response: string }>(endpoint);
		this.releaseDocument(documentId);
		return response.response;
	},

	/**
	 * Free a document's cached blob URL and signed URL. Call when a document is
	 * deleted, or when its tab is evicted from the recent-tabs list, so blob
	 * URLs don't accumulate in memory for the life of the page.
	 */
	releaseDocument(documentId: string): void {
		documentUrlCache.delete(documentId);
		const objectUrl = documentObjectUrlCache.get(documentId);
		if (objectUrl) {
			URL.revokeObjectURL(objectUrl);
			documentObjectUrlCache.delete(documentId);
		}
	},

	async getDocumentUrl(projectId: string, documentId: string): Promise<string> {
		const cached = documentUrlCache.get(documentId);
		if (cached && cached.expiresAt > Date.now()) {
			return cached.url;
		}
		const endpoint = apiConfig.endpoints.projects.documentUrl(projectId, documentId);
		const response = await get<{ url: string }>(endpoint);
		documentUrlCache.set(documentId, {
			url: response.url,
			expiresAt: Date.now() + SIGNED_URL_TTL_MS,
		});
		return response.url;
	},

	/**
	 * Get a blob object URL for a document's PDF, downloading once and serving
	 * the cached URL (from memory) on every subsequent open.
	 */
	async getDocumentObjectUrl(projectId: string, documentId: string): Promise<string> {
		const cached = documentObjectUrlCache.get(documentId);
		if (cached) {
			return cached;
		}
		const url = await this.getDocumentUrl(projectId, documentId);
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`Failed to download document (${res.status})`);
		}
		const blob = await res.blob();
		const objectUrl = URL.createObjectURL(blob);
		documentObjectUrlCache.set(documentId, objectUrl);
		return objectUrl;
	},
};
