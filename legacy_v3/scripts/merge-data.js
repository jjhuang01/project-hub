#!/usr/bin/env node
/**
 * Project Hub - 项目数据合并工具
 * 将扫描结果与手动维护的 projects.json 合并
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const SCAN_FILE = path.join(DATA_DIR, 'scan-result.json');

console.log('🔄 Project Hub - 数据合并工具');
console.log('----------------------------------------');

// 读取文件
function readJSON(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
        console.error(`❌ 无法读取: ${filePath}`);
        return null;
    }
}

// 主函数
function main() {
    const projects = readJSON(PROJECTS_FILE);
    const scanResult = readJSON(SCAN_FILE);
    
    if (!projects || !scanResult) {
        console.error('❌ 数据文件缺失，请先运行 scan-projects.sh');
        process.exit(1);
    }
    
    console.log(`📂 已维护项目: ${projects.projects.length}`);
    console.log(`🔍 扫描项目: ${scanResult.projects.length}`);
    
    // 创建路径索引
    const projectsByPath = {};
    projects.projects.forEach(p => {
        projectsByPath[p.path] = p;
    });
    
    // 合并数据
    let updated = 0;
    let newFound = 0;
    const newProjects = [];
    
    scanResult.projects.forEach(scanned => {
        const existing = projectsByPath[scanned.path];
        
        if (existing) {
            // 更新已有项目的 lastCommit
            if (scanned.lastCommit && scanned.lastCommit !== existing.lastCommit) {
                existing.lastCommit = scanned.lastCommit;
                updated++;
            }
            // 更新 suggestArchive
            if (scanned.suggestArchive !== undefined) {
                existing.suggestArchive = scanned.suggestArchive;
            }
        } else {
            // 新发现的项目
            newProjects.push({
                id: scanned.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                name: scanned.name,
                path: scanned.path,
                category: 'personal', // 默认分类
                description: '',
                tech: [],
                lastCommit: scanned.lastCommit,
                remote: scanned.remote || null,
                status: scanned.status,
                suggestArchive: scanned.suggestArchive,
                priority: 5
            });
            newFound++;
        }
    });
    
    // 输出结果
    console.log('----------------------------------------');
    console.log(`✅ 更新: ${updated} 个项目`);
    console.log(`🆕 新发现: ${newFound} 个项目`);
    
    if (newProjects.length > 0) {
        console.log('\n📋 新发现的项目:');
        newProjects.forEach(p => {
            console.log(`   - ${p.name} (${p.path})`);
        });
        
        // 询问是否添加
        console.log('\n💡 提示: 新发现的项目已输出到 data/new-projects.json');
        console.log('   请手动审核并添加到 projects.json');
        
        fs.writeFileSync(
            path.join(DATA_DIR, 'new-projects.json'),
            JSON.stringify(newProjects, null, 2),
            'utf-8'
        );
    }
    
    // 保存更新后的数据
    projects.meta.lastUpdated = new Date().toISOString();
    projects.meta.totalProjects = projects.projects.length;
    
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
    console.log('\n✅ projects.json 已更新');
}

main();
