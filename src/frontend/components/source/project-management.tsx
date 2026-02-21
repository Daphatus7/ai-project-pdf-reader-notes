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
	onSourceSelectionChange?: (selectedIds: string[]) => void;
}

export function ManagementPanel({
	onScreenshotCapture,
	onSaveToNote,
	onDownload,
	onSourceSelectionChange,
}: ManagementPanelProps) {
	const project = useProject();
	const quota = useQuota();

	// Navigation state — owned exclusively by ManagementPanel
	const [activeView, setActiveView] = useState<ActiveView>('projects');
	const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
	const [currentProjectName, setCurrentProjectName] = useState('');
	const [currentDocumentUrl, setCurrentDocumentUrl] = useState<string | null>(null);
	const [isLoadingDocument, setIsLoadingDocument] = useState(false);

	const handleOpenProject = useCallback((projectId: string) => {
		const found = project.projects.find((p) => p.id === projectId);
		setCurrentProjectId(projectId);
		setCurrentProjectName(found?.name ?? '');
		setActiveView('sources');
	}, [project.projects]);

	const handleBackToProjects = useCallback(() => {
		setCurrentProjectId(null);
		setCurrentProjectName('');
		setActiveView('projects');
	}, []);

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
			const url = await projectsService.getDocumentUrl(currentProjectId, documentId);
			setCurrentDocumentUrl(url);
			setActiveView('reader');
		} catch {
			toast.error('Failed to open document');
		} finally {
			setIsLoadingDocument(false);
		}
	}, [currentProjectId]);

	const handleBackToSources = useCallback(() => {
		setCurrentDocumentUrl(null);
		setActiveView('sources');
	}, []);

	// Build usage label
	const projectUsage = quota.getUsage('projects');
	const projectUsageLabel = projectUsage && projectUsage.limit !== -1
		? `${projectUsage.current}/${projectUsage.limit}`
		: undefined;

	const docUsage = quota.getUsage('documents');
	const docUsageLabel = docUsage && docUsage.limit !== -1
		? `${docUsage.current}/${docUsage.limit}`
		: undefined;

	// Route to the active panel
	if (activeView === 'reader' && currentDocumentUrl) {
		return (
			<ReaderPanel
				documentUrl={currentDocumentUrl}
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
				documentUsageLabel={docUsageLabel}
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
			projectUsageLabel={projectUsageLabel}
			onOpenProject={handleOpenProject}
			onCreateProject={handleCreateProject}
			onDeleteProject={handleDeleteProject}
		/>
	);
}
