import { useState, useRef, useEffect, useMemo, type MouseEvent as ReactMouseEvent } from 'react';
import { Button } from './ui/button.tsx';
import {
  Upload,
  Scissors,
  X
} from 'lucide-react';
import { cn } from './ui/utils.ts';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { ScreenshotCapture } from './ScreenshotCapture.tsx';
import { downloadDataUrlAsFile, sanitizeFilename } from '../utils/download.ts';
import { createPdfScreenshotCapture } from '../services/pdf-screenshot-capture.tsx';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface PDFDocument {
	pdfUrl: string;
	name: string;
	pages: number;
}

interface PDFReaderProps {
	onScreenshotCapture?: (imageDataUrl: string, name: string) => void;
}


export function PDFReader({ onScreenshotCapture }: PDFReaderProps) {
	const [openPDFs, setOpenPDFs] = useState<PDFDocument[]>([]);
	const [activePDF, setActivePDF] = useState<string>('');
	const [screenshotMode, setScreenshotMode] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const viewerRef = useRef<HTMLElement | null>(null);
	
	// Reader setup
	const workerUrl = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
	const layoutRef = useRef(returnDefaultLayout());
	function returnDefaultLayout() {
		return defaultLayoutPlugin();
	}
	const pdfScreenshot = useMemo(() => createPdfScreenshotCapture(), []);
	const plugins = useMemo(() => [layoutRef.current, pdfScreenshot.plugin], [pdfScreenshot]);

	const handleUploadPdf = () => fileInputRef.current?.click();
	useEffect(() => {
		return () => {
			if (activePDF?.startsWith('blob:')) URL.revokeObjectURL(activePDF);
		};
	}, [activePDF]);

	const onPick = (f?: File) => {
		if (!f) return;
		const url = URL.createObjectURL(f);
		setOpenPDFs(prev => [...prev, { pdfUrl: url, name: f.name, pages: 0 }]);
		setActivePDF(url);
	};

	const handleClosePDF = (pdfId: string) => {
		setOpenPDFs(prev => {
			const closing = prev.find(p => p.pdfUrl === pdfId);
			if (closing?.pdfUrl.startsWith('blob:')) URL.revokeObjectURL(closing.pdfUrl);

			const next = prev.filter(p => p.pdfUrl !== pdfId);
			if (activePDF === pdfId) {
				setActivePDF(next.length ? next[Math.max(0, prev.findIndex(p=>p.pdfUrl===pdfId)-1)]?.pdfUrl ?? '' : '');
			}
			return next;
		});
	};

	return (
		<div className="h-full flex flex-col bg-background">
			{/* PDF Tabs */}
			{openPDFs.length > 0 ? (
				<>
					<div className="border-b bg-muted/30">
						<div className="flex items-center px-2 py-1 overflow-x-auto">
							{openPDFs.map((pdf) => (
								<div
									key={pdf.pdfUrl}
									className={cn(
										"flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-b-2 cursor-pointer transition-colors whitespace-nowrap",
										activePDF === pdf.pdfUrl
											? "bg-background border-primary"
											: "border-transparent hover:bg-muted"
									)}
									onClick={() => setActivePDF(pdf.pdfUrl)}
								>
									<span className="text-sm">{pdf.name}</span>
									<Button
										variant="ghost"
										size="icon"
										className="h-4 w-4 p-0 hover:bg-muted-foreground/20"
										onClick={(e: ReactMouseEvent) => {
											e.stopPropagation();
											handleClosePDF(pdf.pdfUrl);
										}}
									>
										<X className="w-3 h-3" />
									</Button>
								</div>
							))}
							<Button variant="ghost" size="sm" className="ml-2 shrink-0" onClick={handleUploadPdf}>
								<Upload className="w-4 h-4 mr-2" />
								Open PDF
							</Button>
						</div>
					</div>
					{/* PDF Controls */}
					<div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20"></div>
					{/* PDF Viewer */}
					<div
						className='relative h-full'
						ref={(el) => {
							viewerRef.current = el;
						}}
					>
						<div className='absolute top-2 right-2 z-20 flex gap-2'>
							<Button
								size='sm'
								variant={screenshotMode ? 'secondary' : 'default'}
								disabled={!activePDF}
								onClick={() => setScreenshotMode(prev => !prev)}
							>
								<Scissors className='w-4 h-4 mr-2' />
								{screenshotMode ? 'Cancel shot' : 'Screenshot'}
							</Button>
						</div>

						<Worker workerUrl={workerUrl}>
							{activePDF ? (
								<Viewer
									key={activePDF}
									fileUrl={activePDF}
									plugins={plugins}
									onDocumentLoad={(e) => {
										setOpenPDFs(prev =>
											prev.map(p =>
												p.pdfUrl === activePDF ? { ...p, pages: e.doc.numPages } : p
											)
										);
									}}
								/>
							) : (
								<div style={{ padding: 16, color: '#666' }}>Choose a PDF to view</div>
							)}
						</Worker>

						<ScreenshotCapture
							targetRef={viewerRef}
							pdfScreenshotCapture={pdfScreenshot.controller}
							isActive={screenshotMode}
							onCapture={(imageDataUrl, name) => {
								setScreenshotMode(false);
								const safeBaseName = sanitizeFilename(name) || 'screenshot';
								const fileName = `${safeBaseName}.png`;
								downloadDataUrlAsFile(imageDataUrl, fileName);
								onScreenshotCapture?.(imageDataUrl, name);
							}}
							onCancel={() => setScreenshotMode(false)}
						/>
					</div>
				</>
			) : (
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center space-y-4">
						<Upload className="w-16 h-16 mx-auto text-muted-foreground" />
						<input
							ref={fileInputRef}
							type="file"
							accept="application/pdf"
							style={{ display: 'none' }}
							onChange={(e) => onPick(e.target.files?.[0] ?? undefined)}
						/>
						<div>
							<h3 className="mb-2">No PDF Open</h3>
							<p className="text-sm text-muted-foreground mb-4">
								Upload a PDF file to get started
							</p>
							<Button variant="ghost" size="sm" className="ml-2 shrink-0" onClick={handleUploadPdf}>
								<Upload className="w-4 h-4 mr-2" />
								Open PDF
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
