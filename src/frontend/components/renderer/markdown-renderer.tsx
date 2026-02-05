/**
 * @file        markdown-renderer.tsx
 * @description Markdown renderer with GFM, math support, and click-to-select
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';
import { cn } from '../ui/utils';
import { createMarkdownComponents, type SectionClickHandler } from './markdown-components';
import { preprocessMathPipes } from './preprocess';

interface MarkdownRendererProps {
	content: string;
	className?: string;
	/**
	 * Callback when a section is clicked.
	 * Used for click-to-insert functionality.
	 */
	onSectionClick?: SectionClickHandler;
}

/**
 * Markdown Renderer component with click-to-insert functionality.
 *
 * Features:
 * - GitHub Flavored Markdown (tables, task lists, strikethrough)
 * - Math expressions with KaTeX rendering
 * - Clickable sections for content insertion
 */
export function MarkdownRenderer({ content, onSectionClick }: MarkdownRendererProps) {
	const processedContent = useMemo(
		() => preprocessMathPipes(content),
		[content]
	);

	const components = useMemo(
		() => createMarkdownComponents(onSectionClick),
		[onSectionClick]
	);

	return (
		<div>
			<ReactMarkdown
				remarkPlugins={[remarkGfm, remarkMath]}
				rehypePlugins={[rehypeKatex]}
				components={components}
			>
				{processedContent}
			</ReactMarkdown>
		</div>
	);
}
