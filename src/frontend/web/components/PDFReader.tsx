import React, {useState, useRef, useEffect, useMemo} from "react";
import { Button } from "./ui/button.tsx";
import {
	Upload,
	ZoomIn,
	ZoomOut,
	ChevronLeft,
	ChevronRight,
	Scissors,
	MessageSquare,
	X
} from "lucide-react";
import { cn } from "./ui/utils.ts";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip.tsx";
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

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


export function PDFReader({  }: PDFReaderProps) {
	const [openPDFs, setOpenPDFs] = useState<PDFDocument[]>([]);
	const [activePDF, setActivePDF] = useState<string>('');
	const [currentPage, setCurrentPage] = useState(1);
	const [zoom, setZoom] = useState(100);
	const [screenshotMode, setScreenshotMode] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	
	// Reader setup
	const workerUrl = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
	const layoutRef = useRef(returnDefaultLayout());
	function returnDefaultLayout() {
		return defaultLayoutPlugin();
	}
	const plugins = useMemo(() => [layoutRef.current], []);

	const activePDFDoc = openPDFs.find(pdf => pdf.pdfUrl === activePDF);
	
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
										onClick={(e) => {
											e.stopPropagation();
											handleClosePDF(pdf.pdfUrl);
										}}
									>
										<X className="w-3 h-3" />
									</Button>
								</div>
							))}
							<Button variant="ghost" size="sm" className="ml-2 shrink-0">
								<Upload className="w-4 h-4 mr-2" />
								Open PDF
							</Button>
						</div>
					</div>

					{/* PDF Controls */}
					<div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20">
						<div className="flex items-center gap-2">
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant={screenshotMode ? "default" : "outline"}
											size="sm"
											onClick={() => setScreenshotMode(!screenshotMode)}
										>
											<Scissors className="w-4 h-4 mr-2" />
											Screenshot
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										<p>Take a screenshot and ask AI</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>

							<Button variant="outline" size="sm">
								<MessageSquare className="w-4 h-4 mr-2" />
								Ask AI
							</Button>
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="icon"
								className="h-8 w-8"
								onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
								disabled={currentPage === 1}
							>
								<ChevronLeft className="w-4 h-4" />
							</Button>

							<span className="text-sm px-2 min-w-[80px] text-center">
                {currentPage} / {activePDFDoc?.pages}
              </span>

							<Button
								variant="outline"
								size="icon"
								className="h-8 w-8"
								onClick={() => setCurrentPage(Math.min(activePDFDoc?.pages || 1, currentPage + 1))}
								disabled={currentPage === activePDFDoc?.pages}
							>
								<ChevronRight className="w-4 h-4" />
							</Button>

							<div className="w-px h-6 bg-border mx-2" />

							<Button
								variant="outline"
								size="icon"
								className="h-8 w-8"
								onClick={() => setZoom(Math.max(50, zoom - 10))}
							>
								<ZoomOut className="w-4 h-4" />
							</Button>

							<span className="text-sm px-2 min-w-[60px] text-center">
								{zoom}%
							</span>

							<Button
								variant="outline"
								size="icon"
								className="h-8 w-8"
								onClick={() => setZoom(Math.min(200, zoom + 10))}
							>
								<ZoomIn className="w-4 h-4" />
							</Button>
						</div>
					</div>

					{/* PDF Viewer */}
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
											setCurrentPage(1);
										}}
									/>
								) : (
									<div style={{ padding: 16, color: '#666' }}>Choose a PDF to view</div>
								)}
							</Worker>
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
