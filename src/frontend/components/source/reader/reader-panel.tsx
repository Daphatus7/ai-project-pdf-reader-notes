import { ArrowLeft } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { PdfReader } from './pdf-reader';

interface ReaderPanelProps {
	documentData: Uint8Array;
	documentId: string;
	onBack: () => void;
	onScreenshotCapture: (imageDataUrl: string, name: string, prompt?: string) => void;
	onSaveToNote?: (imageDataUrl: string, name: string) => void;
	onDownload?: (imageDataUrl: string, name: string) => void;
}

export function ReaderPanel({
	documentData,
	documentId,
	onBack,
	onScreenshotCapture,
	onSaveToNote,
	onDownload,
}: ReaderPanelProps) {
	return (
		<div className="h-full flex flex-col">
			{/* Reader Header */}
			<div className="flex border-b p-2 justify-end h-13">
				<Button
					variant="ghost"
					size="sm"
					onClick={onBack}
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
			</div>
			<div className="flex-1 overflow-hidden">
				<PdfReader
					fileData={documentData}
					fileKey={documentId}
					onScreenshotCapture={onScreenshotCapture}
					onSaveToNote={onSaveToNote}
					onDownload={onDownload}
				/>
			</div>
		</div>
	);
}
