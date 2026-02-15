/**
 * Projects & Documents API service
 */

import type { Project, Document } from '@/frontend/components/source/type';
import { get, post, del, upload } from '../core/client';
import { apiConfig } from '../core/config';

const PROJECTS_BASE = apiConfig.endpoints.projects.base;

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
	): Promise<{ success: boolean; message: string }> {
		const formData = new FormData();
		formData.append('file', file);
		if (sourceName) {
			formData.append('source_name', sourceName);
		}
		const endpoint = apiConfig.endpoints.projects.documents(projectId);
		return await upload<{ success: boolean; message: string }>(endpoint, formData);
	},

	async deleteDocument(projectId: string, documentId: string): Promise<string> {
		const endpoint = apiConfig.endpoints.projects.document(projectId, documentId);
		const response = await del<{ response: string }>(endpoint);
		return response.response;
	},

	async getDocumentUrl(projectId: string, documentId: string): Promise<string> {
		const endpoint = apiConfig.endpoints.projects.documentUrl(projectId, documentId);
		const response = await get<{ url: string }>(endpoint);
		return response.url;
	},
};
