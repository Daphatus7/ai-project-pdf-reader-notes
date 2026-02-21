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

interface ProjectPanelProps {
	projects: Project[];
	isLoading: boolean;
	error: string | null;
	canCreateProject: boolean;
	plan?: string;
	projectUsageLabel?: string;
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
		// Project panel - displaying list of projects
		<div className="h-full flex flex-col mg-2">
			{/* Header for list of projects */}
			<div className=" p-3 flex items-center gap-2 border-b h-13">
				<FolderOpen className="h-4 w-4 text-muted-foreground" />
				<span className="text-sm font-medium">Project</span>
			</div>

			{/* Scrollable project card list — min-h-0 allows flex shrink to enable scroll */}
			<ScrollArea className="flex-1 min-h-0">
				<div className="p-3 flex flex-col gap-3">
					{projects.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground ">
							<FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
							<p className="text-sm font-medium">No projects yet</p>
							<p className="text-xs mt-1">Create a project to get started</p>
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
			<div className="p-3 border-t">
				<button
					type="button"
					onClick={handleAddClick}
					className="cursor-pointer w-full rounded-xl border border-dashed border-gray-300 hover:border-blue-400 p-4 transition-all duration-200 bg-white hover:bg-blue-50 group"
				>
					<div className="flex items-center justify-center gap-2">
						<div className="p-2 rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-colors">
							{canCreateProject
								? <Plus className="size-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
								: <Crown className="size-5 text-amber-500" />
							}
						</div>
						<span className="text-[14px] text-gray-600 group-hover:text-blue-600 transition-colors">
							{canCreateProject
								? 'Add New Project'
								: plan === 'pro' ? 'Project Limit Reached' : 'Upgrade to Add More'
							}
						</span>
					</div>
				</button>
			</div>

			{/* Create Project Dialog */}
			<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Project</DialogTitle>
						<DialogDescription>
							Create a new project to organize your sources.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<Input
							placeholder="Project name"
							value={newProjectName}
							onChange={(e) => setNewProjectName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleCreateProject();
							}}
						/>
						<Input
							placeholder="Description (optional)"
							value={newProjectDesc}
							onChange={(e) => setNewProjectDesc(e.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button
							onClick={handleCreateProject}
							disabled={!newProjectName.trim() || isCreating}
						>
							{isCreating ? 'Creating...' : 'Create'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Pro plan project limit dialog — shown when Pro users hit their hard cap */}
		<Dialog open={proLimitOpen} onOpenChange={setProLimitOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Project Limit Reached</DialogTitle>
					<DialogDescription>
						You have reached the maximum number of projects on your current plan.
						If you have any questions or need assistance, please contact our support team.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => setProLimitOpen(false)}>
						Close
					</Button>
					<Button asChild>
						<a href="vincent@atlasnotebook.com">Contact Support</a>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>

		<PricingDialog open={pricingOpen} onOpenChange={setPricingOpen} />
		</div>
	);
}
