import { useMemo, useRef, type RefObject } from 'react';
import { ArrowLeft, ChevronDown, FileText, X } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/frontend/components/ui/tooltip';
import { cn } from '@/frontend/components/ui/utils.ts';
import { useRefRect } from '@/frontend/@/hooks/use-element-rect.ts';
import type { DocTab } from '../project-management';

// Sizing budget for the squeeze/overflow calculation (px). The matching max
// width (168px) is enforced via the `max-w-[168px]` class on each tab.
const TAB_MIN = 96; // a tab never shrinks below this — keeps it readable
const MORE_W = 44; // space reserved for the "more" overflow button

interface TabStripProps {
	tabs: DocTab[];
	activeTabId: string;
	onSelectTab: (documentId: string, opts?: { promote?: boolean }) => void;
	onCloseTab: (documentId: string) => void;
	onBack: () => void;
}

/**
 * Chrome-style tab strip for a narrow side panel: tabs squeeze to fit, and any
 * that don't fit collapse into a "more ⌄" dropdown. The active tab is always
 * kept visible (it is held at the front of the MRU list by the parent).
 */
export function TabStrip({ tabs, activeTabId, onSelectTab, onCloseTab, onBack }: TabStripProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const { width } = useRefRect(containerRef as RefObject<HTMLDivElement>);

	const { visible, overflow } = useMemo(() => {
		// Before the container is measured, show just the (front) active tab to
		// avoid a flash of horizontally-overflowing tabs; corrects within a frame.
		if (width <= 0) {
			return { visible: tabs.slice(0, 1), overflow: tabs.slice(1) };
		}
		if (tabs.length * TAB_MIN <= width) {
			return { visible: tabs, overflow: [] as DocTab[] };
		}
		const count = Math.max(1, Math.floor((width - MORE_W) / TAB_MIN));
		return { visible: tabs.slice(0, count), overflow: tabs.slice(count) };
	}, [tabs, width]);

	return (
		<div className="flex items-center gap-1 border-b px-2 h-13">
			<Button variant="ghost" size="sm" className="shrink-0" onClick={onBack}>
				<ArrowLeft className="h-4 w-4" />
			</Button>

			<div ref={containerRef} role="tablist" className="flex-1 flex items-center gap-1 min-w-0">
				{visible.map((tab) => {
					const isActive = tab.id === activeTabId;
					return (
						<Tooltip key={tab.id}>
							<TooltipTrigger asChild>
								<div
									role="tab"
									aria-selected={isActive}
									onClick={() => onSelectTab(tab.id)}
									className={cn(
										'group flex items-center gap-1.5 h-9 pl-3 pr-1.5 rounded-md cursor-pointer text-sm transition-colors',
										'flex-1 basis-0 min-w-[96px] max-w-[168px]',
										isActive
											? 'bg-accent text-foreground'
											: 'text-muted-foreground hover:bg-accent/50',
									)}
								>
									<FileText className="h-3.5 w-3.5 shrink-0" />
									<span className="truncate flex-1">{tab.name}</span>
									<button
										type="button"
										aria-label="Close tab"
										onClick={(e) => {
											e.stopPropagation();
											onCloseTab(tab.id);
										}}
										className={cn(
											'shrink-0 rounded p-0.5 hover:bg-background/60',
											isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
										)}
									>
										<X className="h-3 w-3" />
									</button>
								</div>
							</TooltipTrigger>
							<TooltipContent side="bottom">{tab.name}</TooltipContent>
						</Tooltip>
					);
				})}

				{overflow.length > 0 && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2 h-9">
								<ChevronDown className="h-4 w-4" />
								<span className="text-xs">{overflow.length}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="max-w-[260px]">
							{overflow.map((tab) => (
								<DropdownMenuItem
									key={tab.id}
									onSelect={() => onSelectTab(tab.id, { promote: true })}
									className="flex items-center gap-2 pr-1"
								>
									<FileText className="h-3.5 w-3.5 shrink-0" />
									<span className="truncate flex-1">{tab.name}</span>
									<button
										type="button"
										aria-label="Close tab"
										onClick={(e) => {
											e.stopPropagation();
											onCloseTab(tab.id);
										}}
										className="shrink-0 rounded p-0.5 hover:bg-accent"
									>
										<X className="h-3 w-3" />
									</button>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</div>
	);
}
