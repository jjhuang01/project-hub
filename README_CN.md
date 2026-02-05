# Project Hub

<div align="center">

![Project Hub](https://img.shields.io/badge/Project-Hub-blue?style=for-the-badge&logo=appveyor)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**本地优先、配置驱动的开发工作区仪表盘**

[English](README.md) | 简体中文

</div>

---

## 🚀 功能特点

- **🗂 统一仪表盘**: 在一个界面可视化和搜索所有本地项目
- **⚡️ 进程管理**: 直接从 UI 启动、停止和监控项目进程 (PM2 或终端)
- **🖥️ Web 终端**: 内置终端，查看日志和执行命令
- **🔧 配置驱动**: 完全通过 `projects.json` 数据驱动，无需数据库
- **🎨 主题系统**: 支持亮色/暗色/跟随系统
- **⌨️ 快捷键**: `Cmd+Shift+K` 快速端口管理

## 🛠 快速开始

### 环境要求

- Node.js 18+
- PM2 (可选，用于高级进程管理)

### 安装步骤

1. **克隆仓库**:

   ```bash
   git clone https://github.com/jjhuang01/project-hub.git
   cd project-hub
   ```

2. **安装依赖**:

   ```bash
   npm install
   ```

3. **配置项目数据**:

   ```bash
   cp data/projects.example.json data/projects.json
   ```

   编辑 `data/projects.json` 添加你的项目：

   ```json
   {
     "projects": [
       {
         "id": "my-app",
         "name": "我的应用",
         "path": "/path/to/my-app",
         "tech": ["Next.js", "TypeScript"],
         "priority": 1
       }
     ]
   }
   ```

4. **启动开发服务器**:
   ```bash
   npm run dev
   ```
   访问 [http://localhost:8888](http://localhost:8888)

## ⚙️ 配置说明

| 环境变量        | 说明                     | 默认值                 |
| :-------------- | :----------------------- | :--------------------- |
| `PROJECTS_JSON` | `projects.json` 文件路径 | `./data/projects.json` |
| `PM2_PATH`      | `pm2` 可执行文件路径     | 自动检测或 `pm2`       |

## 🤝 参与贡献

欢迎提交 PR！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 📄 开源协议

本项目采用 MIT 协议 - 详见 [LICENSE](LICENSE) 文件。
