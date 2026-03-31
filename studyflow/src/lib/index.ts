export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

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
  icon: string;    
  createdAt: Date;
}