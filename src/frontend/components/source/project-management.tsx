import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { useProject } from './useProject';
import { useSource } from './useSource';
import { ProjectPanel } from './project-panel.tsx';
import { SourceList } from './source-list';
import { PdfReader } from './reader/pdf-reader';

interface SourcePanelProps {
	onScreenshotCapture: (imageDataUrl: string, name: string) => void;
	onSaveToNote?: (imageDataUrl: string, name: string) => void;
	onDownload?: (imageDataUrl: string, name: string) => void;
	onSourceSelectionChange?: (selectedIds: string[]) => void;
}

export function ManagementPanel({
	onScreenshotCapture,
	onSaveToNote,
	onDownload,
	onSourceSelectionChange,
}: SourcePanelProps) {
	const project = useProject();
	const source = useSource(project.currentProject?.id ?? null);

	useEffect(() => {
		onSourceSelectionChange?.(source.selectedDocumentIds);
	}, [source.selectedDocumentIds, onSourceSelectionChange]);

	// PDF Reader view
	if (source.view.type === 'reader' && source.currentDocumentUrl) {
		return (
			<div className="h-full flex flex-col">
				{/* PDF Reader Header */}
				<div className="flex border-b p-2 justify-end h-13">
					<Button
						variant="ghost"
						size="sm"
						onClick={source.closeDocumentReader}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</div>
				<div className="flex-1 overflow-hidden">
					<PdfReader
						fileUrl={source.currentDocumentUrl}
						onScreenshotCapture={onScreenshotCapture}
						onSaveToNote={onSaveToNote}
						onDownload={onDownload}
					/>
				</div>
			</div>
		);
	}

	// Source control panel (inside a project)
	if (project.currentProject) {
		return (
			<SourceList
				currentProject={project.currentProject}
				documents={source.documents}
				selectedDocumentIds={source.selectedDocumentIds}
				isLoadingDocuments={source.isLoadingDocuments}
				isUploading={source.isUploading}
				error={source.error}
				onGoBack={project.closeProject}
				onUploadDocument={source.uploadDocument}
				onDeleteDocument={source.deleteDocument}
				onToggleSelection={source.toggleDocumentSelection}
				onOpenDocument={source.openDocumentReader}
			/>
		);
	}

	// Project management panel (top-level)
	return (
		<ProjectPanel
			projects={project.projects}
			isLoading={project.isLoadingProjects}
			error={project.error}
			onOpenProject={project.openProject}
			onCreateProject={project.createProject}
			onDeleteProject={project.deleteProject}
		/>
	);
}
