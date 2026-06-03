import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { projectsService } from '@/frontend/api/services/projects.service';
import { useProject } from './useProject';
import { useQuota } from '@/frontend/features/quota/use-quota';
import { ProjectPanel } from './project-panel';
import { SourcePanel } from './source-panel';
import { ReaderPanel } from './reader/reader-panel';

type ActiveView = 'projects' | 'sources' | 'reader';

/** An opened document shown as a tab in the reader. */
export interface DocTab {
	id: string;
	name: string;
	projectId: string;
}

/** Max number of recent tabs kept open; opening more evicts the oldest. */
const MAX_TABS = 8;

interface ManagementPanelProps {
	onScreenshotCapture: (imageDataUrl: string, name: string, prompt?: string) => void;
	onSaveToNote?: (imageDataUrl: string, name: string) => void;
	onDownload?: (imageDataUrl: string, name: string) => void;
	onSourceSelectionChange?: (selected: {id: string, document_name: string}[]) => void;
	onProjectSelectionChange?: (projectId: string | null) => void;
}

export function ManagementPanel({
	onScreenshotCapture,
	onSaveToNote,
	onDownload,
	onSourceSelectionChange,
	onProjectSelectionChange,
}: ManagementPanelProps) {
	const project = useProject();
	const quota = useQuota();

	// Navigation state — owned exclusively by ManagementPanel
	const [activeView, setActiveView] = useState<ActiveView>('projects');
	const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
	const [currentProjectName, setCurrentProjectName] = useState('');
	const [currentDocumentUrl, setCurrentDocumentUrl] = useState<string | null>(null);
	const [openTabs, setOpenTabs] = useState<DocTab[]>([]);
	const [activeTabId, setActiveTabId] = useState<string | null>(null);
	const [isLoadingDocument, setIsLoadingDocument] = useState(false);

	const handleOpenProject = useCallback((projectId: string) => {
		const found = project.projects.find((p) => p.id === projectId);
		setCurrentProjectId(projectId);
		setCurrentProjectName(found?.name ?? '');
		setActiveView('sources');
		onProjectSelectionChange?.(projectId);
	}, [project.projects, onProjectSelectionChange]);

	const handleBackToProjects = useCallback(() => {
		setCurrentProjectId(null);
		setCurrentProjectName('');
		setActiveView('projects');
		onProjectSelectionChange?.(null);
	}, [onProjectSelectionChange]);

	const handleDeleteProject = useCallback(async (projectId: string) => {
		await project.deleteProject(projectId);
		quota.refresh();
		if (projectId === currentProjectId) {
			handleBackToProjects();
		}
	}, [project, quota, currentProjectId, handleBackToProjects]);

	const handleCreateProject = useCallback(async (name: string, description?: string) => {
		await project.createProject(name, description);
		quota.refresh();
	}, [project, quota]);

	// Load a document's bytes (served from cache after the first download) and
	// make it the active tab. Shared by opening, switching, and closing tabs.
	const activateDocument = useCallback(async (projectId: string, documentId: string) => {
		setIsLoadingDocument(true);
		try {
			const objectUrl = await projectsService.getDocumentObjectUrl(projectId, documentId);
			setCurrentDocumentUrl(objectUrl);
			setActiveTabId(documentId);
		} catch {
			toast.error('Failed to open document');
		} finally {
			setIsLoadingDocument(false);
		}
	}, []);

	const handleOpenDocument = useCallback(async (documentId: string, documentName: string) => {
		if (!currentProjectId) return;
		const projectId = currentProjectId;
		// Add (or move) to the front of the recent-tabs list, capped at MAX_TABS.
		setOpenTabs((prev) => {
			const without = prev.filter((t) => t.id !== documentId);
			const next = [{ id: documentId, name: documentName, projectId }, ...without];
			// Free blobs for any tabs pushed past the cap so they don't leak.
			next.slice(MAX_TABS).forEach((t) => projectsService.releaseDocument(t.id));
			return next.slice(0, MAX_TABS);
		});
		setActiveView('reader');
		await activateDocument(projectId, documentId);
	}, [currentProjectId, activateDocument]);

	// Select an already-open tab. `promote` moves it to the front of the MRU
	// list (used when picking from the overflow menu, so it becomes visible).
	const handleSelectTab = useCallback((documentId: string, opts?: { promote?: boolean }) => {
		const tab = openTabs.find((t) => t.id === documentId);
		if (!tab) return;
		if (opts?.promote) {
			setOpenTabs((prev) => {
				const without = prev.filter((t) => t.id !== documentId);
				return [tab, ...without];
			});
		}
		if (documentId === activeTabId) return;
		void activateDocument(tab.projectId, tab.id);
	}, [activeTabId, openTabs, activateDocument]);

	const handleCloseTab = useCallback((documentId: string) => {
		setOpenTabs((prev) => {
			const idx = prev.findIndex((t) => t.id === documentId);
			const next = prev.filter((t) => t.id !== documentId);
			// Closing the active tab: fall back to a neighbour, or leave the reader.
			if (documentId === activeTabId) {
				if (next.length === 0) {
					setActiveView('sources');
					setActiveTabId(null);
					setCurrentDocumentUrl(null);
				} else {
					const fallback = next[Math.min(idx, next.length - 1)];
					void activateDocument(fallback.projectId, fallback.id);
				}
			}
			return next;
		});
	}, [activeTabId, activateDocument]);

	// Back arrow returns to the source list but keeps tabs, so reopening resumes.
	const handleBackToSources = useCallback(() => {
		setActiveView('sources');
	}, []);

	// Route to the active panel
	if (activeView === 'reader' && currentDocumentUrl && activeTabId) {
		return (
			<ReaderPanel
				documentUrl={currentDocumentUrl}
				activeTabId={activeTabId}
				tabs={openTabs}
				onSelectTab={handleSelectTab}
				onCloseTab={handleCloseTab}
				onBack={handleBackToSources}
				onScreenshotCapture={onScreenshotCapture}
				onSaveToNote={onSaveToNote}
				onDownload={onDownload}
			/>
		);
	}

	if (activeView === 'sources' && currentProjectId) {
		return (
			<SourcePanel
				projectId={currentProjectId}
				projectName={currentProjectName}
				onBack={handleBackToProjects}
				onOpenDocument={handleOpenDocument}
				isLoadingDocument={isLoadingDocument}
				canUploadDocument={quota.canCreate('documents')}
				onDocumentChange={quota.refresh}
				onSourceSelectionChange={onSourceSelectionChange}
			/>
		);
	}

	return (
		<ProjectPanel
			projects={project.projects}
			isLoading={project.isLoadingProjects}
			error={project.error}
			canCreateProject={quota.canCreate('projects')}
			plan={quota.quota?.plan}
			onOpenProject={handleOpenProject}
			onCreateProject={handleCreateProject}
			onDeleteProject={handleDeleteProject}
		/>
	);
}
