import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import PdfSelectionOverlay, { SelectionRect } from './pdf_selection_overlay';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

type ReaderSectionProps = {
	/** Accepts a File, Blob, or URL string */
	file?: File | Blob | string;
	/** Optional callback when user selects a new file */
	onFileChange?: (file: File) => void;
	/** Whether to show the file input button */
	showFileInput?: boolean;
	/** Whether selection mode is active */
	isSelectionMode?: boolean;
	/** Callback when a selection is made on the PDF */
	onSelection?: (selection: SelectionRect) => void;
	/** Callback when selection is cleared */
	onClearSelection?: () => void;
	/** Current selection rectangle */
	currentSelection?: SelectionRect | null;
};


const workerUrl =
	'https://unpkg.com/pdfjs-dist/build/pdf.worker.min.js';

export const ReaderSection: React.FC<ReaderSectionProps> = ({
																file,
																onFileChange,
																showFileInput = true,
																isSelectionMode = false,
																onSelection,
																onClearSelection,
																currentSelection,
															}) => {
	const [fileUrl, setFileUrl] = useState<string>();

	// create plugin ONCE
	const layoutRef = useRef(defaultLayoutPlugin());
	const plugins = useMemo(() => [layoutRef.current], []);

	// reflect incoming prop
	useEffect(() => {
		// cleanup previous blob URL
		setFileUrl((prev) => {
			if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
			return prev;
		});

		if (!file) {
			setFileUrl(undefined);
			return;
		}
		if (typeof file === 'string') {
			setFileUrl(file);
		} else {
			const url = URL.createObjectURL(file);
			setFileUrl(url);
		}
	}, [file]);

	// revoke on unmount
	useEffect(() => {
		return () => {
			if (fileUrl?.startsWith('blob:')) URL.revokeObjectURL(fileUrl);
		};
	}, [fileUrl]);

	const onPick = (f?: File) => {
		if (!f) return;
		// revoke current then set new blob URL
		setFileUrl((prev) => {
			if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
			return URL.createObjectURL(f);
		});
		onFileChange?.(f);
	};

	return (
		<div style={{ 
			height: '100%', 
			display: 'flex', 
			flexDirection: 'column',
			overflow: 'hidden' // Prevent ReaderSection from creating its own scroll
		}}>
			{showFileInput && (
				<div style={{ 
					padding: '8px', 
					borderBottom: '1px solid #e0e0e0',
					flexShrink: 0 // Keep file input fixed
				}}>
					<input
						type="file"
						accept="application/pdf"
						onChange={(e) => onPick(e.target.files?.[0] ?? undefined)}
						style={{
							padding: '6px 12px',
							border: '1px solid #ccc',
							borderRadius: '4px',
							background: '#fff',
							cursor: 'pointer'
						}}
					/>
				</div>
			)}

			<div style={{ 
				flex: 1, 
				minHeight: 0, // Important for flexbox
				position: 'relative',
				overflow: 'hidden' // Let the PDF viewer handle its own scrolling
			}}>
				<Worker workerUrl={workerUrl}>
					{fileUrl ? (
						<>
							<Viewer key={fileUrl} fileUrl={fileUrl} plugins={plugins} />
							<PdfSelectionOverlay
								isSelectionMode={isSelectionMode}
								onSelection={onSelection}
								onClearSelection={onClearSelection}
								currentSelection={currentSelection}
							/>
						</>
					) : (
						<div style={{ 
							padding: 40, 
							color: '#666', 
							textAlign: 'center',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							height: '100%'
						}}>
							<div style={{ fontSize: 18, marginBottom: 8 }}>
								📄 No PDF selected
							</div>
							<div style={{ fontSize: 14 }}>
								Click the "+" button above to add a new PDF file
							</div>
						</div>
					)}
				</Worker>
			</div>
		</div>
	);
};

export default ReaderSection;
