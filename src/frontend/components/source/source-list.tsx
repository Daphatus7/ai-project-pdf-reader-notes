import { useState } from 'react';
import {
	ChevronDown,
	ChevronRight,
	FileText,
	FolderOpen,
	Plus,
	Trash2,
	Upload,
} from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { Checkbox } from '@/frontend/components/ui/checkbox';
import { Input } from '@/frontend/components/ui/input';
import { ScrollArea } from '@/frontend/components/ui/scroll-area';
import { Skeleton } from '@/frontend/components/ui/skeleton';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/frontend/components/ui/select';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/frontend/components/ui/dialog';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/frontend/components/ui/collapsible';
import { DocumentUpload } from './document-upload';
import type { Project, Document } from './type';

interface SourceListProps {
	projects: Project[];
	currentProject: Project | null;
	documents: Document[];
	selectedDocumentIds: string[];
	isLoadingProjects: boolean;
	isLoadingDocuments: boolean;
	isUploading: boolean;
	error: string | null;
	onSelectProject: (projectId: string) => void;
	onCreateProject: (name: string, description?: string) => Promise<void>;
	onDeleteProject: (projectId: string) => Promise<void>;
	onUploadDocument: (file: File, sourceName?: string) => Promise<void>;
	onDeleteDocument: (documentId: string) => Promise<void>;
	onToggleSelection: (documentId: string) => void;
	onOpenDocument: (documentId: string) => void;
}

export function SourceList({
	projects,
	currentProject,
	documents,
	selectedDocumentIds,
	isLoadingProjects,
	isLoadingDocuments,
	isUploading,
	error,
	onSelectProject,
	onCreateProject,
	onDeleteProject,
	onUploadDocument,
	onDeleteDocument,
	onToggleSelection,
	onOpenDocument,
}: SourceListProps) {
	const [isSourcesOpen, setIsSourcesOpen] = useState(true);
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

	if (isLoadingProjects) {
		return (
			<div className="p-4 space-y-4">
				<Skeleton className="h-9 w-full" />
				<Skeleton className="h-32 w-full" />
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
			{/* Project Selector Header */}
			<div className="border-b p-3 space-y-2">
				<div className="flex items-center gap-2">
					<FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
					<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
						Project
					</span>
				</div>

				<div className="flex items-center gap-1.5">
					{projects.length > 0 ? (
						<Select
							value={currentProject?.id ?? ''}
							onValueChange={onSelectProject}
						>
							<SelectTrigger className="flex-1 h-8 text-sm">
								<SelectValue placeholder="Select a project" />
							</SelectTrigger>
							<SelectContent>
								{projects.map((project) => (
									<SelectItem key={project.id} value={project.id}>
										{project.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : (
						<div className="flex-1 text-sm text-muted-foreground">
							No projects
						</div>
					)}

					{/* Create Project Dialog */}
					<Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
						<DialogTrigger asChild>
							<Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
								<Plus className="h-4 w-4" />
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

					{/* Delete Project */}
					{currentProject && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
							onClick={() => onDeleteProject(currentProject.id)}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					)}
				</div>
			</div>

			{/* Sources Section */}
			{!currentProject ? (
				<div className="p-4 text-center text-sm text-muted-foreground">
					<FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
					<p>Create a project to get started</p>
				</div>
			) : (
				<ScrollArea className="flex-1">
					<div className="p-3">
						<Collapsible open={isSourcesOpen} onOpenChange={setIsSourcesOpen}>
							<CollapsibleTrigger className="flex items-center w-full py-2 px-3 hover:bg-accent rounded-md text-left">
								{isSourcesOpen ? (
									<ChevronDown className="h-4 w-4 mr-2 shrink-0" />
								) : (
									<ChevronRight className="h-4 w-4 mr-2 shrink-0" />
								)}
								<span className="font-semibold text-sm">Sources</span>
								{documents.length > 0 && (
									<span className="ml-auto text-xs text-muted-foreground">
										{selectedDocumentIds.length}/{documents.length}
									</span>
								)}
							</CollapsibleTrigger>

							<CollapsibleContent className="mt-2 pl-2">
								{/* Upload Area */}
								<div className="mb-4">
									<DocumentUpload
										onUpload={onUploadDocument}
										isUploading={isUploading}
									/>
								</div>

								{/* Documents List */}
								{isLoadingDocuments ? (
									<div className="space-y-2">
										<Skeleton className="h-10 w-full" />
										<Skeleton className="h-10 w-full" />
									</div>
								) : documents.length === 0 ? (
									<div className="text-center py-8 text-muted-foreground">
										<Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
										<p className="text-sm">No documents yet</p>
										<p className="text-xs">Upload a PDF to get started</p>
									</div>
								) : (
									<div className="space-y-1">
										{documents.map((doc) => (
											<div
												key={doc.id}
												className="flex items-center gap-2 p-2 hover:bg-accent rounded-md group"
											>

												<button
													onClick={() => onOpenDocument(doc.id)}
													className="flex-1 flex items-center gap-2 text-left min-w-0"
												>
													<FileText className="h-4 w-4 text-muted-foreground shrink-0" />
													<span className="text-sm truncate">
														{doc.document_name}
													</span>
												</button>
												<Button
													variant="ghost"
													size="icon"
													className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
													onClick={() => onDeleteDocument(doc.id)}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
												<Checkbox
													className="border-r-8"
													checked={selectedDocumentIds.includes(doc.id)}
													onCheckedChange={() => onToggleSelection(doc.id)}
												/>
											</div>
										))}
									</div>
								)}
							</CollapsibleContent>
						</Collapsible>
					</div>
				</ScrollArea>
			)}
		</div>
	);
}
