
export interface Project {
  id: string;
  name: string;
  description: string;
  path: string;
  category: string;
  status: 'active' | 'dormant' | 'stale' | 'archived';
  lastCommit?: string;
  tech?: string[];
  remote?: string;
  suggestArchive?: boolean;
  
  // UI Fields
  icon?: string;
  repoPath?: string;
  repoUrl?: string;
  demoUrl?: string;

  // Computed/Enriched fields
  runCommand?: string;
  commandSource?: 'package.json' | 'file-structure' | 'framework' | 'custom' | 'default' | 'none';
}

export interface Category {
  id: string;
  label: string;
  icon: string;
}

export interface ProjectsData {
  projects: Project[];
  categories: Record<string, Category>;
}

export interface ProcessInfo {
  id: string;
  pid: number;
  startTime: number;
}
