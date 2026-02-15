import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { projectsService } from '@/frontend/api/services/projects.service';
import type { Project } from './type';

export interface UseProjectReturn {
	projects: Project[];
	isLoadingProjects: boolean;
	error: string | null;

	createProject: (name: string, description?: string) => Promise<void>;
	deleteProject: (projectId: string) => Promise<void>;
}

export function useProject(): UseProjectReturn {
	const [projects, setProjects] = useState<Project[]>([]);
	const [isLoadingProjects, setIsLoadingProjects] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load projects on mount
	useEffect(() => {
		(async () => {
			setIsLoadingProjects(true);
			setError(null);
			try {
				const list = await projectsService.listProjects();
				setProjects(list);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load projects');
			} finally {
				setIsLoadingProjects(false);
			}
		})();
	}, []);

	const createProject = useCallback(
		async (name: string, description?: string) => {
			setError(null);
			try {
				await projectsService.createProject({ name, description });
				const list = await projectsService.listProjects();
				setProjects(list);
				toast.success('Project created');
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'Failed to create project';
				setError(msg);
				toast.error(msg);
				throw err;
			}
		},
		[],
	);

	const deleteProject = useCallback(
		async (projectId: string) => {
			setError(null);
			try {
				await projectsService.deleteProject(projectId);
				const list = await projectsService.listProjects();
				setProjects(list);
				toast.success('Project deleted');
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'Failed to delete project';
				setError(msg);
				toast.error(msg);
				throw err;
			}
		},
		[],
	);

	return {
		projects,
		isLoadingProjects,
		error,
		createProject,
		deleteProject,
	};
}
