import { useState } from 'react';
import { FolderOpen, Plus, Crown } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Skeleton } from '@/frontend/components/ui/skeleton';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/frontend/components/ui/dialog';
import { ProjectItem } from './project-item';
import { PricingDialog } from '@/frontend/features/pricing/PricingDialog';
import type { Project } from './type';
import { useLanguage } from '@/frontend/i18n/language-context';

interface ProjectPanelProps {
	projects: Project[];
	isLoading: boolean;
	error: string | null;
	canCreateProject: boolean;
	plan?: string;
	onOpenProject: (projectId: string) => void;
	onCreateProject: (name: string, description?: string) => Promise<void>;
	onDeleteProject: (projectId: string) => Promise<void>;
}

export function ProjectPanel({
	projects,
	isLoading,
	error,
	canCreateProject,
	plan,
	onOpenProject,
	onCreateProject,
	onDeleteProject,
}: ProjectPanelProps) {
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const { t } = useLanguage();
	const [pricingOpen, setPricingOpen] = useState(false);
	const [proLimitOpen, setProLimitOpen] = useState(false);
	const [newProjectName, setNewProjectName] = useState('');
	const [newProjectDesc, setNewProjectDesc] = useState('');
	const [isCreating, setIsCreating] = useState(false);

	const handleCreateProject = async () => {
		if (!newProjectName.trim()) return;
		setIsCreating(true);
		try {
			await onCreateProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
			setNewProjectName('');
			setNewProjectDesc('');
			setCreateDialogOpen(false);
		} finally {
			setIsCreating(false);
		}
	};

	const handleAddClick = () => {
		if (canCreateProject) {
			setCreateDialogOpen(true);
		} else if (plan === 'pro') {
			// Pro users have hit their hard cap — show support notice instead of upgrade prompt
			setProLimitOpen(true);
		} else {
			setPricingOpen(true);
		}
	};

	if (isLoading) {
		return (
			<div className="p-4 space-y-3">
				<Skeleton className="h-16 w-full rounded-[15px]" />
				<Skeleton className="h-16 w-full rounded-[15px]" />
				<Skeleton className="h-16 w-full rounded-[15px]" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4">
				<div className="text-sm text-destructive">{error}</div>
			</div>
		);
	}

	return (
		/* Project panel - displaying list of projects */
		<div className="h-full flex flex-col">
			{/* Header for list of projects */}
			<div className="p-3 flex items-center gap-2 border-b h-13">
				<FolderOpen className="h-4 w-4 text-muted-foreground" />
				<span className="text-sm font-medium">{t.projectPanel.title}</span>
			</div>

			{/* Scrollable project card list — min-h-0 allows flex shrink to enable scroll */}
			<ScrollArea className="flex-1 min-h-0">
				<div className="p-3 flex flex-col gap-3">
					{projects.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground">
							<FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
							<p className="text-sm font-medium">{t.projectPanel.emptyTitle}</p>
							<p className="text-xs mt-1">{t.projectPanel.emptySubtitle}</p>
						</div>
					) : (
						projects.map((project) => (
							<ProjectItem
								key={project.id}
								project={project}
								onClick={() => onOpenProject(project.id)}
								onDelete={() => onDeleteProject(project.id)}
							/>
						))
					)}
				</div>
			</ScrollArea>

			{/* Add New Project button — pinned at bottom, outside scroll area */}
			<div className="p-3 border-t bg-panel">
				<button
					type="button"
					onClick={handleAddClick}
					/* bg-panel + border-border adapt to light/dark; hover uses accent variable */
					className="cursor-pointer w-full rounded-xl border border-dashed border-border hover:border-blue-400 p-4 transition-all duration-200 bg-panel hover:bg-accent group"
				>
					<div className="flex items-center justify-center gap-2">
						{/* Icon container: muted bg at rest, accent on hover */}
						<div className="p-2 rounded-lg  group-hover:bg-accent transition-colors">
							{canCreateProject
								? <Plus className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
								: <Crown className="size-5 text-amber-500" />
							}
						</div>
						<span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
							{canCreateProject
								? t.projectPanel.addNew
								: plan === 'pro' ? t.projectPanel.limitReachedPro : t.projectPanel.limitReachedFree
							}
						</span>
					</div>
				</button>
			</div>

			{/* Create Project Dialog */}
			<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t.projectPanel.createDialogTitle}</DialogTitle>
						<DialogDescription>
							{t.projectPanel.createDialogDesc}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<Input
							placeholder={t.projectPanel.projectNamePlaceholder}
							value={newProjectName}
							onChange={(e) => setNewProjectName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !isCreating) handleCreateProject();
							}}
						/>
						<Input
							placeholder={t.projectPanel.descriptionPlaceholder}
							value={newProjectDesc}
							onChange={(e) => setNewProjectDesc(e.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button
							onClick={handleCreateProject}
							disabled={!newProjectName.trim() || isCreating}
						>
							{isCreating ? t.projectPanel.creating : t.projectPanel.create}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Pro plan project limit dialog — shown when Pro users hit their hard cap */}
			<Dialog open={proLimitOpen} onOpenChange={setProLimitOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t.projectPanel.limitDialogTitle}</DialogTitle>
						<DialogDescription>
							{t.projectPanel.limitDialogDesc}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setProLimitOpen(false)}>
							{t.projectPanel.close}
						</Button>
						<Button asChild>
							<a href="vincent@atlasnotebook.com">{t.projectPanel.contactSupport}</a>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
		</div>
	);
}
