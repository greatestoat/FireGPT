//ProjectPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import type { Project } from '../types/project';
import { Plus, Trash2, FolderCode, Loader2, Search, Code2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await projectService.getUserProjects();
      setProjects(data.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const template = formData.get('template') as 'react' | 'html';

    if (!title.trim()) {
      toast.error('Please enter a project title');
      return;
    }
    
    setIsCreating(true);
    const toastId = toast.loading('Creating project...');
    
    try {
      const result = await projectService.createProject({
        title: title.trim(),
        description: description.trim(),
        template,
      });
      
      toast.success('Project created!', { id: toastId });
      setShowCreateModal(false);
      
      // Add to state immediately for instant feedback
      const newProject: Project = {
        id: result.projectId,
        user_id: '',
        title: title.trim(),
        description: description.trim(),
        template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProjects(prev => [newProject, ...prev]);
      
      // Navigate to the new project
      setTimeout(() => {
        navigate(`/projects/${result.projectId}`);
      }, 300);
      
    } catch (error: any) {
      console.error('Failed to create project:', error);
      toast.error(error.response?.data?.message || 'Failed to create project', { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectTitle: string) => {
    if (!confirm(`Delete "${projectTitle}"? This action cannot be undone.`)) return;
    
    const toastId = toast.loading('Deleting project...');
    
    try {
      await projectService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success('Project deleted', { id: toastId });
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project', { id: toastId });
    }
  };

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#111111]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                My Projects
              </h1>
              <p className="text-gray-400 text-sm">Build amazing apps with AI assistance</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
            >
              <Plus size={20} />
              <span className="font-medium">New Project</span>
            </button>
          </div>

          {/* Search */}
          {projects.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                className="bg-[#111111] border border-gray-800 rounded-xl p-6 hover:border-gray-700 cursor-pointer transition group hover:shadow-xl hover:shadow-blue-500/10"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Code2 size={24} className="text-blue-400" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id, project.title);
                    }}
                    className="p-2 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition"
                    title="Delete project"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
                
                <h3 className="text-lg font-semibold mb-2 truncate group-hover:text-blue-400 transition">
                  {project.title}
                </h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                  {project.description || 'No description'}
                </p>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="px-3 py-1 bg-gray-800 rounded-full capitalize text-gray-300">
                    {project.template}
                  </span>
                  <span className="text-gray-500">
                    {new Date(project.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl mb-6">
              <FolderCode className="w-20 h-20 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">No projects yet</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Create your first AI-powered project and start building amazing applications
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition inline-flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <Plus size={20} />
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400">No projects match your search</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Create New Project
            </h2>
            
            <form onSubmit={handleCreateProject}>
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2 text-gray-300">Project Name</label>
                <input
                  type="text"
                  name="title"
                  required
                  disabled={isCreating}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
                  placeholder="My Awesome App"
                  autoFocus
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium mb-2 text-gray-300">Description (Optional)</label>
                <textarea
                  name="description"
                  rows={3}
                  disabled={isCreating}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 transition disabled:opacity-50 resize-none"
                  placeholder="Brief description of your project..."
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-300">Template</label>
                <select
                  name="template"
                  disabled={isCreating}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
                >
                  <option value="react">React (Recommended)</option>
                  <option value="html">HTML/CSS/JS</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="flex-1 px-4 py-3 bg-[#1a1a1a] hover:bg-gray-800 border border-gray-800 rounded-lg transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create Project
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};