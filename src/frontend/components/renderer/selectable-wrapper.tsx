/**
 * @file        selectable-wrapper.tsx
 * @description Two wrapper variants for markdown sections:
 *              - StaticSectionWrapper: read-only, no hover/click (e.g. public share page)
 *              - SelectableWrapper: extends the static version with hover feedback
 *                and click-to-select behavior
 */
import React, { useState, useCallback, type ReactNode, type JSX } from 'react';
import { cn } from '../ui/utils';

export interface SectionWrapperProps {
	children: ReactNode;
	className?: string;
	as?: keyof JSX.IntrinsicElements;
}

export interface SelectableWrapperProps extends SectionWrapperProps {
	sectionType: string;
	/** Raw markdown sliced from the AST source. When provided, passed to onSelect instead of extractTextContent. */
	rawMarkdown?: string;
	onSelect?: (sectionType: string, content: string, html: string) => void;
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
 * Static (read-only) variant — renders the section as-is, with no hover
 * feedback, pointer cursor, or click handler.
 */
export function StaticSectionWrapper({ children, className, as: Component = 'div' }: SectionWrapperProps) {
	return React.createElement(Component, { className }, children);
}

/**
 * Interactive variant — adds hover feedback and click selection on top of
 * the static wrapper. Renders as StaticSectionWrapper when no onSelect is
 * provided, so view-only consumers get zero interactive affordances.
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

	if (!onSelect) {
		return (
			<StaticSectionWrapper className={className} as={Component}>
				{children}
			</StaticSectionWrapper>
		);
	}

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
