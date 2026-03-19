/**
 * @file        chat-bubble.tsx
 * @description User message bubble component with multimodal content support
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */
import type {ChatBubbleProps} from "@/frontend/api/types/llm.ts";
import type {ChatContent} from "@/frontend/api";
import { useLanguage } from "@/frontend/i18n/language-context";
import type { Translations } from "@/frontend/i18n/locales/en";

/**
 * Render a single content item (text or image); t is passed in from the parent component
 */
function renderContentItem(item: ChatContent, index: number, t: Translations) {
	if (item.type === 'text') {
		return (
			<p key={index} className="text-sm whitespace-pre-wrap">
				{item.text}
			</p>
		);
	}
	if (item.type === 'image') {
		const src = `data:${item.mime_type};base64,${item.data}`;
		return (
			<img
				key={index}
				src={src}
				alt={item.name || t.chat.userUploadedImage}
				className="max-w-full rounded mt-2"
			/>
		);
	}
	return null;
}

export function ChatBubble({ message }: ChatBubbleProps) {
	const { t } = useLanguage();
	const rawContents = message.content;
	const contents: ChatContent[] = Array.isArray(rawContents) ? rawContents : [];

	return (
		<div className="flex justify-end">
			<div className="max-w-[80%] bg-chat-bubble px-4 py-2 rounded-lg">
				{contents.map((item, index) => renderContentItem(item, index, t))}
			</div>
		</div>
	);
}
