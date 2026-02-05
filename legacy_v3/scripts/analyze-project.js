#!/usr/bin/env node
/**
 * Project Analyzer - 项目深度分析脚本
 * 
 * Usage:
 *   node scripts/analyze-project.js <project-path>    # 分析单个项目
 *   node scripts/analyze-project.js --all             # 分析所有待分析项目
 *   node scripts/analyze-project.js --resume          # 断点续传
 *   node scripts/analyze-project.js --status          # 查看进度
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 路径配置
const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const ANALYSIS_DIR = path.join(DATA_DIR, 'analysis');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const PROGRESS_FILE = path.join(ANALYSIS_DIR, '_progress.json');
const HISTORY_FILE = path.join(ANALYSIS_DIR, '_history.json');

// 颜色
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

// 读取 JSON
function readJSON(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
        return null;
    }
}

// 写入 JSON
function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 执行命令
function exec(cmd, cwd = process.cwd()) {
    try {
        return execSync(cmd, { cwd, encoding: 'utf-8', timeout: 30000 }).trim();
    } catch (err) {
        return '';
    }
}

// 获取项目基础信息
function getBasicInfo(projectPath, projectData) {
    const result = {
        name: projectData.name,
        path: projectPath,
        category: projectData.category,
        tech: projectData.tech || [],
        loc: 0,
        files: 0,
        lastCommit: ''
    };
    
    // Git 最后提交
    result.lastCommit = exec('git log -1 --format="%ci"', projectPath);
    
    // 文件计数
    const findCmd = 'find . -type f \\( -name "*.ts" -o -name "*.js" -o -name "*.vue" -o -name "*.py" -o -name "*.java" -o -name "*.go" \\) | wc -l';
    result.files = parseInt(exec(findCmd, projectPath)) || 0;
    
    // 代码行数估算 (文件数 * 平均行数)
    result.loc = result.files * 100; // 粗略估算
    
    return result;
}

// 获取活跃度信息
function getActivityInfo(projectPath, projectData) {
    const result = {
        daysSinceLastCommit: 0,
        commitsLast6Months: 0,
        level: 'stale'
    };
    
    // 计算距今天数
    if (projectData.lastCommit) {
        const lastDate = new Date(projectData.lastCommit);
        const now = new Date();
        result.daysSinceLastCommit = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    } else {
        result.daysSinceLastCommit = 999;
    }
    
    // 近6个月提交数
    const logCmd = 'git log --since="6 months ago" --oneline 2>/dev/null | wc -l';
    result.commitsLast6Months = parseInt(exec(logCmd, projectPath)) || 0;
    
    // 活跃度等级
    if (result.daysSinceLastCommit <= 30) {
        result.level = 'active';
    } else if (result.daysSinceLastCommit <= 90) {
        result.level = 'moderate';
    } else if (result.daysSinceLastCommit <= 180) {
        result.level = 'dormant';
    } else {
        result.level = 'stale';
    }
    
    return result;
}

// 获取代码质量信息 (简化版)
function getQualityInfo(projectPath) {
    const result = {
        readability: 3,
        maintainability: 3,
        testCoverage: 'unknown',
        documentation: 'unknown',
        notes: ''
    };
    
    // 检查测试目录
    if (fs.existsSync(path.join(projectPath, 'test')) || 
        fs.existsSync(path.join(projectPath, 'tests')) ||
        fs.existsSync(path.join(projectPath, '__tests__'))) {
        result.testCoverage = 'medium';
    } else {
        result.testCoverage = 'none';
    }
    
    // 检查文档
    if (fs.existsSync(path.join(projectPath, 'README.md'))) {
        const readme = fs.readFileSync(path.join(projectPath, 'README.md'), 'utf-8');
        if (readme.length > 2000) {
            result.documentation = 'good';
        } else if (readme.length > 500) {
            result.documentation = 'minimal';
        } else {
            result.documentation = 'minimal';
        }
    } else {
        result.documentation = 'none';
    }
    
    return result;
}

// 计算业务价值 (基于分类和优先级)
function getBusinessValue(projectData) {
    const category = projectData.category;
    const priority = projectData.priority || 3;
    
    let strategicRelevance, uniqueness, usageFrequency, roi, knowledgeValue;
    
    // 根据分类预设基准值
    switch (category) {
        case 'work':
            strategicRelevance = 5;
            uniqueness = 4;
            usageFrequency = 5;
            roi = 5;
            knowledgeValue = 4;
            break;
        case 'personal':
            strategicRelevance = 3;
            uniqueness = 4;
            usageFrequency = 3;
            roi = 3;
            knowledgeValue = 3;
            break;
        case 'tools':
            strategicRelevance = 3;
            uniqueness = 3;
            usageFrequency = 4;
            roi = 3;
            knowledgeValue = 3;
            break;
        case 'study':
            strategicRelevance = 2;
            uniqueness = 2;
            usageFrequency = 2;
            roi = 2;
            knowledgeValue = 4;
            break;
        case 'external':
            strategicRelevance = 1;
            uniqueness = 1;
            usageFrequency = 2;
            roi = 1;
            knowledgeValue = 3;
            break;
        default:
            strategicRelevance = 2;
            uniqueness = 2;
            usageFrequency = 2;
            roi = 2;
            knowledgeValue = 2;
    }
    
    // 根据优先级调整
    const priorityBonus = (6 - priority) * 0.2;
    strategicRelevance = Math.min(5, Math.round(strategicRelevance * (1 + priorityBonus)));
    
    const total = strategicRelevance + uniqueness + usageFrequency + roi + knowledgeValue;
    
    let level;
    if (total >= 21) level = 'critical';
    else if (total >= 16) level = 'high';
    else if (total >= 11) level = 'medium';
    else if (total >= 6) level = 'low';
    else level = 'minimal';
    
    return {
        strategicRelevance,
        uniqueness,
        usageFrequency,
        roi,
        knowledgeValue,
        total,
        level
    };
}

// 检查技术债务
function getTechnicalDebt(projectPath) {
    const result = {
        outdatedDeps: [],
        deprecatedAPIs: [],
        configDrift: 'none',
        score: 0
    };
    
    // 检查 package.json 中的依赖
    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const outdated = exec('npm outdated --json 2>/dev/null', projectPath);
        if (outdated) {
            try {
                const outdatedPkgs = JSON.parse(outdated);
                result.outdatedDeps = Object.keys(outdatedPkgs).slice(0, 5);
            } catch (e) {}
        }
    }
    
    result.score = result.outdatedDeps.length > 5 ? 4 : 
                   result.outdatedDeps.length > 2 ? 3 :
                   result.outdatedDeps.length > 0 ? 2 : 1;
    
    return result;
}

// 生成建议
function getRecommendation(activity, businessValue, category) {
    let action, priority, summary, nextSteps = [];
    
    // Work 项目永不归档
    if (category === 'work') {
        if (activity.level === 'active') {
            action = 'invest';
            priority = 1;
            summary = '核心工作项目，持续投资';
        } else {
            action = 'maintain';
            priority = 2;
            summary = '工作项目休眠中，需要关注';
        }
    } else if (activity.level === 'stale' && businessValue.total <= 10) {
        action = 'archive';
        priority = 5;
        summary = '长时间未更新且价值较低，建议归档';
    } else if (activity.level === 'dormant' && businessValue.total <= 15) {
        action = 'observe';
        priority = 4;
        summary = '处于休眠状态，需要观察是否继续维护';
    } else if (businessValue.total >= 20) {
        action = 'invest';
        priority = 1;
        summary = '高价值项目，建议持续投资';
    } else {
        action = 'maintain';
        priority = 3;
        summary = '保持现状，按需维护';
    }
    
    // 生成下一步建议
    if (activity.level !== 'active') {
        nextSteps.push('考虑是否需要恢复开发');
    }
    if (businessValue.total >= 15) {
        nextSteps.push('更新文档和 README');
    }
    
    return { action, priority, summary, nextSteps };
}

// 分析单个项目
function analyzeProject(projectData) {
    const projectPath = projectData.path;
    const projectId = projectData.id;
    
    log(`\n🔍 正在分析: ${projectData.name}`, 'cyan');
    log(`   路径: ${projectPath}`, 'blue');
    
    if (!fs.existsSync(projectPath)) {
        log(`   ❌ 路径不存在，跳过`, 'red');
        return null;
    }
    
    const basic = getBasicInfo(projectPath, projectData);
    const activity = getActivityInfo(projectPath, projectData);
    const quality = getQualityInfo(projectPath);
    const businessValue = getBusinessValue(projectData);
    const technicalDebt = getTechnicalDebt(projectPath);
    const recommendation = getRecommendation(activity, businessValue, projectData.category);
    
    const report = {
        id: projectId,
        analyzedAt: new Date().toISOString(),
        version: '1.0',
        basic,
        activity,
        quality,
        businessValue,
        technicalDebt,
        recommendation
    };
    
    // 保存报告
    const reportPath = path.join(ANALYSIS_DIR, `${projectId}.json`);
    writeJSON(reportPath, report);
    
    // 输出摘要
    const activityIcon = {
        'active': '🟢',
        'moderate': '🟡',
        'dormant': '🟠',
        'stale': '🔴'
    }[activity.level];
    
    const actionIcon = {
        'invest': '⭐',
        'maintain': '🔄',
        'observe': '🔍',
        'archive': '📦'
    }[recommendation.action];
    
    log(`   ${activityIcon} 活跃度: ${activity.level} (${activity.daysSinceLastCommit} 天前)`, 'yellow');
    log(`   📊 业务价值: ${businessValue.level} (${businessValue.total}/25)`, 'yellow');
    log(`   ${actionIcon} 建议: ${recommendation.summary}`, 'green');
    
    return report;
}

// 更新进度
function updateProgress(projectId, progress) {
    progress.analyzedProjects.push(projectId);
    progress.pendingProjects = progress.pendingProjects.filter(p => p !== projectId);
    progress.analyzed++;
    progress.pending--;
    progress.currentProject = progress.pendingProjects[0] || null;
    progress.lastUpdated = new Date().toISOString();
    progress.status = progress.pending > 0 ? 'in_progress' : 'completed';
    
    writeJSON(PROGRESS_FILE, progress);
}

// 主函数
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Project Analyzer - 项目深度分析脚本

Usage:
  node analyze-project.js <project-path>  分析单个项目
  node analyze-project.js --all           分析所有项目
  node analyze-project.js --resume        断点续传
  node analyze-project.js --status        查看进度
        `);
        return;
    }
    
    const projects = readJSON(PROJECTS_FILE);
    let progress = readJSON(PROGRESS_FILE);
    
    if (!projects) {
        log('❌ 无法读取 projects.json', 'red');
        return;
    }
    
    // 初始化进度
    if (!progress || args.includes('--reset')) {
        progress = {
            version: '1.0',
            lastUpdated: new Date().toISOString(),
            totalProjects: projects.projects.length,
            analyzed: 0,
            pending: projects.projects.length,
            currentBatch: 1,
            currentProject: null,
            status: 'not_started',
            analyzedProjects: [],
            pendingProjects: projects.projects.map(p => p.id)
        };
        writeJSON(PROGRESS_FILE, progress);
    }
    
    if (args.includes('--status')) {
        log('\n📊 分析进度', 'cyan');
        log(`   总项目数: ${progress.totalProjects}`, 'blue');
        log(`   已分析: ${progress.analyzed}`, 'green');
        log(`   待分析: ${progress.pending}`, 'yellow');
        log(`   状态: ${progress.status}`, 'blue');
        if (progress.currentProject) {
            log(`   当前项目: ${progress.currentProject}`, 'magenta');
        }
        return;
    }
    
    if (args.includes('--all') || args.includes('--resume')) {
        log('\n🚀 开始批量分析', 'cyan');
        log(`   待分析项目: ${progress.pending} 个`, 'blue');
        
        const limit = 10; // 每批最多分析 10 个
        let count = 0;
        
        for (const projectId of [...progress.pendingProjects]) {
            if (count >= limit) break;
            
            const projectData = projects.projects.find(p => p.id === projectId);
            if (!projectData) continue;
            
            progress.currentProject = projectId;
            writeJSON(PROGRESS_FILE, progress);
            
            const report = analyzeProject(projectData);
            if (report) {
                updateProgress(projectId, progress);
                count++;
            }
        }
        
        log(`\n✅ 本批次完成: ${count} 个项目`, 'green');
        log(`   剩余: ${progress.pending} 个`, 'yellow');
        
    } else {
        // 分析指定项目
        const targetPath = args[0];
        const projectData = projects.projects.find(p => 
            p.path === targetPath || p.id === targetPath || p.name === targetPath
        );
        
        if (!projectData) {
            log(`❌ 找不到项目: ${targetPath}`, 'red');
            return;
        }
        
        analyzeProject(projectData);
    }
}

main();
