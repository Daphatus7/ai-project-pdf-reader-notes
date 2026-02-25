import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { projectsService } from '@/frontend/api/services/projects.service';
import { isQuotaError } from '@/frontend/features/quota/use-quota';
import type { Document } from './type';

export interface UseSourceReturn {
	documents: Document[];
	selectedDocumentIds: string[];

	isLoadingDocuments: boolean;
	isUploading: boolean;
	error: string | null;

	uploadDocument: (file: File, sourceName?: string) => Promise<void>;
	deleteDocument: (documentId: string) => Promise<void>;
	toggleDocumentSelection: (documentId: string) => void;
	clearSelection: () => void;
	refreshDocuments: () => Promise<void>;
}

export function useSource(projectId: string | null): UseSourceReturn {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

	const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadDocuments = useCallback(async (pid: string) => {
		setIsLoadingDocuments(true);
		setError(null);
		try {
			const docs = await projectsService.listDocuments(pid);
			setDocuments(docs);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load documents');
		} finally {
			setIsLoadingDocuments(false);
		}
	}, []);

	// Load documents when projectId changes
	useEffect(() => {
		if (projectId) {
			setSelectedDocumentIds([]);
			loadDocuments(projectId);
		} else {
			setDocuments([]);
			setSelectedDocumentIds([]);
		}
	}, [projectId, loadDocuments]);

	const refreshDocuments = useCallback(async () => {
		if (!projectId) return;
		await loadDocuments(projectId);
	}, [projectId, loadDocuments]);

	const uploadDocument = useCallback(
		async (file: File, sourceName?: string) => {
			if (!projectId) throw new Error('No project selected');
			setIsUploading(true);
			setError(null);
			try {
				await projectsService.uploadDocument(projectId, file, sourceName);
				await refreshDocuments();
				toast.success('Document uploaded');
			} catch (err) {
				if (isQuotaError(err)) {
					toast.error('Document limit reached. Upgrade your plan to upload more.');
				} else {
					const msg = err instanceof Error ? err.message : 'Failed to upload document';
					setError(msg);
					toast.error(msg);
				}
				throw err;
			} finally {
				setIsUploading(false);
			}
		},
		[projectId, refreshDocuments],
	);

	const deleteDocument = useCallback(
		async (documentId: string) => {
			if (!projectId) return;
			setError(null);
			try {
				await projectsService.deleteDocument(projectId, documentId);
				setSelectedDocumentIds((prev) => prev.filter((id) => id !== documentId));
				await refreshDocuments();
				toast.success('Document deleted');
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'Failed to delete document';
				setError(msg);
				toast.error(msg);
				throw err;
			}
		},
		[projectId, refreshDocuments],
	);

	const toggleDocumentSelection = useCallback((documentId: string) => {
		setSelectedDocumentIds((prev) =>
			prev.includes(documentId) ? prev.filter((id) => id !== documentId) : [...prev, documentId],
		);
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedDocumentIds([]);
	}, []);

	return {
		documents,
		selectedDocumentIds,
		isLoadingDocuments,
		isUploading,
		error,
		uploadDocument,
		deleteDocument,
		toggleDocumentSelection,
		clearSelection,
		refreshDocuments,
	};
}
