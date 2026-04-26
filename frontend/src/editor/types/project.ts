export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string;
  template: 'react' | 'html';
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  file_path: string;
  content: string;
  file_type: string;
  created_at: string;
  updated_at: string;
}

export interface CodeGeneration {
  id: string;
  project_id: string;
  prompt: string;
  model: string;
  status: 'pending' | 'success' | 'failed';
  error_message?: string;
  created_at: string;
}

export interface GeneratedFile {
  id: string;
  path: string;
  content: string;
  type: string;
}

export interface GenerateCodeResponse {
  success: boolean;
  generationId: string;
  files: Array<GeneratedFile>;
  dependencies?: string[];
  explanation?: string;
  message: string;
}
