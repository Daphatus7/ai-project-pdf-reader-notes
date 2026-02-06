/**
 * @file        markdown-components.tsx
 * @description Custom React components for markdown rendering.
 *              Typography is handled by markdown-typography.scss —
 *              components here only provide SelectableWrapper (click-to-select)
 *              and minimal structural classes.
 */
import type { Components } from 'react-markdown';
import type { ReactNode } from 'react';
import { SelectableWrapper } from './selectable-wrapper';

export type SectionClickHandler = (sectionType: string, content: string, html: string) => void;

interface CodeProps {
	inline?: boolean;
	className?: string;
	children?: ReactNode;
	node?: AstNode;
}

/** Minimal position info from the hast/unist AST node */
type AstNode = { position?: { start: { offset?: number }; end: { offset?: number } } };

/** Slice the original markdown source using the AST node's position offsets */
function sliceSource(source: string | undefined, node?: AstNode): string {
	const start = node?.position?.start?.offset;
	const end = node?.position?.end?.offset;
	if (!source || start == null || end == null) return '';
	return source.slice(start, end);
}

/**
 * Create custom markdown components with optional click-to-select functionality.
 *
 * @param onSelect - Callback when a section is clicked
 * @param source   - The original markdown source string; used to slice raw markdown per section
 */
export function createMarkdownComponents(onSelect?: SectionClickHandler, source?: string): Components {
	return {
		// Headings
		h1: ({ children, node }) => (
			<SelectableWrapper sectionType="heading-1" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="h1">
				{children}
			</SelectableWrapper>
		),
		h2: ({ children, node }) => (
			<SelectableWrapper sectionType="heading-2" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="h2">
				{children}
			</SelectableWrapper>
		),
		h3: ({ children, node }) => (
			<SelectableWrapper sectionType="heading-3" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="h3">
				{children}
			</SelectableWrapper>
		),
		h4: ({ children, node }) => (
			<SelectableWrapper sectionType="heading-4" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="h4">
				{children}
			</SelectableWrapper>
		),

		// Paragraphs
		p: ({ children, node }) => (
			<SelectableWrapper sectionType="paragraph" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="p">
				{children}
			</SelectableWrapper>
		),

		// Code
		code: ({ inline, className, children, node, ...props }: CodeProps) => {
			const match = /language-(\w+)/.exec(className || '');
			const language = match?.[1] ?? '';

			if (inline) {
				return (
					<SelectableWrapper sectionType="inline-code" rawMarkdown={sliceSource(source, node)} onSelect={onSelect} as="code">
						{children}
					</SelectableWrapper>
				);
			}

			return (
				<SelectableWrapper sectionType="code-block" rawMarkdown={sliceSource(source, node)} onSelect={onSelect} className="relative">
					{language && (
						<div className="absolute top-0 right-0 px-2 py-1 text-xs text-muted-foreground bg-muted/50 rounded-bl rounded-tr z-10">
							{language}
						</div>
					)}
					<pre>
						<code className={className} {...props}>
							{children}
						</code>
					</pre>
				</SelectableWrapper>
			);
		},

		// Tables — only table wrapper needs SelectableWrapper
		table: ({ children, node }) => (
			<SelectableWrapper sectionType="table" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect}>
				<table>{children}</table>
			</SelectableWrapper>
		),

		// Lists — li needs SelectableWrapper for click-to-select
		li: ({ children, node }) => (
			<SelectableWrapper sectionType="list-item" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="li">
				{children}
			</SelectableWrapper>
		),

		// Blockquotes
		blockquote: ({ children, node }) => (
			<SelectableWrapper sectionType="blockquote" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="blockquote">
				{children}
			</SelectableWrapper>
		),

		// Links
		a: ({ href, children, node }) => {
			const raw = sliceSource(source, node as AstNode);
			return (
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(e) => {
						if (!onSelect) return;
						e.stopPropagation();
						const fallback = `[${typeof children === 'string' ? children : ''}](${href})`;
						const html = (e.currentTarget as HTMLElement).outerHTML;
						onSelect('link', raw || fallback, html);
					}}
				>
					{children}
				</a>
			);
		},

		// Images
		img: ({ src, alt, node }) => (
			<SelectableWrapper sectionType="image" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect}>
				<img src={src} alt={alt || ''} />
			</SelectableWrapper>
		),
	};
}
