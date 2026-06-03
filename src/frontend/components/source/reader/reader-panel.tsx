import { PdfReader } from './pdf-reader';
import { TabStrip } from './tab-strip';
import type { DocTab } from '../project-management';

interface ReaderPanelProps {
	documentUrl: string;
	/** Currently visible tab; also used as the viewer's stable React key. */
	activeTabId: string;
	/** Recently opened documents, rendered as tabs. */
	tabs: DocTab[];
	onSelectTab: (documentId: string, opts?: { promote?: boolean }) => void;
	onCloseTab: (documentId: string) => void;
	onBack: () => void;
	onScreenshotCapture: (imageDataUrl: string, name: string, prompt?: string) => void;
	onSaveToNote?: (imageDataUrl: string, name: string) => void;
	onDownload?: (imageDataUrl: string, name: string) => void;
}

export function ReaderPanel({
	documentUrl,
	activeTabId,
	tabs,
	onSelectTab,
	onCloseTab,
	onBack,
	onScreenshotCapture,
	onSaveToNote,
	onDownload,
}: ReaderPanelProps) {
	return (
		<div className="h-full flex flex-col">
			<TabStrip
				tabs={tabs}
				activeTabId={activeTabId}
				onSelectTab={onSelectTab}
				onCloseTab={onCloseTab}
				onBack={onBack}
			/>

			<div className="flex-1 overflow-hidden">
				<PdfReader
					fileUrl={documentUrl}
					fileKey={activeTabId}
					onScreenshotCapture={onScreenshotCapture}
					onSaveToNote={onSaveToNote}
					onDownload={onDownload}
				/>
			</div>
		</div>
	);
}
