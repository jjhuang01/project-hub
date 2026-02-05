
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { ProjectsData, Project } from './types';

const DATA_PATH = path.join(process.cwd(), 'data', 'projects.json');

export async function getProjectsData(): Promise<ProjectsData> {
  const file = await fs.readFile(DATA_PATH, 'utf-8');
  return JSON.parse(file);
}

export async function getProjects(): Promise<Project[]> {
  const data = await getProjectsData();
  const projects = data.projects;
  
  // Enrich with detected commands
  const enriched = await Promise.all(projects.map(async (p) => {
      const cmdInfo = await detectCommandSmart(p);
      return { ...p, ...cmdInfo };
  }));
  
  return enriched;
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const projects = await getProjects();
  return projects.find(p => p.id === id);
}

// --- Smart Command Detection ---

async function detectCommandSmart(project: Project): Promise<{ runCommand: string | undefined, commandSource: Project['commandSource'] | 'none' }> {
    const pPath = project.path;
    
    // 0. Manual Overrides (Legacy Hardcoding - migrating away, but keeping for safety)
    if (project.id === 'yq-uni') return { runCommand: 'echo "yq-uni requires HBuilderX" && open .', commandSource: 'custom' };

    try {
        // 1. Check package.json (Node.js)
        const pkgPath = path.join(pPath, 'package.json');
        if (existsSync(pkgPath)) {
            const pkgStr = await fs.readFile(pkgPath, 'utf-8');
            const pkg = JSON.parse(pkgStr);
            const scripts = pkg.scripts || {};
            
            // Priority: start:dev -> dev -> start -> serve
            if (scripts['start:dev']) return { runCommand: 'npm run start:dev', commandSource: 'package.json' };
            if (scripts['dev']) return { runCommand: 'npm run dev', commandSource: 'package.json' };
            if (scripts['start']) return { runCommand: 'npm start', commandSource: 'package.json' };
            if (scripts['serve']) return { runCommand: 'npm run serve', commandSource: 'package.json' };
        }

        // 2. Check Python
        if (existsSync(path.join(pPath, 'requirements.txt')) || existsSync(path.join(pPath, 'pyproject.toml'))) {
            if (existsSync(path.join(pPath, 'main.py'))) return { runCommand: 'python main.py', commandSource: 'file-structure' };
            if (existsSync(path.join(pPath, 'app.py'))) return { runCommand: 'python app.py', commandSource: 'file-structure' };
            if (existsSync(path.join(pPath, 'manage.py'))) return { runCommand: 'python manage.py runserver', commandSource: 'framework' };
            return { runCommand: undefined, commandSource: 'none' };
        }

        // 3. Check Docker
        if (existsSync(path.join(pPath, 'docker-compose.yml')) || existsSync(path.join(pPath, 'docker-compose.yaml'))) {
            return { runCommand: 'docker-compose up', commandSource: 'file-structure' };
        }
        
        // 4. Flutter
        if (existsSync(path.join(pPath, 'pubspec.yaml'))) {
            return { runCommand: 'flutter run', commandSource: 'framework' };
        }
        
        // 5. Static Web
        if (existsSync(path.join(pPath, 'index.html'))) {
            return { runCommand: 'npx serve .', commandSource: 'file-structure' };
        }

    } catch (e) {
        console.error(`Failed to detect command for ${project.id}:`, e);
    }

    // Default fallback: No command detected
    return { runCommand: undefined, commandSource: 'none' };
}

// Deprecated synchronous helper (kept for compatibility if needed, but should be replaced)
export function detectRunCommand(project: Project): string {
    return project.runCommand || 'npm run dev'; 
}
