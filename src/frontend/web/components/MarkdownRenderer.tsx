import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from './ui/utils.ts';
import React, {type ReactNode, useState, useCallback, type JSX, useMemo} from 'react';

interface MarkdownRendererProps {
	content: string;
	className?: string;
	/**
	 * Callback when a section is clicked.
	 * 
	 * Used for click-to-insert functionality where clicking any section
	 * (heading, paragraph, code block, etc.) triggers insertion into the note editor.
	 * 
	 * @param sectionType - Type of section that was clicked
	 * @param content - Extracted text content from the section
	 */
	onSectionClick?: (sectionType: string, content: string) => void;
}

type SectionType = 
	| 'heading-1' | 'heading-2' | 'heading-3' | 'heading-4'
	| 'paragraph' | 'code-block' | 'inline-code'
	| 'table' | 'list-item' | 'blockquote'
	| 'link' | 'image';

interface SelectableWrapperProps {
	children: ReactNode;
	sectionType: SectionType;
	onSelect: (sectionType: string, content: string) => void;
	className?: string;
	as?: keyof JSX.IntrinsicElements;
}

/**
 * Wrapper component that adds hover feedback and click selection to markdown sections.
 * 
 * Extracts text content from React children and triggers callback on click.
 * Used to enable click-to-insert functionality for all markdown elements.
 * 
 * Features:
 * - Visual hover feedback (outline and background highlight)
 * - Click detection and content extraction
 * - Prevents event propagation to avoid conflicts
 */
function SelectableWrapper({ 
	children, 
	sectionType, 
	onSelect, 
	className,
	as: Component = 'div' 
}: SelectableWrapperProps) {
	const [isHovered, setIsHovered] = useState(false);

	const extractTextContent = useCallback((node: ReactNode): string => {
		if (typeof node === 'string') return node;
		if (typeof node === 'number') return String(node);
		if (!node) return '';
		
		if (Array.isArray(node)) {
			return node.map(extractTextContent).join('');
		}
		
		if (typeof node === 'object' && 'props' in node) {
			return extractTextContent(node.props.children);
		}
		
		return '';
	}, []);

	const handleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		const textContent = extractTextContent(children);
		// console.log(`[MarkdownRenderer] Section clicked: ${sectionType}`);
		// console.log(`[MarkdownRenderer] Content: ${textContent}`);
		onSelect(sectionType, textContent);
	}, [children, sectionType, onSelect, extractTextContent]);
	
	const hoverStyles = isHovered 
		? 'bg-primary/10 outline outline-2 outline-primary/30 rounded cursor-pointer' 
		: '';

	return (
		<Component
			className={cn(className, hoverStyles, 'transition-all duration-150')}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			onClick={handleClick}
		>
			{children}
		</Component>
	);
}

/**
 * Preprocesses content to normalize list formatting issues.
 * Handles:
 * - Converts `- 1. text` to `1. text` (bullet points with numbers to numbered lists)
 * - Converts `1)` to `1.` (parenthesis to period format)
 * - Removes excessive blank lines inside lists
 */
function preprocessListContent(content: string): string {
	let processed = content;

	// Step 1: Convert bullet points that start with numbered format to numbered lists
	// Pattern: `- 1. text` or `- 1) text` -> `1. text`
	// This handles cases where LLM outputs numbered items as bullet points
	processed = processed.replace(/^(\s*)[-*]\s+(\d+)([.)])\s+(.+)$/gm, (_match, indent, number, _delimiter, text) => {
		// Convert to numbered list format (always use period)
		return `${indent}${number}. ${text}`;
	});

	// Step 2: Convert `1)` format to `1.` format for numbered lists
	// Pattern: `1) text` -> `1. text`
	processed = processed.replace(/^(\s*)(\d+)\)\s+(.+)$/gm, '$1$2. $3');

	// Step 3: Remove excessive blank lines inside lists to maintain list continuity
	// This prevents "loose lists" from breaking into separate paragraphs
	// Pattern: list item followed by blank lines and another list item
	processed = processed.replace(/^(\s*[-*]\s+.*)\n\n+(\s*[-*])/gm, '$1\n$2');
	processed = processed.replace(/^(\s*\d+\.\s+.*)\n\n+(\s*\d+\.)/gm, '$1\n$2');
	
	// Also handle mixed cases: bullet item followed by numbered item or vice versa
	processed = processed.replace(/^(\s*[-*]\s+.*)\n\n+(\s*\d+\.)/gm, '$1\n$2');
	processed = processed.replace(/^(\s*\d+\.\s+.*)\n\n+(\s*[-*])/gm, '$1\n$2');

	return processed;
}

