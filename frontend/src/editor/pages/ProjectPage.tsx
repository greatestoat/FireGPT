
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CodeEditor }     from '../components/CodeEditor';
import { LivePreview }    from '../components/LivePreview';
import { AIChat }         from '../components/AIChat';
import { projectService } from '../services/projectService';
import { Terminal }       from '../components/Terminal';
import type { Project, ProjectFile } from '../types/project';
import {
  ArrowLeft, Loader2, Code2, Monitor, MessageSquare,
  Eye, EyeOff, Terminal as TerminalIcon,
  ChevronRight, ChevronDown,
  FileCode2, FileJson, Files, FileType2,
  Folder, FolderOpen, FileText, FileCode,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

type ViewMode = 'code' | 'preview' | 'split';

interface GeneratedFile {
  id: string;
  path: string;
  content: string;
  type: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// File-tree data structures
// ─────────────────────────────────────────────────────────────────────────────

interface TreeFile {
  kind: 'file';
  name: string;
  fullPath: string;
  file: ProjectFile;
}

interface TreeFolder {
  kind: 'folder';
  name: string;
  fullPath: string;
  children: TreeNode[];
}

type TreeNode = TreeFile | TreeFolder;

/** Converts a flat list of ProjectFiles into a nested tree. */
function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeFolder = { kind: 'folder', name: '', fullPath: '', children: [] };

  for (const file of files) {
    const parts = file.file_path.split('/');
    let cursor = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i];
      let child = cursor.children.find(
        c => c.kind === 'folder' && c.name === segment
      ) as TreeFolder | undefined;

      if (!child) {
        const parentPath = parts.slice(0, i + 1).join('/');
        child = { kind: 'folder', name: segment, fullPath: parentPath, children: [] };
        cursor.children.push(child);
      }
      cursor = child;
    }

    cursor.children.push({
      kind:     'file',
      name:     parts[parts.length - 1],
      fullPath: file.file_path,
      file,
    });
  }

  // Sort: folders first, then files, both alphabetically
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) if (n.kind === 'folder') sort(n.children);
  };
  sort(root.children);

  return root.children;
}

// ─────────────────────────────────────────────────────────────────────────────
// File icon helper
// ─────────────────────────────────────────────────────────────────────────────

