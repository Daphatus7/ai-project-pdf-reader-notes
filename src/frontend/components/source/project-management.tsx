import { useState, useCallback } from 'react';
import { projectsService } from '@/frontend/api/services/projects.service';
import { useProject } from './useProject';
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

	// Navigation state — owned exclusively by ManagementPanel
	const [activeView, setActiveView] = useState<ActiveView>('projects');
	const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
	const [currentProjectName, setCurrentProjectName] = useState('');
	const [currentDocumentUrl, setCurrentDocumentUrl] = useState<string | null>(null);

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
		// If deleting the currently open project, go back to project list
		if (projectId === currentProjectId) {
			handleBackToProjects();
		}
	}, [project, currentProjectId, handleBackToProjects]);

	const handleOpenDocument = useCallback(async (documentId: string) => {
		if (!currentProjectId) return;
		try {
			const url = await projectsService.getDocumentUrl(currentProjectId, documentId);
			setCurrentDocumentUrl(url);
			setActiveView('reader');
		} catch {
			// Error is handled silently; SourcePanel can show its own errors
		}
	}, [currentProjectId]);

	const handleBackToSources = useCallback(() => {
		setCurrentDocumentUrl(null);
		setActiveView('sources');
	}, []);

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
				onSourceSelectionChange={onSourceSelectionChange}
			/>
		);
	}

	return (
		<ProjectPanel
			projects={project.projects}
			isLoading={project.isLoadingProjects}
			error={project.error}
			onOpenProject={handleOpenProject}
			onCreateProject={project.createProject}
			onDeleteProject={handleDeleteProject}
		/>
	);
}
