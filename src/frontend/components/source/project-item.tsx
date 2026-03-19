import { FileText, MoreVertical, Star, Trash2 } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import type { Project, ProjectCategory } from './type';
import { useLanguage } from '@/frontend/i18n/language-context';
import type { Translations } from '@/frontend/i18n/locales/en';

/* Category badge colors — dark: variants keep hue while adapting brightness for dark mode */
export const categoryColors: Record<ProjectCategory, string> = {
	research: 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
	personal: 'bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
	work:     'bg-green-100 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
};

/* Relative date formatter — accepts t so it adapts to the active language */
export function formatRelativeDate(dateString: string, t: Translations): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return t.projectItem.dateToday;
	if (diffDays === 1) return t.projectItem.dateYesterday;
	if (diffDays < 7) return t.projectItem.dateDaysAgo.replace('{n}', String(diffDays));
	if (diffDays < 14) return t.projectItem.date1WeekAgo;
	if (diffDays < 30) return t.projectItem.dateWeeksAgo.replace('{n}', String(Math.floor(diffDays / 7)));
	if (diffDays < 60) return t.projectItem.date1MonthAgo;
	return t.projectItem.dateMonthsAgo.replace('{n}', String(Math.floor(diffDays / 30)));
}

interface ProjectItemProps {
	project: Project;
	onClick: () => void;
	onDelete: () => void;
}

export function ProjectItem({ project, onClick, onDelete }: ProjectItemProps) {
	const { t } = useLanguage();
	const category = project.category ?? 'research';
	const categoryLabels: Record<ProjectCategory, string> = {
		research: t.projectItem.categoryResearch,
		personal: t.projectItem.categoryPersonal,
		work: t.projectItem.categoryWork,
	};

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
							{formatRelativeDate(project.updated_at, t)}
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
								{t.projectItem.delete}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}
