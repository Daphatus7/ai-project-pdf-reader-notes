import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { useSource } from './useSource';
import { SourceList } from './source-list';
import { PdfReader } from './reader/pdf-reader';

interface SourcePanelProps {
	onScreenshotCapture: (imageDataUrl: string, name: string) => void;
	onSaveToNote?: (imageDataUrl: string, name: string) => void;
	onDownload?: (imageDataUrl: string, name: string) => void;
	onSourceSelectionChange?: (selectedIds: string[]) => void;
}

export function SourcePanel({
	onScreenshotCapture,
	onSaveToNote,
	onDownload,
	onSourceSelectionChange,
}: SourcePanelProps) {
	const source = useSource();

	useEffect(() => {
		onSourceSelectionChange?.(source.selectedDocumentIds);
	}, [source.selectedDocumentIds, onSourceSelectionChange]);

	if (source.view.type === 'reader' && source.currentDocumentUrl) {
		return (
			<div className="h-full flex flex-col">
				<div className="border-b p-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={source.closeDocumentReader}
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Sources
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

	return (
		<SourceList
			projects={source.projects}
			currentProject={source.currentProject}
			documents={source.documents}
			selectedDocumentIds={source.selectedDocumentIds}
			isLoadingProjects={source.isLoadingProjects}
			isLoadingDocuments={source.isLoadingDocuments}
			isUploading={source.isUploading}
			error={source.error}
			onSelectProject={source.selectProject}
			onCreateProject={source.createProject}
			onDeleteProject={source.deleteProject}
			onUploadDocument={source.uploadDocument}
			onDeleteDocument={source.deleteDocument}
			onToggleSelection={source.toggleDocumentSelection}
			onOpenDocument={source.openDocumentReader}
		/>
	);
}
