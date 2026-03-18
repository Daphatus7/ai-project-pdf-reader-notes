import { FileText, MoreVertical, Star, Trash2 } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import type { Project, ProjectCategory } from './type';

/* Category badge colors — dark: variants keep hue while adapting brightness for dark mode */
export const categoryColors: Record<ProjectCategory, string> = {
	research: 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
	personal: 'bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
	work:     'bg-green-100 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
};

const categoryLabels: Record<ProjectCategory, string> = {
	research: 'Research',
	personal: 'Personal',
	work: 'Work',
};

export function formatRelativeDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Yesterday';
	if (diffDays < 7) return `${diffDays} days ago`;
	if (diffDays < 14) return '1 week ago';
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
	if (diffDays < 60) return '1 month ago';
	return `${Math.floor(diffDays / 30)} months ago`;
}

interface ProjectItemProps {
	project: Project;
	onClick: () => void;
	onDelete: () => void;
}

export function ProjectItem({ project, onClick, onDelete }: ProjectItemProps) {
	const category = project.category ?? 'research';

	return (
		<div
			onClick={onClick}
			className="group relative cursor-pointer rounded-xl border p-3 transition-all duration-200 hover:shadow-md"
		>
			<div className="flex items-start gap-3">
				{/* Category icon with themed badge colors */}
				<div className={`mt-0.5 p-2 rounded-lg ${categoryColors[category]} transition-colors`}>
					<FileText className="size-4" />
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-2">
						<p className="text-base">
							{project.name}
						</p>
						{project.is_starred && (
							<Star className="size-4 text-yellow-500 fill-yellow-500 shrink-0" />
						)}
					</div>

					<div className="flex items-center gap-2 mt-2">
						{/* Badge uses text-xs (12px) for readability over text-[10px] */}
						<span className={`text-xs px-2 py-0.5 rounded-full border ${categoryColors[category]}`}>
							{categoryLabels[category]}
						</span>
						<span className="text-xs text-muted-foreground">
							{formatRelativeDate(project.updated_at)}
						</span>
					</div>
				</div>

				{/* Three-dot menu — hover:bg-accent follows theme */}
				<div className="opacity-0 group-hover:opacity-100 transition-opacity">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="size-7 hover:bg-accent"
								onClick={(e) => e.stopPropagation()}
							>
								<MoreVertical className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								variant="destructive"
								onClick={(e) => {
									e.stopPropagation();
									onDelete();
								}}
							>
								<Trash2 className="size-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}
