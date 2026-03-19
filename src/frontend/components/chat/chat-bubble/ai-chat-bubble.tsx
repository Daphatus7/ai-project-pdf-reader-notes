/**
 * @file        ai-chat-bubble.tsx
 * @description AI message bubble component with multimodal content support
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */
import type {AIChatBubbleProps} from "@/frontend/api/types/llm.ts";
import type {ChatContent} from "@/frontend/api";
import {MarkdownRenderer} from "@/frontend/components/renderer/markdown-renderer.tsx";
import {Button} from "@/frontend/components/ui/button.tsx";
import {LucideArrowRight} from "lucide-react";
import { useLanguage } from "@/frontend/i18n/language-context";
import type { Translations } from "@/frontend/i18n/locales/en";

/**
 * Render a single content item (text or image); t is passed in from the parent component
 */
function renderContentItem(
	item: ChatContent,
	index: number,
	t: Translations,
	onSelectContent?: (content: string) => void
) {
	if (item.type === 'text') {
		return (
			<MarkdownRenderer
				key={index}
				content={item.text}
				onSectionClick={onSelectContent ? (_type, content) => onSelectContent(content) : undefined}
			/>
		);
	}
	if (item.type === 'image') {
		const src = `data:${item.mime_type};base64,${item.data}`;
		return (
			<img
				key={index}
				src={src}
				alt={t.chat.aiGeneratedImage}
				className="max-w-full rounded mt-2"
			/>
		);
	}
	return null;
}

/**
 * Extract text content for selection callback
 */
function extractTextContent(contents: ChatContent[]): string {
	return contents
		.filter((item): item is ChatContent & { type: 'text' } => item.type === 'text')
		.map(item => item.text)
		.join('\n');
}

export function AIChatBubble({ message, onSelectContent }: AIChatBubbleProps) {
	const { t } = useLanguage();
	const rawContents = message.content;
	const contents: ChatContent[] = Array.isArray(rawContents) ? rawContents : [];

	const handleClick = (e: React.MouseEvent) => {
		if (onSelectContent) {
			const textContent = extractTextContent(contents);
			onSelectContent(textContent);
		}
	};

	return (
		<div className="flex justify-start">
			<div
				className="px-4 py-2 w-full"
			>
				{contents.map((item, index) => renderContentItem(item, index, t, onSelectContent))}
				{onSelectContent && (
					<div className='flex justify-end'>
						<Button variant='secondary' className='bg-panel border rounded-2xl' size='sm' onClick={handleClick}>
							{t.chat.insertToNote}
							<LucideArrowRight className="size-4" />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
