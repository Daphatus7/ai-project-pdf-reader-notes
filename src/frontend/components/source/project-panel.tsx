import { useState } from 'react';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Skeleton } from '@/frontend/components/ui/skeleton';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardAction,
} from '@/frontend/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/frontend/components/ui/dialog';
import type { Project } from './type';

interface ProjectManagementPanelProps {
	projects: Project[];
	isLoading: boolean;
	error: string | null;
	onOpenProject: (projectId: string) => void;
	onCreateProject: (name: string, description?: string) => Promise<void>;
	onDeleteProject: (projectId: string) => Promise<void>;
}

export function ProjectPanel({
	projects,
	isLoading,
	error,
	onOpenProject,
	onCreateProject,
	onDeleteProject,
}: ProjectManagementPanelProps) {
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
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

	if (isLoading) {
		return (
			<div className="p-4 space-y-3">
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-20 w-full" />
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
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="border-b p-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FolderOpen className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-medium">Projects</span>
				</div>

				<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
					<DialogTrigger asChild>
						<Button variant="outline" size="sm" className="h-7 gap-1">
							<Plus className="h-3.5 w-3.5" />
							New
						</Button>
					</DialogTrigger>
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
			</div>

			{/* Project Cards */}
			<ScrollArea className="flex-1">
				<div className="p-3 space-y-2">
					{projects.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground">
							<FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
							<p className="text-sm font-medium">No projects yet</p>
							<p className="text-xs mt-1">Create a project to get started</p>
						</div>
					) : (
						projects.map((project) => (
							<Card
								key={project.id}
								className="cursor-pointer transition-colors hover:bg-accent/50"
								onClick={() => onOpenProject(project.id)}
							>
								<CardHeader className="p-4">
									<CardTitle className="text-sm font-medium">
										{project.name}
									</CardTitle>
									{project.description && (
										<CardDescription className="text-xs line-clamp-2">
											{project.description}
										</CardDescription>
									)}
									<CardAction>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-muted-foreground hover:text-destructive"
											onClick={(e) => {
												e.stopPropagation();
												onDeleteProject(project.id);
											}}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</CardAction>
								</CardHeader>
							</Card>
						))
					)}
				</div>
			</ScrollArea>
		</div>
	);
}
