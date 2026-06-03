import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { projectsService } from '@/frontend/api/services/projects.service';
import { useProject } from './useProject';
import { useQuota } from '@/frontend/features/quota/use-quota';
import { ProjectPanel } from './project-panel';
import { SourcePanel } from './source-panel';
import { ReaderPanel } from './reader/reader-panel';

type ActiveView = 'projects' | 'sources' | 'reader';

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
	const [currentDocumentData, setCurrentDocumentData] = useState<Uint8Array | null>(null);
	const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
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

	const handleOpenDocument = useCallback(async (documentId: string) => {
		if (!currentProjectId) return;
		setIsLoadingDocument(true);
		try {
			const bytes = await projectsService.getDocumentBytes(currentProjectId, documentId);
			setCurrentDocumentData(bytes);
			setCurrentDocumentId(documentId);
			setActiveView('reader');
		} catch {
			toast.error('Failed to open document');
		} finally {
			setIsLoadingDocument(false);
		}
	}, [currentProjectId]);

	const handleBackToSources = useCallback(() => {
		setCurrentDocumentData(null);
		setCurrentDocumentId(null);
		setActiveView('sources');
	}, []);

	// Route to the active panel
	if (activeView === 'reader' && currentDocumentData && currentDocumentId) {
		return (
			<ReaderPanel
				documentData={currentDocumentData}
				documentId={currentDocumentId}
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
