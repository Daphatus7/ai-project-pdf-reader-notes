import {RotateDirection, Viewer, Worker} from '@react-pdf-viewer/core';
import { toolbarPlugin, type ToolbarSlot } from '@react-pdf-viewer/toolbar';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';

interface PDFReaderProps {
	onScreenshotCapture?: (imageDataUrl: string, name: string) => void;
}

export function PdfReader({ onScreenshotCapture }: PDFReaderProps) {
	const workerUrl = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

	// Toolbar plugin
	const toolbarPluginInstance = toolbarPlugin();
	const { Toolbar } = toolbarPluginInstance;

	return (
		<div className="flex flex-col h-full">
			{/* Custom Toolbar */}
			<Toolbar>
				{(props: ToolbarSlot) => {
					const {
						CurrentPageInput,
						GoToNextPage,
						GoToPreviousPage,
						NumberOfPages,
						ZoomIn,
						ZoomOut,
						Zoom,
						EnterFullScreen,
						Rotate,
					} = props;

					return (
						<div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
							{/* Navigation */}
							<div className="flex items-center gap-1">
								<GoToPreviousPage />
								<CurrentPageInput />
								<span className="text-sm text-gray-500">/ <NumberOfPages /></span>
								<GoToNextPage />
							</div>

							<div className="w-px h-6 bg-gray-300 mx-2" />

							{/* Zoom */}
							<div className="flex items-center gap-1">
								<ZoomOut />
								<Zoom />
								<ZoomIn />
							</div>

							<div className="w-px h-6 bg-gray-300 mx-2" />

							{/* Actions */}
							<div className="flex items-center gap-1">
								<Rotate direction={RotateDirection.Backward} />
								<EnterFullScreen />
							</div>

							<div className="w-px h-6 bg-gray-300 mx-2" />

							{/* Custom Screenshot Button */}
							<button
								className="px-3 py-1 text-sm bg-blue-500 rounded hover:bg-blue-600 transition-colors"
								onClick={() => {
									// TODO: Implement screenshot functionality
									console.log('Screenshot clicked');
								}}
							>
								Screenshot
							</button>
						</div>
					);
				}}
			</Toolbar>

			{/* PDF Viewer */}
			<div className="flex-1 overflow-hidden">
				<Worker workerUrl={workerUrl}>
					<Viewer
						plugins={[toolbarPluginInstance]}
						fileUrl="src/frontend/components/reader/Artificial Intelligence - A Modern Approach (3rd Edition).pdf"
					/>
				</Worker>
			</div>
		</div>
	);
}
