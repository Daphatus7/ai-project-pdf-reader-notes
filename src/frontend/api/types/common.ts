/**
 * Common types used across API requests
 */

/**
 * Text content for API requests
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Image content for API requests
 * Base64-encoded image (no data URI prefix)
 */
export interface ImageContent {
  type: 'image';
  data: string; // Base64-encoded image (no data URI prefix)
  mime_type: 'image/png' | 'image/jpeg' | 'image/webp';
  name?: string;
}

/**
 * Union type for all input content types
 */
export type InputContent = TextContent | ImageContent;
