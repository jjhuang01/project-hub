# Contributing to Project Hub

Thank you for your interest in contributing to Project Hub! We welcome contributions from everyone.

## Getting Started

1.  **Fork the repository**.
2.  **Clone the repository** to your local machine.
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Setup Environment**:
    - Copy `data/projects.example.json` to `data/projects.json`.
    - (Optional) Set `PM2_PATH` environment variable if your PM2 is in a non-standard location.

## Development Workflow

1.  Create a new branch for your feature or fix.
    ```bash
    git checkout -b feature/my-awesome-feature
    ```
2.  Make your changes.
3.  Run tests (if applicable) and lint.
    ```bash
    npm run lint
    ```
4.  Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/).
    ```bash
    git commit -m "feat: add amazing feature"
    ```
5.  Push to your fork and submit a Pull Request.

## Code Style

- We use **TypeScript** and **Next.js**.
- Please follow the existing code style and structure.
- Ensure all new features are driven by configuration where possible.

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
