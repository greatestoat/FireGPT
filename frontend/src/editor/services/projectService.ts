import api from '../../utils/api';
import type { Project, ProjectFile, GenerateCodeResponse } from '../types/project';

const AI_TIMEOUT = 180_000; // 3 minutes — AI models can take 30–60s+

export const projectService = {
  // Create new project
  createProject: async (data: {
    title: string;
    description?: string;
    template?: 'react' | 'html';
  }) => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  // Get all user projects
  getUserProjects: async (): Promise<{ success: boolean; projects: Project[] }> => {
    const response = await api.get('/projects');
    return response.data;
  },

  // Get project with files
  getProject: async (projectId: string): Promise<{
    success: boolean;
    project: Project;
    files: ProjectFile[];
  }> => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  // Update file
  updateFile: async (fileId: string, content: string) => {
    const response = await api.put(`/files/${fileId}`, { content });
    return response.data;
  },

  // Create file
  createFile: async (projectId: string, data: {
    filePath: string;
    content?: string;
    fileType: string;
  }) => {
    const response = await api.post(`/projects/${projectId}/files`, data);
    return response.data;
  },

  // Delete file
  deleteFile: async (fileId: string) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  },

  // Delete project
  deleteProject: async (projectId: string) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },

  // Generate code with AI — 3 min timeout, routes by template
  generateCode: async (
    projectId: string,
    prompt: string,
    template: 'react' | 'html',
    model?: string
  ): Promise<GenerateCodeResponse> => {
    const response = await api.post(
      `/projects/${projectId}/generate/${template}`,
      { prompt, model },
      { timeout: AI_TIMEOUT }  // ← THE FIX: was using default 10s axios timeout
    );
    return response.data;
  },
};