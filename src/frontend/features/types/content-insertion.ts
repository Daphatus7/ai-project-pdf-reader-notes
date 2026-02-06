/**
 * Types for content insertion functionality.
 * 
 * Defines the interfaces and types used when inserting content
 * from MarkdownRenderer (in LLMChat) into NoteTaker editor.
 */

/**
 * Section types that can be clicked in MarkdownRenderer.
 */
export type SectionType = 
	| 'heading-1' | 'heading-2' | 'heading-3' | 'heading-4'
	| 'paragraph' | 'code-block' | 'inline-code'
	| 'table' | 'list-item' | 'blockquote'
	| 'link' | 'image';

/**
 * Metadata associated with content insertion.
 */
export interface ContentInsertionMetadata {
	/**
	 * Optional message ID where the content originated from.
	 */
	messageId?: string;
	
	/**
	 * Whether to preserve original formatting.
	 * Default: true
	 */
	preserveFormatting?: boolean;
}

/**
 * Content insertion payload.
 * 
 * Contains the content to be inserted along with its type and metadata.
 */
export interface ContentInsertion {
	/**
	 * The markdown content to be inserted.
	 */
	content: string;
	
	/**
	 * The HTML content to be inserted (preferred for TipTap).
	 */
	htmlContent?: string;
	
	/**
	 * Type of section that was clicked.
	 */
	sectionType: SectionType;
	
	/**
	 * Source identifier for the insertion.
	 */
	source: 'markdown-renderer';
	
	/**
	 * Optional metadata about the insertion.
	 */
	metadata?: ContentInsertionMetadata;
}

/**
 * Imperative handle interface for NoteTaker component.
 * 
 * Allows parent components to programmatically insert content
 * and control the editor.
 */
export interface NotePadHandler {
	/**
	 * Inserts content into the editor at the specified position.
	 * 
	 * @param content - Markdown content to insert
	 * @param position - Where to insert: 'cursor' (current cursor position) or 'end' (end of document)
	 */
	insertContent: (content: ContentInsertion, position?: 'cursor' | 'end') => void;
	
	/**
	 * Focuses the editor.
	 */
	focus: () => void;
	
	/**
	 * Gets the underlying TipTap editor instance.
	 * 
	 * @returns Editor instance or null if not initialized
	 */
	getEditor: () => unknown | null;
	
	/**
	 * Gets the current markdown content from the editor.
	 * 
	 * @returns The markdown content as string
	 */
	getContent: () => string;
}



