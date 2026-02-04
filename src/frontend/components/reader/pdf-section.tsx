import { PdfReader } from "./pdf-reader.tsx";

interface PDFSectionProps {
	defaultSize?: number;
	minSize?: number;
	collapsedSize?: number;
	onScreenshotCapture: (imageDataUrl: string, name: string) => void;
	onSaveToNote?: (imageDataUrl: string, name: string) => void;
	onDownload?: (imageDataUrl: string, name: string) => void;
}

export function PdfSection({
	onScreenshotCapture,
	onSaveToNote,
	onDownload,
}: PDFSectionProps) {
	return (
		<div className="h-full w-full relative">
			<PdfReader
				onScreenshotCapture={onScreenshotCapture}
				onSaveToNote={onSaveToNote}
				onDownload={onDownload}
			/>
		</div>
	);
}