/**
 * Preprocesses content to normalize various math delimiters to standard format.
 * Converts \(...\) to $...$ and \[...\] to $$...$$ for remark-math compatibility.
 * Also handles:
 * - Display math inside list items by extracting them to separate blocks
 * - Pipe characters | inside math expressions (conflicts with GFM table delimiters)
 */
function preprocessMathContent(content: string): string {
	// Step 1: Normalize math delimiters
	let processed = content
		// \( ... \)  ->  $...$
		.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$')
		// \[ ... \]  ->  $$...$$
		.replace(/\\\[([\s\S]*?)\\\]/g, '\n$$\n$1\n$$\n');

	// Step 2: Escape | inside math expressions to prevent GFM table conflicts
	// Replace | with \vert inside $...$ (inline math)
	processed = processed.replace(
		/\$([^$]+)\$/g,
		(_match, mathContent) => {
			// Replace | with \vert, but not if already escaped as \|
			const escaped = mathContent.replace(/(?<!\\)\|/g, '\\vert ');
			return `$${escaped}$`;
		}
	);

	// Step 3: Escape | inside $$...$$ (display math)
	processed = processed.replace(
		/\$\$([\s\S]*?)\$\$/g,
		(_match, mathContent) => {
			const escaped = mathContent.replace(/(?<!\\)\|/g, '\\vert ');
			return `$$${escaped}$$`;
		}
	);

	// Step 4: Fix display math that's indented inside list items
	// Pattern: list item with display math on next lines
	// Convert indented $$ blocks inside lists to properly formatted blocks
	processed = processed.replace(
		/^(\s*[-*]\s+[^\n]*)\n\s+\$\$\n([\s\S]*?)\n\s*\$\$/gm,
		(_, listItem, mathContent) => {
			// Keep the list item text, then add display math as a separate block
			return `${listItem}\n\n$$\n${mathContent.trim()}\n$$`;
		}
	);

	return processed;
}

/**
 * Markdown Renderer component with click-to-insert functionality.
 * 
 * Renders markdown content with support for:
 * - GitHub Flavored Markdown (GFM) including tables, task lists
 * - Math expressions (LaTeX) with KaTeX rendering
 * - Clickable sections for content insertion
 * 
 * All sections (headings, paragraphs, code blocks, tables, etc.) are clickable.
 * Clicking a section extracts its content and triggers the onSectionClick callback,
 * which can be used to insert the content into a note editor.
 * 
 * @param content - Markdown content to render
 * @param className - Optional CSS class name
 * @param onSectionClick - Callback when a section is clicked
 */
