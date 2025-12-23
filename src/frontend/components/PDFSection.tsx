import { useRef, useState } from "react";
import { ResizablePanel } from "@@/frontend/components/ui/resizable.tsx";
import { type ImperativePanelHandle } from "react-resizable-panels";
import { ChevronDown } from "lucide-react";
import { PDFReader } from "./PDFReader.tsx";

interface PDFSectionProps {
	defaultSize?: number;
	minSize?: number;
	collapsedSize?: number;
	onScreenshotCapture: (imageDataUrl: string, name: string) => void;
}

const VERTICAL_COLLAPSE_THRESHOLD = 18;

export function PDFSection({
	defaultSize = 50,
	minSize = 15,
	collapsedSize = 3,
	onScreenshotCapture,
}: PDFSectionProps) {
	const pdfPanelRef = useRef<ImperativePanelHandle>(null);
	const [isPDFCollapsed, setIsPDFCollapsed] = useState(false);

	const handlePDFResize = (size: number) => {
		if (size < VERTICAL_COLLAPSE_THRESHOLD && !isPDFCollapsed) {
			pdfPanelRef.current?.collapse();
		}
	};

	return (
		<ResizablePanel
			ref={pdfPanelRef}
			defaultSize={defaultSize}
			minSize={minSize}
			collapsible
			collapsedSize={collapsedSize}
			onCollapse={() => setIsPDFCollapsed(true)}
			onExpand={() => setIsPDFCollapsed(false)}
			onResize={handlePDFResize}
		>
			<div className="h-full w-full relative">
				{isPDFCollapsed && (
					<div
						className="absolute inset-0 z-10 group border-b bg-background hover:bg-accent/50 cursor-pointer flex items-center justify-center transition-colors duration-200"
						onClick={() => pdfPanelRef.current?.resize(defaultSize)}
					>
						<div className="opacity-40 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5">
							<ChevronDown className="w-4 h-4 text-muted-foreground" />
							<span className="text-xs text-muted-foreground">PDF</span>
						</div>
					</div>
				)}
				<div className={isPDFCollapsed ? "hidden" : "h-full"}>
					<PDFReader onScreenshotCapture={onScreenshotCapture} />
				</div>
			</div>
		</ResizablePanel>
	);
}
