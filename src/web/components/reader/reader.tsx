'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

export const Reader: React.FC = () => {
	const [fileUrl, setFileUrl] = useState<string>();

	// create plugin ONCE
	const layoutRef = useRef(returnDefaultLayout());
	function returnDefaultLayout() {
		return defaultLayoutPlugin();
	}

	// keep plugins array identity stable
	const plugins = useMemo(() => [layoutRef.current], []);

	const workerUrl = 'https://unpkg.com/pdfjs-dist/build/pdf.worker.min.js';

	useEffect(() => {
		return () => {
			if (fileUrl?.startsWith('blob:')) URL.revokeObjectURL(fileUrl);
		};
	}, [fileUrl]);

	const onPick = (f?: File) => {
		if (!f) return;
		const url = URL.createObjectURL(f);
		setFileUrl(prev => {
			if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
			return url;
		});
	};

	return (
		<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<div>
				<input
					type="file"
					accept="application/pdf"
					onChange={(e) => onPick(e.target.files?.[0] ?? undefined)}
				/>
			</div>

			<div style={{ flex: 1, minHeight: 400 }}>
				<Worker workerUrl={workerUrl}>
					{fileUrl ? (
						// force a full remount only when fileUrl changes
						<Viewer key={fileUrl} fileUrl={fileUrl} plugins={plugins} />
					) : (
						<div style={{ padding: 16, color: '#666' }}>Choose a PDF to view</div>
					)}
				</Worker>
			</div>
		</div>
	);
};

export default Reader;
