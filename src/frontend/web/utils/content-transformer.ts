/**
 * Content transformation utilities.
 * 
 * Transforms raw content extracted from MarkdownRenderer sections
 * into properly formatted markdown for insertion into NoteTaker editor.
 */

import type { SectionType } from '../types/content-insertion.ts';

/**
 * Options for content transformation.
 */
interface TransformOptions {
	/**
	 * Type of section being transformed.
	 */
	sectionType: SectionType;
	
	/**
	 * Raw content extracted from the section.
	 */
	rawContent: string;
	
	/**
	 * Whether to preserve original formatting.
	 * Default: true
	 */
	preserveFormatting?: boolean;
}

/**
 * Ensures content is formatted as a heading with the specified level.
 * 
 * @param content - Raw heading text
 * @param level - Heading level (1-4)
 * @returns Formatted heading markdown
 */
function ensureHeading(content: string, level: number): string {
	const trimmed = content.trim();
	
	// Remove existing heading markers if present
	const withoutMarkers = trimmed.replace(/^#{1,4}\s+/, '');
	
	// Add correct number of # markers
	const markers = '#'.repeat(level);
	return `${markers} ${withoutMarkers}`;
}

/**
 * Ensures content is formatted as a code block.
 * 
 * @param content - Raw code content
 * @returns Formatted code block markdown
 */
function ensureCodeBlock(content: string): string {
	const trimmed = content.trim();
	
	// Check if already wrapped in code fences
	if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
		return trimmed;
	}
	
	// Extract language if present in first line
	const lines = trimmed.split('\n');
	const firstLine = lines[0];
	const languageMatch = firstLine.match(/^```(\w+)/);
	
	if (languageMatch && lines.length > 1) {
		// Already has language, preserve it
		return trimmed;
	}
	
	// Wrap in code fences without language
	return `\`\`\`\n${trimmed}\n\`\`\``;
}

/**
 * Ensures content is formatted as inline code.
 * 
 * @param content - Raw code content
 * @returns Formatted inline code markdown
 */
function ensureInlineCode(content: string): string {
	const trimmed = content.trim();
	
	// Remove existing backticks if present
	const withoutBackticks = trimmed.replace(/^`+|`+$/g, '');
	
	// Wrap in single backticks
	return `\`${withoutBackticks}\``;
}

/**
 * Ensures content is formatted as a blockquote.
 * 
 * @param content - Raw content
 * @returns Formatted blockquote markdown
 */
function ensureBlockquote(content: string): string {
	const trimmed = content.trim();
	
	// Remove existing > markers if present
	const withoutMarkers = trimmed.replace(/^>\s+/gm, '');
	
	// Add > to each line
	return withoutMarkers
		.split('\n')
		.map(line => line.trim() ? `> ${line}` : '>')
		.join('\n');
}

/**
 * Ensures content is formatted as a list item.
 * 
 * @param content - Raw list item content
 * @returns Formatted list item markdown
 */
function ensureListItem(content: string): string {
	const trimmed = content.trim();
	
	// Check if already has list marker
	if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) {
		return trimmed;
	}
	
	// Add bullet marker
	return `- ${trimmed}`;
}

/**
 * Ensures content is formatted as a table.
 * 
 * Note: Table structure is complex, so we preserve the original
 * markdown structure if it looks like a table, otherwise return as-is.
 * 
 * @param content - Raw table content
 * @returns Formatted table markdown
 */
function ensureTable(content: string): string {
	const trimmed = content.trim();
	
	// If it already looks like a markdown table, return as-is
	if (trimmed.includes('|') && trimmed.includes('\n')) {
		return trimmed;
	}
	
	// For non-table content, return as paragraph
	// (This shouldn't happen if extraction works correctly)
	return trimmed;
}

/**
 * Ensures content is formatted as a link.
 * 
 * @param content - Raw link content (may be in format "text (url)" or just text)
 * @returns Formatted link markdown
 */
function ensureLink(content: string): string {
	const trimmed = content.trim();
	
	// Check if already in markdown link format
	if (/^\[.*\]\(.*\)$/.test(trimmed)) {
		return trimmed;
	}
	
	// Check if in format "text (url)"
	const linkMatch = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
	if (linkMatch) {
		const [, text, url] = linkMatch;
		return `[${text.trim()}](${url.trim()})`;
	}
	
	// Just text, return as-is (will be plain text)
	return trimmed;
}

/**
 * Ensures content is formatted as an image.
 * 
 * @param content - Raw image content (alt text or markdown)
 * @param src - Optional image source URL
 * @returns Formatted image markdown
 */
function ensureImage(content: string, src?: string): string {
	const trimmed = content.trim();
	
	// Check if already in markdown image format
	if (/^!\[.*\]\(.*\)$/.test(trimmed)) {
		return trimmed;
	}
	
	// If we have src, format as image
	if (src) {
		return `![${trimmed}](${src})`;
	}
	
	// Just alt text, return as markdown image without src
	return `![${trimmed}]()`;
}

/**
 * Transforms raw content into properly formatted markdown
 * based on the section type.
 * 
 * @param options - Transformation options
 * @returns Formatted markdown content ready for insertion
 */
export function transformContentForInsertion(
	options: TransformOptions
): string {
	const { sectionType, rawContent, preserveFormatting = true } = options;
	
	if (!preserveFormatting) {
		// Return plain text without formatting
		return rawContent.trim();
	}
	
	switch (sectionType) {
		case 'heading-1':
			return ensureHeading(rawContent, 1);
			
		case 'heading-2':
			return ensureHeading(rawContent, 2);
			
		case 'heading-3':
			return ensureHeading(rawContent, 3);
			
		case 'heading-4':
			return ensureHeading(rawContent, 4);
			
		case 'code-block':
			return ensureCodeBlock(rawContent);
			
		case 'inline-code':
			return ensureInlineCode(rawContent);
			
		case 'blockquote':
			return ensureBlockquote(rawContent);
			
		case 'list-item':
			return ensureListItem(rawContent);
			
		case 'table':
			return ensureTable(rawContent);
			
		case 'link':
			return ensureLink(rawContent);
			
		case 'image':
			// For images, we'd need the src from the component
			// For now, return as-is (should already be in markdown format)
			return rawContent;
			
		case 'paragraph':
		default:
			// Return as-is for paragraphs
			return rawContent.trim();
	}
}