export function MarkdownRenderer({ content, className, onSectionClick }: MarkdownRendererProps) {
	// Apply preprocessing: lists first, then math (to avoid conflicts)
	const processedContent = preprocessMathContent(preprocessListContent(content));
	
	// Default handler that logs to console if no callback provided
	const handleSectionSelect = useCallback((sectionType: string, textContent: string) => {
		if (onSectionClick) {
			onSectionClick(sectionType, textContent);
		}
	}, [onSectionClick]);

	const raw_markdown = (
		<div className={cn('markdown-renderer', className)}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm, remarkMath]}
				rehypePlugins={[rehypeKatex]}
				components={{
					// Code blocks
					code({ inline, className, children, ...props }) {
						const match = /language-(\w+)/.exec(className || '');
						const language = match ? match[1] : '';

						if (inline) {
							return (
								<SelectableWrapper
									sectionType="inline-code"
									onSelect={handleSectionSelect}
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
								onSelect={handleSectionSelect}
								className="relative my-4"
							>
								{language && (
									<div className="absolute top-0 right-0 px-2 py-1 text-xs text-muted-foreground bg-muted/50 rounded-bl rounded-tr">
										{language}
									</div>
								)}
								<pre className="overflow-x-auto p-4 rounded-lg bg-muted/50 border">
									<code className={cn('text-sm font-mono', className)} {...props}>
										{children}
									</code>
								</pre>
							</SelectableWrapper>
						);
					},

					// Tables (GFM)
					table({ children }) {
						return (
							<SelectableWrapper
								sectionType="table"
								onSelect={handleSectionSelect}
								className="my-4 overflow-x-auto"
							>
								<table className="min-w-full border-collapse border border-border">
									{children}
								</table>
							</SelectableWrapper>
						);
					},
					thead({ children }) {
						return <thead className="bg-muted/50">{children}</thead>;
					},
					th({ children }) {
						return (
							<th className="border border-border px-4 py-2 text-left font-semibold">
								{children}
							</th>
						);
					},
					td({ children }) {
						return (
							<td className="border border-border px-4 py-2">
								{children}
							</td>
						);
					},

					// Headings
					h1({ children }) {
						return (
							<SelectableWrapper
								sectionType="heading-1"
								onSelect={handleSectionSelect}
								as="h1"
								className="text-2xl font-bold mt-6 mb-4 border-b pb-2"
							>
								{children}
							</SelectableWrapper>
						);
					},
					h2({ children }) {
						return (
							<SelectableWrapper
								sectionType="heading-2"
								onSelect={handleSectionSelect}
								as="h2"
								className="text-xl font-bold mt-5 mb-3 border-b pb-1"
							>
								{children}
							</SelectableWrapper>
						);
					},
					h3({ children }) {
						return (
							<SelectableWrapper
								sectionType="heading-3"
								onSelect={handleSectionSelect}
								as="h3"
								className="text-lg font-semibold mt-4 mb-2"
							>
								{children}
							</SelectableWrapper>
						);
					},
					h4({ children }) {
						return (
							<SelectableWrapper
								sectionType="heading-4"
								onSelect={handleSectionSelect}
								as="h4"
								className="text-base font-semibold mt-3 mb-2"
							>
								{children}
							</SelectableWrapper>
						);
					},

					// Paragraphs
					p({ children }) {
						return (
							<SelectableWrapper
								sectionType="paragraph"
								onSelect={handleSectionSelect}
								as="p"
								className="my-2 leading-relaxed"
							>
								{children}
							</SelectableWrapper>
						);
					},

					// Lists
					ul({ children }) {
						return (
							<ul
								className="my-2 ml-6 space-y-1"
								style={{ listStyleType: 'disc', listStylePosition: 'outside' }}
							>
								{children}
							</ul>
						);
					},
					ol({ children }) {
						return (
							<ol
								className="my-2 ml-6 space-y-1"
								style={{ listStyleType: 'decimal', listStylePosition: 'outside' }}
							>
								{children}
							</ol>
						);
					},
					li({ children }) {
						return (
							<SelectableWrapper
								sectionType="list-item"
								onSelect={handleSectionSelect}
								as="li"
								className="leading-relaxed"
							>
								{children}
							</SelectableWrapper>
						);
					},

					// Blockquotes
					blockquote({ children }) {
						return (
							<SelectableWrapper
								sectionType="blockquote"
								onSelect={handleSectionSelect}
								as="blockquote"
								className="my-4 pl-4 border-l-4 border-primary/50 italic text-muted-foreground"
							>
								{children}
							</SelectableWrapper>
						);
					},

					// Links
					a({ href, children }) {
						return (
							<a
								href={href}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary underline underline-offset-2 hover:text-primary/80"
								onClick={(e) => {
									e.stopPropagation();
									const textContent = typeof children === 'string' ? children : '';
									console.log(`[MarkdownRenderer] Link clicked: ${href}`);
									console.log(`[MarkdownRenderer] Link text: ${textContent}`);
									handleSectionSelect('link', `${textContent} (${href})`);
								}}
							>
								{children}
							</a>
						);
					},

					// Other basic elements
					hr() {
						return <hr className="my-6 border-t border-border" />;
					},
					strong({ children }) {
						return <strong className="font-semibold">{children}</strong>;
					},
					em({ children }) {
						return <em className="italic">{children}</em>;
					},
					del({ children }) {
						return (
							<del className="line-through text-muted-foreground">
								{children}
							</del>
						);
					},
					img({ src, alt }) {
						return (
							<SelectableWrapper
								sectionType="image"
								onSelect={handleSectionSelect}
								className="my-4"
							>
								<img
									src={src}
									alt={alt || ''}
									className="max-w-full h-auto rounded-lg"
								/>
							</SelectableWrapper>
						);
					},
				}}
			>
				{processedContent}
			</ReactMarkdown>
		</div>
	);
	
	console.log(raw_markdown)
	return raw_markdown;
}
