/**
 * @file        chat-bar.tsx
 * @description Chat input bar with Cursor-style source context chips and image attachments
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */

import { useRef, useState } from 'react';
import { FileText, X, Send, Plus, ImageIcon, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import type {ChatBarProps} from "@/frontend/api/types/llm.ts";
import type {ChatContent, ImageContent} from "@/frontend/api";
import { useLanguage } from "@/frontend/i18n/language-context";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/frontend/components/ui/dropdown-menu.tsx";

/* mime types accepted by the backend ImageContent schema */
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
type AcceptedMime = typeof ACCEPTED_IMAGE_TYPES[number];

function isAcceptedMime(type: string): type is AcceptedMime {
	return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
}

/**
 * Read a File into an ImageContent (base64 without the `data:...;base64,` prefix,
 * matching the backend `data` field). Returns null for unsupported types.
 */
function fileToImageContent(file: File): Promise<ImageContent | null> {
	return new Promise((resolve) => {
		const mime = file.type;
		if (!isAcceptedMime(mime)) {
			resolve(null);
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result !== 'string') { resolve(null); return; }
			/* strip the "data:<mime>;base64," prefix — backend wants raw base64 */
			const base64 = result.split(',')[1] ?? '';
			resolve({ type: 'image', data: base64, mime_type: mime, name: file.name || undefined });
		};
		reader.onerror = () => resolve(null);
		reader.readAsDataURL(file);
	});
}

export function ChatBar({ onSend, isLoading, placeholder, selectedSources, onDeselectSource }: ChatBarProps) {
	const [input, setInput] = useState('');
	/* Images attached via paste or file picker, queued until the next send */
	const [pendingImages, setPendingImages] = useState<ImageContent[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { t } = useLanguage();
	/* Fall back to translated default when caller omits the placeholder prop */
	const effectivePlaceholder = placeholder ?? t.chat.placeholder;

	const canSend = (input.trim().length > 0 || pendingImages.length > 0) && !isLoading;

	const addFiles = async (files: File[]) => {
		const results = await Promise.all(files.map(fileToImageContent));
		const images = results.filter((img): img is ImageContent => img !== null);
		if (images.length > 0) setPendingImages(prev => [...prev, ...images]);
	};

	const handleSend = () => {
		if (!canSend) return;

		// pack to chat content format: text first, then any attached images
		const content: ChatContent[] = [];
		if (input.trim()) content.push({ type: 'text', text: input.trim() });
		content.push(...pendingImages);

		onSend(content);
		setInput('');
		setPendingImages([]);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	/* Grab images straight off the clipboard (Cmd/Ctrl+V) */
	const handlePaste = (e: React.ClipboardEvent) => {
		const files = Array.from(e.clipboardData.items)
			.filter(item => item.kind === 'file' && item.type.startsWith('image/'))
			.map(item => item.getAsFile())
			.filter((f): f is File => f !== null);
		if (files.length > 0) {
			e.preventDefault(); // stop the text input from also pasting a filename
			void addFiles(files);
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) void addFiles(Array.from(e.target.files));
		e.target.value = ''; // allow re-selecting the same file
	};

	const removeImage = (index: number) => {
		setPendingImages(prev => prev.filter((_, i) => i !== index));
	};

	/* Placeholder: the create-project + upload-source flow is not wired up yet */
	const handleUploadDocument = () => {
		toast.info(t.chat.createProjectToUpload);
	};

	return (
		/* Container: uses CSS variables to follow light/dark mode */
		<div>
			{/* Cursor-style context chips: shows selected sources above input */}
			{selectedSources && selectedSources.length > 0 && (
				<div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1">
					{selectedSources.map(source => (
						<span
							key={source.id}
							className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-md border border-border max-w-[200px]"
						>
							<FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
							<span className="truncate">@{source.name}</span>
							<button
								onClick={() => onDeselectSource?.(source.id)}
								className="shrink-0 ml-0.5 hover:text-destructive transition-colors"
								aria-label={t.chat.removeSource.replace('{name}', source.name)}
							>
								<X className="h-3 w-3" />
							</button>
						</span>
					))}
				</div>
			)}

			{/* Pending image attachments: thumbnail previews above the input */}
			{pendingImages.length > 0 && (
				<div className="flex flex-wrap gap-2 px-3 pt-2 pb-1">
					{pendingImages.map((img, index) => (
						<div key={index} className="relative group">
							<img
								src={`data:${img.mime_type};base64,${img.data}`}
								alt={img.name || t.chat.userUploadedImage}
								className="h-14 w-14 object-cover rounded-md border border-border"
							/>
							<button
								onClick={() => removeImage(index)}
								className="absolute -top-1.5 -right-1.5 bg-panel border border-border rounded-full p-0.5 text-muted-foreground hover:text-destructive transition-colors shadow-sm"
								aria-label={t.chat.removeImage}
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					))}
				</div>
			)}

			{/* Hidden file input driven by the "Add images" menu item */}
			<input
				ref={fileInputRef}
				type="file"
				accept={ACCEPTED_IMAGE_TYPES.join(',')}
				multiple
				onChange={handleFileSelect}
				className="hidden"
			/>
			{/* Input row: single Gemini-style pill holding +, text, and send */}
			<div className="p-3">
				<div className="flex items-center gap-1 rounded-full border border-border bg-panel px-2 py-1 focus-within:ring-2 focus-within:ring-ring">
					{/* Gemini-style "+" menu: opens upward with attachment actions */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								disabled={isLoading}
								className="flex items-center justify-center shrink-0 p-1.5 text-muted-foreground hover:text-foreground focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								aria-label={t.chat.addAttachment}
							>
								<Plus className="h-5 w-5" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent side="top" align="start" sideOffset={8}>
							<DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
								<ImageIcon className="h-4 w-4" />
								{t.chat.addImage}
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={handleUploadDocument}>
								<Paperclip className="h-4 w-4" />
								{t.chat.uploadDocument}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyPress={handleKeyPress}
						onPaste={handlePaste}
						placeholder={effectivePlaceholder}
						disabled={isLoading}
						/* Borderless transparent field — the pill provides the frame */
						className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none disabled:text-muted-foreground"
					/>
					<button
						onClick={handleSend}
						disabled={!canSend}
						/* Borderless icon button: blue when active, muted when disabled */
						className="flex items-center justify-center shrink-0 p-1.5 text-blue-500 hover:text-blue-600 focus:outline-none disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
						aria-label={t.chat.send}
					>
						<Send className="h-5 w-5" />
					</button>
				</div>
			</div>
		</div>
	);
}
