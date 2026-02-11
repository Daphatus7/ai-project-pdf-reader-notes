export type ProjectCategory = 'research' | 'personal' | 'work';

export interface Project {
	id: string;
	name: string;
	description?: string;
	category?: ProjectCategory;
	is_starred?: boolean;
	created_at: string;
	updated_at: string;
}

export interface Document {
	id: string;
	project_id: string;
	document_name: string;
	document_dir: string;
	document_type?: string;
	description?: string;
	created_at: string;
	updated_at: string;
	metadata?: Record<string, unknown>;
}