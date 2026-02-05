
import fs from 'fs';
import path from 'path';

// Load projects
const projectsFile = process.env.PROJECTS_JSON || path.join(process.cwd(), 'data', 'projects.json');

if (!fs.existsSync(projectsFile)) {
    console.error(`Projects file not found at ${projectsFile}`);
    console.error('Please copy data/projects.example.json to data/projects.json and populate it.');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(projectsFile, 'utf-8'));
const projects = data.projects || [];

console.log(`| Project ID | Name | Path | Tech | Detected Scripts | Suggested Command | Issues |`);
console.log(`|---|---|---|---|---|---|---|`);

for (const p of projects) {
    let scripts = [];
    let issues = [];
    let suggested = '';
    
    // Check path
    if (!fs.existsSync(p.path)) {
        issues.push('Path not found');
    } else {
        // Node.js
        const pkgPath = path.join(p.path, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                if (pkg.scripts) {
                    if (pkg.scripts.dev) scripts.push('dev');
                    if (pkg.scripts.start) scripts.push('start');
                    if (pkg.scripts['start:dev']) scripts.push('start:dev');
                    if (pkg.scripts.serve) scripts.push('serve');
                    
                    // Specific logic
                    if (pkg.scripts['start:dev']) suggested = 'npm run start:dev';
                    else if (pkg.scripts.dev) suggested = 'npm run dev';
                    else if (pkg.scripts.start) suggested = 'npm start';
                    else if (pkg.scripts.serve) suggested = 'npm run serve';
                    
                    // Framework detection
                    if (pkg.dependencies?.['@dcloudio/uni-app'] || pkg.devDependencies?.['@dcloudio/uni-cli-shared']) {
                        issues.push('uni-app-x?');
                        suggested = 'HBuilderX';
                    }
                    if (pkg.dependencies?.next) scripts.push('Next.js');
                    if (pkg.dependencies?.['@nestjs/core']) scripts.push('NestJS');
                }
            } catch (e) {
                issues.push('Invalid package.json');
            }
        }
        
        // Python
        if (fs.existsSync(path.join(p.path, 'requirements.txt')) || fs.existsSync(path.join(p.path, 'pyproject.toml'))) {
            scripts.push('Python');
            if (fs.existsSync(path.join(p.path, 'main.py'))) suggested = 'python main.py';
            else if (fs.existsSync(path.join(p.path, 'app.py'))) suggested = 'python app.py';
            else if (fs.existsSync(path.join(p.path, 'manage.py'))) suggested = 'python manage.py runserver';
        }
        
        // Docker
        if (fs.existsSync(path.join(p.path, 'docker-compose.yml'))) {
            scripts.push('Docker');
            if (!suggested) suggested = 'docker-compose up';
        }
    }
    
    console.log(`| ${p.id} | ${p.name} | ${p.path} | ${p.tech?.join(', ')} | ${scripts.join(', ')} | ${suggested} | ${issues.join(', ')} |`);
}
