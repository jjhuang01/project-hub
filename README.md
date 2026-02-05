# Project Hub

<div align="center">

![Project Hub](https://img.shields.io/badge/Project-Hub-blue?style=for-the-badge&logo=appveyor)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A local-first, config-driven dashboard for managing your chaotic development workspace.**

</div>

---

## 🚀 Features

- **🗂 Unified Dashboard**: Visualize and search all your local projects in one place.
- **⚡️ Process Management**: Start, stop, and monitor project processes (via PM2 or terminal) directly from the UI.
- **🖥️ Web Terminal**: Integrated terminal for viewing logs and running commands.
- **🔧 Config Driven**: Fully data-driven via `projects.json`. No database required.
- **🔌 Extensible**: Built with Next.js and React, easy to extend with new "Skills" or integrations.

## 🛠 Getting Started

### Prerequisites

- Node.js 18+
- PM2 (optional, for advanced process management)

### Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/yourusername/project-hub.git
    cd project-hub
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Configure Data**:
    Copy the example configuration:

    ```bash
    cp data/projects.example.json data/projects.json
    ```

    Edit `data/projects.json` to include your actual projects.

    **Example `data/projects.json`**:

    ```json
    {
      "projects": [
        {
          "id": "my-app",
          "name": "My Awesome App",
          "path": "/absolute/path/to/my-app",
          "tech": ["Next.js", "TypeScript"],
          "priority": 1
        }
      ]
    }
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:8888](http://localhost:8888) in your browser.

## ⚙️ Configuration

### Environment Variables

| Variable        | Description                       | Default                |
| :-------------- | :-------------------------------- | :--------------------- |
| `PROJECTS_JSON` | Path to your `projects.json` file | `./data/projects.json` |
| `PM2_PATH`      | Path to `pm2` executable          | Auto-detected or `pm2` |

## 🤝 Contributing

We welcome contributions! Please check [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
