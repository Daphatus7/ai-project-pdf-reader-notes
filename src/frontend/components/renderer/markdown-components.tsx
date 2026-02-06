/**
 * @file        markdown-components.tsx
 * @description Custom React components for markdown rendering
 */
import type { Components } from 'react-markdown';
import type { ReactNode } from 'react';
import { SelectableWrapper } from './selectable-wrapper';
import { cn } from '../ui/utils';

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
			<SelectableWrapper
				sectionType="heading-1"
				rawMarkdown={sliceSource(source, node as AstNode)}
				onSelect={onSelect}
				as="h1"
				className="text-2xl font-bold mt-6 mb-4 border-b pb-2"
			>
				{children}
			</SelectableWrapper>
		),
		h2: ({ children, node }) => (
			<SelectableWrapper
				sectionType="heading-2"
				rawMarkdown={sliceSource(source, node as AstNode)}
				onSelect={onSelect}
				as="h2"
				className="text-xl font-bold mt-5 mb-3 border-b pb-1"
			>
				{children}
			</SelectableWrapper>
		),
		h3: ({ children, node }) => (
			<SelectableWrapper
				sectionType="heading-3"
				rawMarkdown={sliceSource(source, node as AstNode)}
				onSelect={onSelect}
				as="h3"
				className="text-lg font-semibold mt-4 mb-2"
			>
				{children}
			</SelectableWrapper>
		),
		h4: ({ children, node }) => (
			<SelectableWrapper
				sectionType="heading-4"
				rawMarkdown={sliceSource(source, node as AstNode)}
				onSelect={onSelect}
				as="h4"
				className="text-base font-semibold mt-3 mb-2"
			>
				{children}
			</SelectableWrapper>
		),

		// Paragraphs
		p: ({ children, node }) => (
			<SelectableWrapper
				sectionType="paragraph"
				rawMarkdown={sliceSource(source, node as AstNode)}
				onSelect={onSelect}
				as="p"
				className="my-2 leading-relaxed"
			>
				{children}
			</SelectableWrapper>
		),

		// Code
		code: ({ inline, className, children, node, ...props }: CodeProps) => {
			const match = /language-(\w+)/.exec(className || '');
			const language = match?.[1] ?? '';

			if (inline) {
				return (
					<SelectableWrapper
						sectionType="inline-code"
						rawMarkdown={sliceSource(source, node)}
						onSelect={onSelect}
						as="code"
						className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono"
					>
						{children}
					</SelectableWrapper>
				);
			}

			return (
				<SelectableWrapper
					sectionType="code-block"
					rawMarkdown={sliceSource(source, node)}
					onSelect={onSelect}
					className="relative my-4"
				>
					{language && (
						<div className="absolute top-0 right-0 px-2 py-1 text-xs text-muted-foreground bg-muted/50 rounded-bl rounded-tr">
							{language}
						</div>
					)}
					<pre className="p-4 rounded-lg bg-muted/50 border">
						<code className={cn('text-sm font-mono', className)} {...props}>
							{children}
						</code>
					</pre>
				</SelectableWrapper>
			);
		},

		// Tables
		table: ({ children, node }) => (
			<SelectableWrapper
				sectionType="table"
				rawMarkdown={sliceSource(source, node as AstNode)}
				onSelect={onSelect}
				className="my-4"
			>
				<table className="min-w-full border-collapse border border-border">
					{children}
				</table>
			</SelectableWrapper>
		),
		thead: ({ children }) => (
			<thead className="bg-muted/50">{children}</thead>
		),
		th: ({ children }) => (
			<th className="border border-border px-4 py-2 text-left font-semibold">
				{children}
			</th>
		),
		td: ({ children }) => (
			<td className="border border-border px-4 py-2">
				{children}
			</td>
		),

		// Lists
		ul: ({ children }) => (
			<ul
				className="my-2 ml-6 space-y-1"
				style={{ listStyleType: 'disc', listStylePosition: 'outside' }}
			>
				{children}
			</ul>
		),
		ol: ({ children }) => (
			<ol
				className="my-2 ml-6 space-y-1"
				style={{ listStyleType: 'decimal', listStylePosition: 'outside' }}
			>
				{children}
			</ol>
		),
		li: ({ children, node }) => (
			<SelectableWrapper
				sectionType="list-item"
				rawMarkdown={sliceSource(source, node as AstNode)}
				onSelect={onSelect}
				as="li"
				className="leading-relaxed"
			>
				{children}
			</SelectableWrapper>
		),

		// Blockquotes
		blockquote: ({ children, node }) => (
			<SelectableWrapper
				sectionType="blockquote"
				rawMarkdown={sliceSource(source, node as AstNode)}
				onSelect={onSelect}
				as="blockquote"
				className="my-4 pl-4 border-l-4 border-primary/50 italic text-muted-foreground"
			>
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
					className="text-primary underline underline-offset-2 hover:text-primary/80"
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

		// Other elements
		hr: () => <hr className="my-6 border-t border-border" />,
		strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
		em: ({ children }) => <em className="italic">{children}</em>,
		del: ({ children }) => (
			<del className="line-through text-muted-foreground">{children}</del>
		),
		img: ({ src, alt, node }) => (
			<SelectableWrapper
				sectionType="image"
				rawMarkdown={sliceSource(source, node as AstNode)}
				onSelect={onSelect}
				className="my-4"
			>
				<img
					src={src}
					alt={alt || ''}
					className="max-w-full h-auto rounded-lg"
				/>
			</SelectableWrapper>
		),
	};
}
