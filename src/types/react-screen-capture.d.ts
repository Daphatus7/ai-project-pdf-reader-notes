declare module 'react-screen-capture' {
	import React from 'react';

	interface ScreenCaptureProps {
		onEndCapture: (url: string) => void;
		children: (props: { onStartCapture: () => void }) => React.ReactNode;
	}

	export const ScreenCapture: React.FC<ScreenCaptureProps>;
}

