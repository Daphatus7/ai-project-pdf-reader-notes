/**
 * @file        markdown-components.tsx
 * @description Custom React components for markdown rendering.
 *              Typography is handled by markdown-typography.scss —
 *              components here only provide SelectableWrapper (click-to-select)
 *              and minimal structural classes.
 */
import type { Components } from 'react-markdown';
import type { ReactNode, JSX } from 'react';
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

/** Factory for heading components — eliminates h1/h2/h3/h4 duplication */
function heading(
	tag: keyof JSX.IntrinsicElements,
	sectionType: string,
	onSelect?: SectionClickHandler,
	source?: string,
) {
	return ({ children, node }: { children?: ReactNode; node?: AstNode }) => (
		<SelectableWrapper sectionType={sectionType} rawMarkdown={sliceSource(source, node)} onSelect={onSelect} as={tag}>
			{children}
		</SelectableWrapper>
	);
}

/**
 * Create custom markdown components with optional click-to-select functionality.
 *
 * @param onSelect - Callback when a section is clicked
 * @param source   - The original markdown source string; used to slice raw markdown per section
 */
export function createMarkdownComponents(onSelect?: SectionClickHandler, source?: string): Components {
	return {
		h1: heading('h1', 'heading-1', onSelect, source),
		h2: heading('h2', 'heading-2', onSelect, source),
		h3: heading('h3', 'heading-3', onSelect, source),
		h4: heading('h4', 'heading-4', onSelect, source),

		p: ({ children, node }) => (
			<SelectableWrapper sectionType="paragraph" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="p">
				{children}
			</SelectableWrapper>
		),

		code: ({ inline, className, children, node, ...props }: CodeProps) => {
			const language = /language-(\w+)/.exec(className || '')?.[1] ?? '';

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
						<code className={className} {...props}>{children}</code>
					</pre>
				</SelectableWrapper>
			);
		},

		table: ({ children, node }) => (
			<SelectableWrapper sectionType="table" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect}>
				<table>{children}</table>
			</SelectableWrapper>
		),

		li: ({ children, node }) => (
			<SelectableWrapper sectionType="list-item" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="li">
				{children}
			</SelectableWrapper>
		),

		blockquote: ({ children, node }) => (
			<SelectableWrapper sectionType="blockquote" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="blockquote">
				{children}
			</SelectableWrapper>
		),

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
						const html = (e.currentTarget as HTMLElement).outerHTML;
						onSelect('link', raw || `[${typeof children === 'string' ? children : ''}](${href})`, html);
					}}
				>
					{children}
				</a>
			);
		},

		img: ({ src, alt, node }) => (
			<SelectableWrapper sectionType="image" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect}>
				<img src={src} alt={alt || ''} />
			</SelectableWrapper>
		),
	};
}
