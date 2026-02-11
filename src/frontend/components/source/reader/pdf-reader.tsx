import { useRef } from 'react';
import { RotateDirection, Viewer, Worker } from '@react-pdf-viewer/core';
import { toolbarPlugin, type ToolbarSlot } from '@react-pdf-viewer/toolbar';
import { Sparkles } from 'lucide-react';
import { useScreenshot } from './useScreenshot.tsx';
import { ScreenshotOverlay } from '../../screenshot/ScreenshotOverlay.tsx';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';
import '@/frontend/styles/pdf-reader.scss';
import {Button} from "@/frontend/components/ui/button.tsx";

interface PdfReaderProps {
  fileUrl: string;
  onScreenshotCapture: (imageDataUrl: string, name: string) => void;
  onSaveToNote?: (imageDataUrl: string, name: string) => void;
  onDownload?: (imageDataUrl: string, name: string) => void;
}

export function PdfReader({ fileUrl, onScreenshotCapture, onSaveToNote, onDownload }: PdfReaderProps) {
  const workerUrl = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const containerRef = useRef<HTMLDivElement>(null);

  const toolbarPluginInstance = toolbarPlugin();
  const { Toolbar } = toolbarPluginInstance;

  const screenshot = useScreenshot();

  const captureAndCall = async (callback: (dataUrl: string, name: string) => void) => {
    if (!containerRef.current) return;
    const dataUrl = await screenshot.capture(containerRef.current);
    callback(dataUrl, `screenshot-${Date.now()}.png`);
    screenshot.deactivate();
  };

  const handleAskAI = () => captureAndCall(onScreenshotCapture);
  const handleSaveToNote = onSaveToNote ? () => captureAndCall(onSaveToNote) : undefined;
  const handleDownload = onDownload ? () => captureAndCall(onDownload) : undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <Toolbar>
        {(props: ToolbarSlot) => (
          <div className="pdf-toolbar">
            {/* Navigation */}
            <div className="pdf-toolbar-group">
              <props.GoToPreviousPage />
              <props.CurrentPageInput />
              <span className="text-sm" style={{ color: 'var(--control-text)' }}>/ <props.NumberOfPages /></span>
              <props.GoToNextPage />
            </div>

            <div className="pdf-toolbar-separator" />

            {/* Zoom */}
            <div className="pdf-toolbar-group">
              <props.ZoomOut />
              <props.Zoom />
              <props.ZoomIn />
            </div>

            <div className="pdf-toolbar-separator" />

            {/* Actions */}
            <div className="pdf-toolbar-group">
              <props.Rotate direction={RotateDirection.Backward} />
              <props.EnterFullScreen />
            </div>

            <div className="pdf-toolbar-separator" />

            {/* Screenshot */}
            <Button
              className={`pdf-toolbar-btn ${
                screenshot.isActive ? 'pdf-toolbar-btn--danger' : 'pdf-toolbar-btn--ai'
              }`}
              onClick={() => (screenshot.isActive ? screenshot.deactivate() : screenshot.activate())}
            >
              {screenshot.isActive ? (
                'Cancel'
              ) : (
                <>
                  <Sparkles size={14} />
                  Ask AI
                </>
              )}
            </Button>
          </div>
        )}
      </Toolbar>

      {/* PDF Viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        onMouseDown={(e) => screenshot.handleMouseDown(e, containerRef.current!)}
        onMouseMove={(e) => screenshot.handleMouseMove(e, containerRef.current!)}
        onMouseUp={screenshot.handleMouseUp}
      >
        <Worker workerUrl={workerUrl}>
          <Viewer
            key={fileUrl}
            plugins={[toolbarPluginInstance, screenshot.plugin]}
            fileUrl={fileUrl}
          />
        </Worker>

        {/* Screenshot Overlay */}
        {screenshot.isActive && (
          <ScreenshotOverlay
            selectionRect={screenshot.selectionRect}
            isSelecting={screenshot.isSelecting}
            isCapturing={screenshot.isCapturing}
            onAskAI={handleAskAI}
            onSaveToNote={handleSaveToNote}
            onDownload={handleDownload}
            onCancel={screenshot.deactivate}
          />
        )}
      </div>
    </div>
  );
}
