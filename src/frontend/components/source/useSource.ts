import { useState, useEffect, useCallback } from 'react';
import { projectsService } from '@/frontend/api/services/projects.service';
import type { Project, Document, SourcePanelView } from './type';

export interface UseSourceReturn {
	projects: Project[];
	currentProject: Project | null;
	documents: Document[];
	selectedDocumentIds: string[];

	view: SourcePanelView;
	currentDocumentUrl: string | null;

	isLoadingProjects: boolean;
	isLoadingDocuments: boolean;
	isUploading: boolean;
	error: string | null;

	selectProject: (projectId: string) => void;
	createProject: (name: string, description?: string) => Promise<void>;
	deleteProject: (projectId: string) => Promise<void>;
	uploadDocument: (file: File, sourceName?: string) => Promise<void>;
	deleteDocument: (documentId: string) => Promise<void>;
	toggleDocumentSelection: (documentId: string) => void;
	clearSelection: () => void;
	openDocumentReader: (documentId: string) => Promise<void>;
	closeDocumentReader: () => void;
	refreshDocuments: () => Promise<void>;
}

export function useSource(): UseSourceReturn {
	const [projects, setProjects] = useState<Project[]>([]);
	const [currentProject, setCurrentProject] = useState<Project | null>(null);
	const [documents, setDocuments] = useState<Document[]>([]);
	const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

	const [view, setView] = useState<SourcePanelView>({ type: 'list' });
	const [currentDocumentUrl, setCurrentDocumentUrl] = useState<string | null>(null);

	const [isLoadingProjects, setIsLoadingProjects] = useState(false);
	const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load documents for a given project
	const loadDocuments = useCallback(async (projectId: string) => {
		setIsLoadingDocuments(true);
		setError(null);
		try {
			const docs = await projectsService.listDocuments(projectId);
			setDocuments(docs);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load documents');
		} finally {
			setIsLoadingDocuments(false);
		}
	}, []);

	// Load projects on mount
	useEffect(() => {
		(async () => {
			setIsLoadingProjects(true);
			setError(null);
			try {
				const list = await projectsService.listProjects();
				setProjects(list);
				if (list.length > 0) {
					setCurrentProject(list[0]);
					await loadDocuments(list[0].id);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load projects');
			} finally {
				setIsLoadingProjects(false);
			}
		})();
	}, [loadDocuments]);

	const selectProject = useCallback(
		(projectId: string) => {
			const project = projects.find((p) => p.id === projectId);
			if (!project) return;
			setCurrentProject(project);
			setSelectedDocumentIds([]);
			loadDocuments(projectId);
		},
		[projects, loadDocuments],
	);

	const createProject = useCallback(
		async (name: string, description?: string) => {
			setError(null);
			try {
				await projectsService.createProject({ name, description });
				const list = await projectsService.listProjects();
				setProjects(list);
				if (!currentProject && list.length > 0) {
					setCurrentProject(list[0]);
					await loadDocuments(list[0].id);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to create project');
				throw err;
			}
		},
		[currentProject, loadDocuments],
	);

	const deleteProject = useCallback(
		async (projectId: string) => {
			setError(null);
			try {
				await projectsService.deleteProject(projectId);
				if (currentProject?.id === projectId) {
					setCurrentProject(null);
					setDocuments([]);
				}
				const list = await projectsService.listProjects();
				setProjects(list);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to delete project');
				throw err;
			}
		},
		[currentProject],
	);

	const refreshDocuments = useCallback(async () => {
		if (!currentProject) return;
		await loadDocuments(currentProject.id);
	}, [currentProject, loadDocuments]);

	const uploadDocument = useCallback(
		async (file: File, sourceName?: string) => {
			if (!currentProject) throw new Error('No project selected');
			setIsUploading(true);
			setError(null);
			try {
				await projectsService.uploadDocument(currentProject.id, file, sourceName);
				await refreshDocuments();
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to upload document');
				throw err;
			} finally {
				setIsUploading(false);
			}
		},
		[currentProject, refreshDocuments],
	);

	const deleteDocument = useCallback(
		async (documentId: string) => {
			if (!currentProject) return;
			setError(null);
			try {
				await projectsService.deleteDocument(currentProject.id, documentId);
				setSelectedDocumentIds((prev) => prev.filter((id) => id !== documentId));
				await refreshDocuments();
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to delete document');
				throw err;
			}
		},
		[currentProject, refreshDocuments],
	);

	const toggleDocumentSelection = useCallback((documentId: string) => {
		setSelectedDocumentIds((prev) =>
			prev.includes(documentId) ? prev.filter((id) => id !== documentId) : [...prev, documentId],
		);
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedDocumentIds([]);
	}, []);

	const openDocumentReader = useCallback(
		async (documentId: string) => {
			if (!currentProject) return;
			setError(null);
			try {
				const url = await projectsService.getDocumentUrl(currentProject.id, documentId);
				setCurrentDocumentUrl(url);
				setView({ type: 'reader', documentId });
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to open document');
			}
		},
		[currentProject],
	);

	const closeDocumentReader = useCallback(() => {
		setView({ type: 'list' });
		setCurrentDocumentUrl(null);
	}, []);

	return {
		projects,
		currentProject,
		documents,
		selectedDocumentIds,
		view,
		currentDocumentUrl,
		isLoadingProjects,
		isLoadingDocuments,
		isUploading,
		error,
		selectProject,
		createProject,
		deleteProject,
		uploadDocument,
		deleteDocument,
		toggleDocumentSelection,
		clearSelection,
		openDocumentReader,
		closeDocumentReader,
		refreshDocuments,
	};
}
