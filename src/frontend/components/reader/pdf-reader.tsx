import { Viewer, Worker } from '@react-pdf-viewer/core';
import { ScreenshotCapture } from '../screenshot/screenshot-capture.tsx';
import { ScrollMode } from '@react-pdf-viewer/core';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface PDFReaderProps {
	onScreenshotCapture?: (imageDataUrl: string, name: string) => void;
}

export function PdfReader({ onScreenshotCapture }: PDFReaderProps) {

	// Reader setup
	const workerUrl = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
	const scrollModePluginInstance = ScrollMode();

	return (
		<div>
			<Worker workerUrl={workerUrl}>
				<Viewer
					plugins={[scrollModePluginInstance]}
					fileUrl="src/frontend/components/reader/Artificial Intelligence - A Modern Approach (3rd Edition).pdf" />
			</Worker>
	
			{/*<ScreenshotCapture*/}
			{/*	targetRef={viewerRef}*/}
			{/*	pdfScreenshotCapture={pdfScreenshot.controller}*/}
			{/*	isActive={screenshotMode}*/}
			{/*	onCapture={(imageDataUrl, name) => {*/}
			{/*		setScreenshotMode(false);*/}
			{/*		onScreenshotCapture?.(imageDataUrl, name);*/}
			{/*	}}*/}
			{/*	onCancel={() => setScreenshotMode(false)}*/}
			{/*/>*/}
		</div>
	);
}
