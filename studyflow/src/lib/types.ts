export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

export type SubjectIcon = 'math' | 'code' | 'language' | 'paint';

export const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

export interface Task {
	id: string;
	subjectId: string;
	title: string;
	description?: string;
	status: TaskStatus;
	priority: TaskPriority;
	deadline?: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface Subject {
	id: string;
	title: string;
	icon: SubjectIcon;
	createdAt: Date;
}

export interface AppSettings {
	theme: 'dark' | 'light';
	cardDensity: 'comfortable' | 'compact';
	showTips: boolean;
	language: 'ru' | 'en' | 'pl';
	defaultTaskPriority: TaskPriority;
	urgentThresholdHours: 24 | 48 | 72;
	completedTasksVisibility: 'tab_only' | 'active_list';
}
