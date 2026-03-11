/**
 * @file        markdown-components.tsx
 * @description Custom React components for markdown rendering.
 * Typography is handled by markdown-typography.scss —
 * components here only provide SelectableWrapper (click-to-select)
 * and minimal structural classes.
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

/**
 * KaTeX MathML always embeds the original LaTeX inside:
 *   <annotation encoding="application/x-tex">LATEX</annotation>
 * Traverses React children to extract it — reliable fallback when
 * rehype-katex generates new hast nodes with no AST position info.
 */
function findKatexAnnotation(node: ReactNode): string | null {
	if (!node || typeof node === 'string' || typeof node === 'number') return null;
	if (Array.isArray(node)) {
		for (const child of node) {
			const r = findKatexAnnotation(child);
			if (r !== null) return r;
		}
		return null;
	}
	if (typeof node === 'object' && 'type' in node && 'props' in node) {
		const el = node as { type: unknown; props: Record<string, unknown> };
		if (el.type === 'annotation' && el.props['encoding'] === 'application/x-tex') {
			return typeof el.props['children'] === 'string' ? el.props['children'] : null;
		}
		if (el.props['children']) return findKatexAnnotation(el.props['children'] as ReactNode);
	}
	return null;
}

/** Check if KaTeX rendered display math by looking for <math display="block"> in children */
function isKatexDisplay(node: ReactNode): boolean {
	if (!node || typeof node === 'string' || typeof node === 'number') return false;
	if (Array.isArray(node)) return node.some(isKatexDisplay);
	if (typeof node === 'object' && 'type' in node && 'props' in node) {
		const el = node as { type: unknown; props: Record<string, unknown> };
		if (el.type === 'math' && el.props['display'] === 'block') return true;
		if (el.props['children']) return isKatexDisplay(el.props['children'] as ReactNode);
	}
	return false;
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
		// --- Headings ---
		h1: heading('h1', 'heading-1', onSelect, source),
		h2: heading('h2', 'heading-2', onSelect, source),
		h3: heading('h3', 'heading-3', onSelect, source),
		h4: heading('h4', 'heading-4', onSelect, source),

		// --- Paragraph ---
		p: ({ children, node }) => (
			<SelectableWrapper sectionType="paragraph" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="p">
				{children}
			</SelectableWrapper>
		),

		// --- Code Blocks & Inline Code ---
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

		// --- Tables ---
		table: ({ children, node }) => (
			<SelectableWrapper sectionType="table" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect}>
				<table>{children}</table>
			</SelectableWrapper>
		),

		ul: ({ children, node }) => (
			<SelectableWrapper sectionType="list-unordered" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="ul">
				{children}
			</SelectableWrapper>
		),
		ol: ({ children, node }) => (
			<SelectableWrapper sectionType="list-ordered" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect} as="ol">
				{children}
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

		// --- Images ---
		img: ({ src, alt, node }) => (
			<SelectableWrapper sectionType="image" rawMarkdown={sliceSource(source, node as AstNode)} onSelect={onSelect}>
				<img src={src} alt={alt || ''} />
			</SelectableWrapper>
		),

		// --- KaTeX / Math Inline (span 拦截) ---
		// Keep interception at the "katex" span level (same as before) to preserve
		// the hover outline structure. Fix rawMarkdown via annotation extraction —
		// rehype-katex nodes have no AST position, so sliceSource alone returns ''.
		span: ({ className, children, node, ...props }) => {
			const isMathRoot = typeof className === 'string' &&
				(className.includes('math-inline') || className === 'katex');

			if (isMathRoot) {
				const latex = findKatexAnnotation(children);
				const display = isKatexDisplay(children);
				// Prefer AST slice; fall back to annotation + delimiters
				const rawMd = sliceSource(source, node as AstNode)
					|| (latex ? (display ? `$$${latex}$$` : `$${latex}$`) : '');
				return (
					<SelectableWrapper
						sectionType={display ? 'math-display' : 'math-inline'}
						rawMarkdown={rawMd}
						onSelect={onSelect}
						as="span"
					>
						<span className={className} {...props}>{children}</span>
					</SelectableWrapper>
				);
			}
			return <span className={className} {...props}>{children}</span>;
		},
	};
}