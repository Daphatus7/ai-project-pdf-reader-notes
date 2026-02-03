/**
 * @file        ai-chat-bubble.tsx
 * @description AI message bubble component with multimodal content support
 * @author      [Peiyu Wang]
 * @license     © 2026. All rights reserved.
 */
import type {AIChatBubbleProps} from "@/frontend/api/types/llm.ts";
import type {ChatContent} from "@/frontend/api";

/**
 * Render a single content item (text or image)
 */
function renderContentItem(item: ChatContent, index: number) {
	console.log(item)
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
				alt="AI generated image"
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
	const rawContents = message.content;
	const contents: ChatContent[] = Array.isArray(rawContents) ? rawContents : [];

	const handleClick = () => {
		if (onSelectContent) {
			const textContent = extractTextContent(contents);
			onSelectContent(textContent);
		}
	};

	return (
		<div className="flex justify-start">
			<div
				className={`max-w-[80%] bg-gray-100 text-gray-800 px-4 py-2 rounded-lg ${
					onSelectContent ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''
				}`}
				onClick={handleClick}
			>
				{contents.map((item, index) => renderContentItem(item, index))}
			</div>
		</div>
	);
}
