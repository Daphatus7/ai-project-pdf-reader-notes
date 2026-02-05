/**
 * @file        preprocess.ts
 * @description Markdown preprocessing utilities
 */

/**
 * Escape pipe characters inside math expressions to prevent GFM table conflicts.
 * Only processes content inside $...$ and $$...$$ delimiters.
 */
export function preprocessMathPipes(content: string): string {
	return content
		// 可能没用的代码 @ToDO
		// // Inline math: $...$
		// .replace(/\$([^$]+)\$/g, (_, math: string) => {
		// 	const escaped = math.replace(/(?<!\\)\|/g, '\\vert ');
		// 	return `$${escaped}$`;
		// })
		// // Display math: $$...$$
		// .replace(/\$\$([\s\S]*?)\$\$/g, (_, math: string) => {
		// 	const escaped = math.replace(/(?<!\\)\|/g, '\\vert ');
		// 	return `$$${escaped}$$`;
		// });
}
