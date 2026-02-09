import { useState, useEffect, useCallback } from 'react';
import { projectsService } from '@/frontend/api/services/projects.service';
import type { Project } from './type';

export interface UseProjectReturn {
	projects: Project[];
	currentProject: Project | null;
	isLoadingProjects: boolean;
	error: string | null;

	openProject: (projectId: string) => void;
	closeProject: () => void;
	createProject: (name: string, description?: string) => Promise<void>;
	deleteProject: (projectId: string) => Promise<void>;
}

export function useProject(): UseProjectReturn {
	const [projects, setProjects] = useState<Project[]>([]);
	const [currentProject, setCurrentProject] = useState<Project | null>(null);
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

	const openProject = useCallback(
		(projectId: string) => {
			const project = projects.find((p) => p.id === projectId);
			if (project) {
				setCurrentProject(project);
			}
		},
		[projects],
	);

	const closeProject = useCallback(() => {
		setCurrentProject(null);
	}, []);

	const createProject = useCallback(
		async (name: string, description?: string) => {
			setError(null);
			try {
				await projectsService.createProject({ name, description });
				const list = await projectsService.listProjects();
				setProjects(list);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to create project');
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
				if (currentProject?.id === projectId) {
					setCurrentProject(null);
				}
				const list = await projectsService.listProjects();
				setProjects(list);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to delete project');
				throw err;
			}
		},
		[currentProject],
	);

	return {
		projects,
		currentProject,
		isLoadingProjects,
		error,
		openProject,
		closeProject,
		createProject,
		deleteProject,
	};
}
