import { useRef, useLayoutEffect, useState } from 'react';
import { Sparkles, StickyNote, Download, X } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { Separator } from '@/frontend/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/frontend/components/ui/tooltip';
import { usePromptHistory } from './usePromptHistory';

interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface ScreenshotOverlayProps {
	selectionRect: Rect | null;
	isSelecting: boolean;
	isCapturing: boolean;
	onAskAI: (prompt?: string) => void;
	onSaveToNote?: () => void;
	onDownload?: () => void;
	onCancel: () => void;
}

const PANEL_GAP = 8;

// Fallback quick-actions shown when the user has no prompt history yet
const DEFAULT_QUICK_ACTIONS = [
	{ label: 'Extract', prompt: 'Extract exact content from the image only, no filler' },
	{ label: 'Summarise', prompt: 'Summarise the key points from this image concisely.' },
] as const;

export function ScreenshotOverlay({
	selectionRect,
	isSelecting,
	isCapturing,
	onAskAI,
	onSaveToNote,
	onDownload,
	onCancel,
}: ScreenshotOverlayProps) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [prompt, setPrompt] = useState('');
	const { history, push } = usePromptHistory();

	// History first (newest at index 0), then defaults — skip history items that duplicate a default
	const defaultPrompts = new Set(DEFAULT_QUICK_ACTIONS.map((a) => a.prompt));
	const quickActions = [
		...history.filter((item) => !defaultPrompts.has(item.prompt)),
		...DEFAULT_QUICK_ACTIONS,
	];

	// Position panel: bottom-center of selection, flip to top if overflows
	useLayoutEffect(() => {
		const panel = panelRef.current;
		const overlay = overlayRef.current;
		if (!panel || !overlay || !selectionRect || isSelecting) return;

		const cW = overlay.clientWidth;
		const cH = overlay.clientHeight;
		const pW = panel.offsetWidth;
		const pH = panel.offsetHeight;

		let left = selectionRect.x + selectionRect.width / 2 - pW / 2;
		left = Math.max(PANEL_GAP, Math.min(left, cW - pW - PANEL_GAP));

		let top = selectionRect.y + selectionRect.height + PANEL_GAP;
		if (top + pH > cH - PANEL_GAP) {
			top = selectionRect.y - pH - PANEL_GAP;
		}
		top = Math.max(PANEL_GAP, Math.min(top, cH - pH - PANEL_GAP));

		panel.style.left = `${left}px`;
		panel.style.top = `${top}px`;
	});

	const handleSubmit = () => {
		const trimmed = prompt.trim();
		// Record non-empty custom prompts into history before firing
		if (trimmed) push(trimmed);
		onAskAI(trimmed || undefined);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<div ref={overlayRef} className="absolute inset-0 z-50 cursor-crosshair">
			{/* Dark overlay */}
			<div className="absolute inset-0 bg-black/20 pointer-events-none" />

			{/* Selection rectangle */}
			{selectionRect && (
				<div
					className="absolute border-2 pointer-events-none"
					style={{
						left: selectionRect.x,
						top: selectionRect.y,
						width: selectionRect.width,
						height: selectionRect.height,
						borderColor: 'var(--tt-brand-color-400)',
						backgroundColor: 'color-mix(in srgb, var(--tt-brand-color-400) 10%, transparent)',
					}}
				/>
			)}

			{/* Action panel — anchored bottom-center of selection */}
			{selectionRect && !isSelecting && (
				<div
					ref={panelRef}
					className="screenshot-action-panel absolute rounded-lg border bg-popover shadow-lg"
					style={{
						left: selectionRect.x + selectionRect.width / 2,
						top: selectionRect.y + selectionRect.height + PANEL_GAP,
					}}
					data-screenshot-ignore
				>
					{/* Input row: custom prompt + submit */}
					<div className="screenshot-action-panel__input-row">
						<input
							className="screenshot-action-panel__input"
							type="text"
							placeholder="Ask anything..."
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							onKeyDown={handleKeyDown}
							autoFocus
						/>
						<Button
							size="icon"
							className="screenshot-action-panel__ai-btn shrink-0"
							onClick={handleSubmit}
							disabled={isCapturing}
						>
							<Sparkles />
						</Button>
					</div>

					{/* Quick-action row: history-driven shortcuts, falls back to defaults */}
					<div className="flex gap-1 px-1.5 pb-1.5">
						{quickActions.map(({ label, prompt: presetPrompt }) => (
							<Tooltip key={presetPrompt}>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="h-6 max-w-[7rem] truncate text-xs text-muted-foreground justify-start"
										onClick={() => {
											push(presetPrompt);
											onAskAI(presetPrompt);
										}}
										disabled={isCapturing}
									>
										{label}
									</Button>
								</TooltipTrigger>
								<TooltipContent side="bottom" sideOffset={4}>{presetPrompt}</TooltipContent>
							</Tooltip>
						))}
					</div>

					<Separator />

					{/* Toolbar row: secondary actions */}
					<div className="screenshot-action-panel__toolbar">
						{onSaveToNote && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="screenshot-action-panel__icon-btn"
										onClick={onSaveToNote}
										disabled={isCapturing}
									>
										<StickyNote />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="bottom" sideOffset={4}>Save to Note</TooltipContent>
							</Tooltip>
						)}

						{onDownload && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="screenshot-action-panel__icon-btn"
										onClick={onDownload}
										disabled={isCapturing}
									>
										<Download />
									</Button>
								</TooltipTrigger>
								<TooltipContent side="bottom" sideOffset={4}>Download</TooltipContent>
							</Tooltip>
						)}

						<Separator orientation="vertical" className="h-4" />

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="screenshot-action-panel__icon-btn"
									onClick={onCancel}
								>
									<X />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom" sideOffset={4}>Cancel</TooltipContent>
						</Tooltip>
					</div>
				</div>
			)}
		</div>
	);
}
