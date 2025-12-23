import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
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
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "./ui/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { ScreenshotCapture } from "./ScreenshotCapture";
import { toast } from "sonner";

interface PDFDocument {
  id: string;
  name: string;
  pages: number;
}

interface PDFReaderProps {
  onScreenshotCapture?: (imageDataUrl: string, name: string) => void;
}

const mockPDFs: PDFDocument[] = [
  { id: "pdf1", name: "ML Research Paper.pdf", pages: 24 },
  { id: "pdf2", name: "React Documentation.pdf", pages: 156 }
];

export function PDFReader({ onScreenshotCapture }: PDFReaderProps) {
  const [openPDFs, setOpenPDFs] = useState<PDFDocument[]>(mockPDFs);
  const [activePDF, setActivePDF] = useState<string>("pdf1");
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const pdfViewerRef = useRef<HTMLDivElement>(null);

  const activePDFDoc = openPDFs.find(pdf => pdf.id === activePDF);

  const handleClosePDF = (pdfId: string) => {
    setOpenPDFs(openPDFs.filter(pdf => pdf.id !== pdfId));
    if (activePDF === pdfId && openPDFs.length > 1) {
      setActivePDF(openPDFs[0].id === pdfId ? openPDFs[1].id : openPDFs[0].id);
    }
  };

  const handleScreenshotCapture = (imageDataUrl: string, name: string) => {
    setScreenshotMode(false);
    if (onScreenshotCapture) {
      onScreenshotCapture(imageDataUrl, name);
      toast.success("Screenshot captured and added to AI context!");
    }
  };

  const handleCancelScreenshot = () => {
    setScreenshotMode(false);
    toast.info("Screenshot cancelled");
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
                  key={pdf.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-b-2 cursor-pointer transition-colors whitespace-nowrap",
                    activePDF === pdf.id 
                      ? "bg-background border-primary" 
                      : "border-transparent hover:bg-muted"
                  )}
                  onClick={() => setActivePDF(pdf.id)}
                >
                  <span className="text-sm">{pdf.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClosePDF(pdf.id);
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
          <ScrollArea className="flex-1">
            <div className="p-8 flex justify-center relative" ref={pdfViewerRef}>
              <div 
                className={cn(
                  "bg-white shadow-lg rounded-lg overflow-hidden border-2 transition-all",
                  screenshotMode && "border-primary border-dashed"
                )}
                style={{ 
                  width: `${(210 * zoom) / 100}mm`,
                  minHeight: `${(297 * zoom) / 100}mm`
                }}
              >
                {/* PDF Page Placeholder */}
                <div className="p-8 space-y-4">
                  <div className="h-6 bg-gray-300 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                  
                  <div className="pt-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-4/5" />
                  </div>

                  <div className="pt-4">
                    <div className="h-32 bg-gray-100 rounded border-2 border-gray-300 flex items-center justify-center text-gray-400">
                      [Chart/Figure Placeholder]
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              </div>
              
              {/* Screenshot Overlay */}
              <ScreenshotCapture
                targetRef={pdfViewerRef}
                isActive={screenshotMode}
                onCapture={handleScreenshotCapture}
                onCancel={handleCancelScreenshot}
              />
            </div>
          </ScrollArea>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Upload className="w-16 h-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="mb-2">No PDF Open</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a PDF file to get started
              </p>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