function FileIcon({ name, size = 14 }: { name: string; size?: number }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';

  const map: Record<string, { icon: React.ElementType; color: string }> = {
    jsx:  { icon: FileCode2,  color: '#61dafb' },
    tsx:  { icon: FileCode2,  color: '#3178c6' },
    js:   { icon: FileCode,   color: '#f0db4f' },
    ts:   { icon: FileCode,   color: '#3178c6' },
    css:  { icon: Files,    color: '#563d7c' },
    json: { icon: FileJson,   color: '#fbc02d' },
    html: { icon: FileType2,  color: '#e44d26' },
    md:   { icon: FileText,   color: '#9e9e9e' },
    svg:  { icon: FileCode,   color: '#ff9800' },
  };

  const entry = map[ext] ?? { icon: FileText, color: '#aaaaaa' };
  const Icon  = entry.icon;
  return <Icon size={size} style={{ color: entry.color, flexShrink: 0 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree renderer
// ─────────────────────────────────────────────────────────────────────────────

interface TreeNodeViewProps {
  node:         TreeNode;
  depth:        number;
  selectedId:   string | null;
  openFolders:  Set<string>;
  onToggle:     (path: string) => void;
  onSelectFile: (file: ProjectFile) => void;
}

function TreeNodeView({
  node, depth, selectedId, openFolders, onToggle, onSelectFile,
}: TreeNodeViewProps) {
  const indent = depth * 12;

  if (node.kind === 'file') {
    const isSelected = selectedId === node.file.id;
    return (
      <div
        onClick={() => onSelectFile(node.file)}
        style={{ paddingLeft: `${16 + indent}px` }}
        className={`
          group flex items-center gap-1.5 py-[3px] pr-3 cursor-pointer select-none
          rounded-sm text-[13px] leading-5 transition-colors duration-75
          ${isSelected
            ? 'bg-[#094771] text-white'
            : 'text-[#cccccc] hover:bg-[#2a2d2e]'}
        `}
      >
        <FileIcon name={node.name} size={14} />
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  // Folder
  const isOpen = openFolders.has(node.fullPath);
  return (
    <div>
      <div
        onClick={() => onToggle(node.fullPath)}
        style={{ paddingLeft: `${4 + indent}px` }}
        className="
          flex items-center gap-1 py-[3px] pr-3 cursor-pointer select-none
          rounded-sm text-[13px] leading-5 text-[#cccccc] hover:bg-[#2a2d2e] transition-colors duration-75
        "
      >
        {/* chevron */}
        <span className="w-4 flex items-center justify-center text-[#c5c5c5]">
          {isOpen
            ? <ChevronDown  size={12} />
            : <ChevronRight size={12} />}
        </span>
        {/* folder icon */}
        {isOpen
          ? <FolderOpen size={14} style={{ color: '#dcb67a', flexShrink: 0 }} />
          : <Folder     size={14} style={{ color: '#dcb67a', flexShrink: 0 }} />}
        <span className="truncate font-normal">{node.name}</span>
      </div>

      {isOpen && node.children.map(child => (
        <TreeNodeView
          key={child.fullPath + (child.kind === 'file' ? child.file.id : '')}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          openFolders={openFolders}
          onToggle={onToggle}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// File Explorer sidebar
// ─────────────────────────────────────────────────────────────────────────────

interface FileExplorerProps {
  projectTitle:  string;
  template:      string;
  files:         ProjectFile[];
  selectedFile:  ProjectFile | null;
  onSelectFile:  (file: ProjectFile) => void;
  onBack:        () => void;
  onHide:        () => void;
}

function FileExplorer({
  projectTitle, template, files, selectedFile, onSelectFile, onBack, onHide,
}: FileExplorerProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  // Auto-open all folders on first render
  const allFolderPaths = useMemo(() => {
    const paths = new Set<string>();
    const collect = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.kind === 'folder') { paths.add(n.fullPath); collect(n.children); }
      }
    };
    collect(tree);
    return paths;
  }, [tree]);

  const [openFolders, setOpenFolders] = useState<Set<string>>(allFolderPaths);

  // Re-open any new folders that appear (e.g. after AI generation)
  useEffect(() => {
    setOpenFolders(prev => {
      const merged = new Set(prev);
      allFolderPaths.forEach(p => merged.add(p));
      return merged;
    });
  }, [allFolderPaths]);

  const toggleFolder = (path: string) =>
    setOpenFolders(prev => {
      const n = new Set(prev);
      n.has(path) ? n.delete(path) : n.add(path);
      return n;
    });

  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col bg-[#252526] border-r border-[#1e1e1e] select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e1e]">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[11px] text-[#858585] hover:text-[#cccccc] transition"
        >
          <ArrowLeft size={11} /> Projects
        </button>
        <button
          onClick={onHide}
          className="p-0.5 rounded hover:bg-[#3c3c3c] text-[#858585] hover:text-[#cccccc] transition"
        >
          <EyeOff size={12} />
        </button>
      </div>

      {/* Project name */}
      <div className="px-3 pt-2 pb-1">
        <p className="text-[11px] font-bold text-[#bbbbbb] uppercase tracking-widest truncate">
          {projectTitle}
        </p>
        <p className="text-[10px] text-[#555] capitalize mt-0.5">{template}</p>
      </div>

      {/* EXPLORER label */}
      <div className="px-3 pt-3 pb-1">
        <span className="text-[10px] font-bold text-[#bbb] uppercase tracking-widest">
          Explorer
        </span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 px-1 text-[13px]" style={{ fontFamily: "'Menlo', 'Consolas', monospace" }}>
        {tree.length === 0 ? (
          <p className="text-[11px] text-[#555] px-4 py-4 text-center">
            No files yet.<br />Use AI to generate code.
          </p>
        ) : (
          tree.map(node => (
            <TreeNodeView
              key={node.fullPath + (node.kind === 'file' ? node.file.id : '')}
              node={node}
              depth={0}
              selectedId={selectedFile?.id ?? null}
              openFolders={openFolders}
              onToggle={toggleFolder}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProjectPage
// ─────────────────────────────────────────────────────────────────────────────

export const ProjectPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate      = useNavigate();

  const [project, setProject]               = useState<Project | null>(null);
  const [files, setFiles]                   = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile]     = useState<ProjectFile | null>(null);
  const [isGenerating, setIsGenerating]     = useState(false);
  const [isLoading, setIsLoading]           = useState(true);
  const [viewMode, setViewMode]             = useState<ViewMode>('split');
  const [showAIChat, setShowAIChat]         = useState(true);
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [showTerminal, setShowTerminal]     = useState(false);
  const [hasGeneratedCode, setHasGeneratedCode] = useState(false);
  const [previewUrl, setPreviewUrl]         = useState<string | null>(null);
  const [terminalEverOpened, setTerminalEverOpened] = useState(false);

  const [lastGeneratedFiles, setLastGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [lastDependencies, setLastDependencies]     = useState<string[]>([]);

  const triggerScaffoldRef = useRef<(() => void) | null>(null);
  const pendingScaffoldRef = useRef(false);

  useEffect(() => { if (projectId) loadProject(); }, [projectId]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const data = await projectService.getProject(projectId!);
      setProject(data.project);
      setFiles(data.files);

      const hasContent = data.files.some(f => f.content && f.content.trim().length > 100);
      setHasGeneratedCode(hasContent);

      if (data.files.length > 0 && !selectedFile) {
        const appFile = data.files.find(f => /App\.[jt]sx?$/.test(f.file_path));
        setSelectedFile(appFile ?? data.files[0]);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFile = async (fileId: string, content: string) => {
    try {
      await projectService.updateFile(fileId, content);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content } : f));
      if (selectedFile?.id === fileId) setSelectedFile(prev => prev ? { ...prev, content } : prev);
      toast.success('File saved');
    } catch (error) {
      toast.error('Failed to save file');
      throw error;
    }
  };

const handleGenerate = async (prompt: string) => {
  if (!project) { toast.error('Project not loaded'); return; }
  setIsGenerating(true);
  
  // Set loading FIRST before anything else
  setPreviewUrl('loading');  // ← MOVE THIS UP HERE
  
  const toastId = toast.loading(hasGeneratedCode ? 'Applying changes…' : 'Generating your app…');

  try {
    const result = await projectService.generateCode(projectId!, prompt, project.template);
    if (result?.files)        setLastGeneratedFiles(result.files);
    if (result?.dependencies) setLastDependencies(result.dependencies);

    await new Promise(r => setTimeout(r, 500));
    await loadProject();
    setHasGeneratedCode(true);

    toast.success(
      hasGeneratedCode ? 'Changes applied! Starting dev server…' : 'App generated! Starting dev server…',
      { id: toastId }
    );

    // DON'T setPreviewUrl('loading') here again - already set above

    if (!terminalEverOpened) {
      pendingScaffoldRef.current = true;
      setTerminalEverOpened(true);
      setShowTerminal(true);
    } else {
      setShowTerminal(true);
      if (triggerScaffoldRef.current) triggerScaffoldRef.current();
    }
  } catch (error: any) {
    const msg = error.response?.data?.message ?? error.message ?? 'Failed to generate code';
    toast.error(msg, { id: toastId });
    setPreviewUrl(null); // reset on error
    throw error;
  } finally {
    setIsGenerating(false);
  }
};

  const handleToggleTerminal = () => {
    if (!showTerminal) setTerminalEverOpened(true);
    setShowTerminal(v => !v);
  };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#0098ff] animate-spin mx-auto mb-3" />
          <p className="text-[#cccccc] text-sm">Loading project…</p>
          <p className="text-[#555] text-xs mt-1">Setting up your workspace</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <p className="text-[#cccccc] mb-4 text-sm">Project not found</p>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-[#0e639c] text-white rounded text-sm hover:bg-[#1177bb]"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#252526',
            color: '#cccccc',
            border: '1px solid #454545',
            fontSize: '12px',
            fontFamily: 'Consolas, monospace',
          }
        }}
      />

      {/* ── VS Code File Explorer ─────────────────────────────────────────── */}
      {showFileExplorer && (
        <FileExplorer
          projectTitle={project.title}
          template={project.template}
          files={files}
          selectedFile={selectedFile}
          onSelectFile={(file) => {
            setSelectedFile(file);
            if (window.innerWidth < 768) setViewMode('code');
          }}
          onBack={() => navigate('/projects')}
          onHide={() => setShowFileExplorer(false)}
        />
      )}

      {/* ── Activity bar (thin left strip when explorer is hidden) ─────────── */}
      {!showFileExplorer && (
        <div className="w-[48px] flex-shrink-0 bg-[#333333] border-r border-[#252526] flex flex-col items-center pt-2 gap-1">
          <button
            onClick={() => setShowFileExplorer(true)}
            title="Show Explorer"
            className="p-2.5 rounded hover:bg-[#454545] text-[#858585] hover:text-[#cccccc] transition"
          >
            <Eye size={18} />
          </button>
        </div>
      )}

      {/* ── Main editor area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Tab bar / Top bar ──────────────────────────────────────────── */}
        <div className="h-[35px] bg-[#252526] border-b border-[#1e1e1e] flex items-center justify-between px-3 gap-2 flex-shrink-0">
          {/* Open file tab */}
          <div className="flex items-center gap-0 overflow-hidden">
            {selectedFile && (
              <div className="flex items-center gap-1.5 px-3 py-0.5 bg-[#1e1e1e] border-t border-t-[#0e639c] text-[#cccccc] text-[12px] h-[35px]">
                <FileIcon name={selectedFile.file_path.split('/').pop() ?? ''} size={12} />
                <span className="truncate max-w-[160px]">{selectedFile.file_path.split('/').pop()}</span>
              </div>
            )}
          </div>

          {/* View toggle - VS Code style */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {(['code', 'split', 'preview'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-2.5 py-1 rounded text-[11px] flex items-center gap-1 transition
                  ${mode === 'split' ? 'hidden md:flex' : ''}
                  ${viewMode === mode
                    ? 'bg-[#0e639c] text-white'
                    : 'text-[#858585] hover:bg-[#2a2d2e] hover:text-[#cccccc]'}
                `}
              >
                {mode === 'code'    && <Code2   size={11} />}
                {mode === 'split'   && <div className="flex gap-0.5"><div className="w-1 h-3 bg-current rounded-[1px] opacity-70"/><div className="w-1 h-3 bg-current rounded-[1px]"/></div>}
                {mode === 'preview' && <Monitor size={11} />}
                <span className="hidden sm:inline capitalize">{mode}</span>
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {previewUrl && previewUrl !== 'loading' && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-[#16825d]/20 border border-[#16825d]/40 rounded text-[11px] text-[#4ec9b0]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0] animate-pulse" />
                <span className="hidden sm:inline">live</span>
              </div>
            )}
            {previewUrl === 'loading' && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-[#7a6000]/20 border border-[#7a6000]/40 rounded text-[11px] text-[#dcdcaa]">
                <Loader2 size={9} className="animate-spin" />
                <span className="hidden sm:inline">starting…</span>
              </div>
            )}

            <button
              onClick={handleToggleTerminal}
              className={`px-2.5 py-1 rounded text-[11px] flex items-center gap-1 transition ${
                showTerminal
                  ? 'bg-[#0e639c] text-white'
                  : 'text-[#858585] hover:bg-[#2a2d2e] hover:text-[#cccccc]'
              }`}
            >
              <TerminalIcon size={11} />
              <span className="hidden sm:inline">Terminal</span>
            </button>

            <button
              onClick={() => setShowAIChat(!showAIChat)}
              className={`px-2.5 py-1 rounded text-[11px] flex items-center gap-1 transition ${
                showAIChat
                  ? 'bg-[#0e639c] text-white'
                  : 'text-[#858585] hover:bg-[#2a2d2e] hover:text-[#cccccc]'
              }`}
            >
              <MessageSquare size={11} />
              <span className="hidden sm:inline">AI</span>
            </button>
          </div>
        </div>

        {/* ── Editor / Preview ────────────────────────────────────────────── */}
        <div
          className="flex-1 flex overflow-hidden"
          style={{ height: showTerminal ? 'calc(100% - 300px)' : '100%' }}
        >
          {(viewMode === 'code' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'flex-1 border-r border-[#1e1e1e]' : 'flex-1'} overflow-hidden`}>
              {selectedFile ? (
                <CodeEditor
                  file={selectedFile}
                  onSave={handleSaveFile}
                  onClose={() => setSelectedFile(null)}
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
                  <div className="text-center">
                    <FileCode2 className="w-12 h-12 mx-auto mb-3 text-[#3c3c3c]" />
                    <p className="text-[#555] text-sm">Select a file to edit</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="flex-1 overflow-hidden">
              <LivePreview files={files} template={project.template} previewUrl={previewUrl} />
            </div>
          )}
        </div>
      </div>

      {/* ── AI Chat ──────────────────────────────────────────────────────── */}
      {showAIChat && (
        <div className="w-full md:w-96 bg-[#252526] border-l border-[#1e1e1e] flex flex-col md:relative absolute inset-0 md:inset-auto z-50 md:z-auto flex-shrink-0">
          <AIChat
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            onClose={() => setShowAIChat(false)}
            hasGeneratedCode={hasGeneratedCode}
            onNewProject={() => navigate('/projects')}
            generatedFiles={lastGeneratedFiles}
            lastDependencies={lastDependencies}
          />
        </div>
      )}

      {/* ── Terminal ─────────────────────────────────────────────────────── */}
      {terminalEverOpened && (
        <Terminal
          projectId={projectId!}
          visible={showTerminal}
          onClose={() => setShowTerminal(false)}
          onPreviewReady={(url) => { if (url) setPreviewUrl(url); }}
          onRegisterScaffold={(fn) => {
            triggerScaffoldRef.current = fn;
            if (pendingScaffoldRef.current) {
              pendingScaffoldRef.current = false;
              setTimeout(() => fn(), 100); // slight delay so Terminal's DOM is ready
            }
          }}
          startIdle={!hasGeneratedCode}
        />
      )}
    </div>
  );
};

