/**
 * Common types used across API requests
 */

/**
 * Text content - used for both user input and AI response
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Image content - used for both user input and AI response
 * Base64-encoded image (no data URI prefix)
 */
export interface ImageContent {
  type: 'image';
  data: string; // Base64-encoded image (no data URI prefix)
  mime_type: 'image/png' | 'image/jpeg' | 'image/webp';
  name?: string;
}

/**
 * Unified content type for all chat messages (user and assistant)
 * The message role determines the source, content structure is the same
 */
export type ChatContent = TextContent | ImageContent;

