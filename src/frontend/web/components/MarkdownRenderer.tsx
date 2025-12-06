import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { useEffect, useRef } from 'react';
import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/dist/katex.min.css';
import { cn } from './ui/utils.ts';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

/**
 * MarkdownRenderer component that renders Markdown content with support for:
 * - Standard Markdown syntax
 * - GitHub Flavored Markdown (GFM) - tables, strikethrough, task lists, autolinks
 * - LaTeX math expressions (inline with $...$ or \\(...\\), block with $$...$$ or \\[...\\])
 *
 * Usage examples:
 * - Inline math: $E = mc^2$ or \\(E = mc^2\\)
 * - Block math: $$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$
 * - GFM table: | Header | Header |
 * - Task list: - [x] Completed task
 */


export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
	const ref = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!ref.current) return;
		renderMathInElement(ref.current, {
			delimiters: [
				{ left: '$$', right: '$$', display: true },
				{ left: '\\[', right: '\\]', display: true },
				{ left: '$', right: '$', display: false },
				{ left: '\\(', right: '\\)', display: false },
			],
			throwOnError: false,
		});
	}, [content]);

	return (
		<div ref={ref} className={cn('markdown-renderer', className)}>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>
				{content}
			</ReactMarkdown>
		</div>
	);
}

