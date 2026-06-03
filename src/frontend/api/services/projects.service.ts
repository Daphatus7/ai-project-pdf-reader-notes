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
 * Cache of downloaded PDF bytes, keyed by documentId.
 *
 * Why: PDFs are immutable, but the viewer re-downloads them on every open
 * because navigating back unmounts the reader and remounts pdf.js, and the
 * signed-URL response is not reliably HTTP-cacheable. Holding the raw bytes in
 * memory lets us hand them straight to the viewer with no network round-trip
 * after the first load.
 *
 * Note: pdf.js detaches (neutralizes) the ArrayBuffer it is given, so callers
 * must receive a fresh copy each time — see getDocumentBytes returning .slice().
 * This cache is in-memory only and clears on full page reload.
 */
const documentBytesCache = new Map<string, Uint8Array>();

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
		documentUrlCache.delete(documentId);
		documentBytesCache.delete(documentId);
		return response.response;
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
	 * Fetch a document's PDF bytes, downloading once and serving from memory
	 * thereafter. Returns a fresh copy on every call because pdf.js detaches the
	 * buffer it receives, which would otherwise corrupt the cached master.
	 */
	async getDocumentBytes(projectId: string, documentId: string): Promise<Uint8Array> {
		const cached = documentBytesCache.get(documentId);
		if (cached) {
			return cached.slice();
		}
		const url = await this.getDocumentUrl(projectId, documentId);
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`Failed to download document (${res.status})`);
		}
		const bytes = new Uint8Array(await res.arrayBuffer());
		documentBytesCache.set(documentId, bytes);
		return bytes.slice();
	},
};
