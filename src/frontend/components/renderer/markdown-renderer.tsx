/**
 * @file        markdown-renderer.tsx
 * @description Markdown renderer with GFM, math support, and click-to-select
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useMemo } from 'react';
import { createMarkdownComponents, type SectionClickHandler } from './markdown-components';
import './markdown-typography.scss';

interface MarkdownRendererProps {
	content: string;
	onSectionClick?: SectionClickHandler;
}

export function MarkdownRenderer({ content, onSectionClick }: MarkdownRendererProps) {
	const components = useMemo(
		() => createMarkdownComponents(onSectionClick, content),
		[onSectionClick, content]
	);

	return (
		<div className="chat-typography">
			<ReactMarkdown
				remarkPlugins={[remarkGfm, remarkMath]}
				rehypePlugins={[rehypeKatex]}
				components={components}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
