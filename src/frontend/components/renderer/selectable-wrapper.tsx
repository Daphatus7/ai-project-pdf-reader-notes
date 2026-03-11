/**
 * @file        selectable-wrapper.tsx
 * @description Wrapper component for click-to-select functionality in markdown
 */
import React, { useState, useCallback, type ReactNode, type JSX } from 'react';
import { cn } from '../ui/utils';

export interface SelectableWrapperProps {
	children: ReactNode;
	sectionType: string;
	/** Raw markdown sliced from the AST source. When provided, passed to onSelect instead of extractTextContent. */
	rawMarkdown?: string;
	onSelect?: (sectionType: string, content: string, html: string) => void;
	className?: string;
	as?: keyof JSX.IntrinsicElements;
}

/**
 * Extract text content from React children recursively
 */
function extractTextContent(node: ReactNode): string {
	if (typeof node === 'string') return node;
	if (typeof node === 'number') return String(node);
	if (!node) return '';
	if (Array.isArray(node)) return node.map(extractTextContent).join('');
	if (typeof node === 'object' && 'props' in node) {
		const props = node.props as { children?: ReactNode };
		return extractTextContent(props.children);
	}
	return '';
}

/**
 * Wrapper component that adds hover feedback and click selection to markdown sections.
 */
export function SelectableWrapper({
	children,
	sectionType,
	rawMarkdown,
	onSelect,
	className,
	as: Component = 'div'
}: SelectableWrapperProps) {
	const [isHovered, setIsHovered] = useState(false);

	const handleClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
		if (!onSelect) return;
		e.stopPropagation();
		const content = rawMarkdown || extractTextContent(children);
		const html = e.currentTarget.innerHTML;
		onSelect(sectionType, content, html);
	}, [children, sectionType, onSelect, rawMarkdown]);

	return React.createElement(
		Component,
		{
			className: cn(
				className,
				isHovered && 'bg-primary/10 outline outline-1 outline-primary/30 rounded cursor-pointer',
				'transition-all duration-150'
			),
			onMouseEnter: () => setIsHovered(true),
			onMouseLeave: () => setIsHovered(false),
			onClick: handleClick,
		},
		children
	);
}
