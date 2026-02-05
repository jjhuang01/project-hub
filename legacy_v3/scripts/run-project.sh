#!/bin/bash
# Project Hub - 快速运行项目脚本
# 用法: ./scripts/run-project.sh <project-id>
# 示例: ./scripts/run-project.sh yq-server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../data"
PROJECTS_FILE="$DATA_DIR/projects.json"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${YELLOW}用法: ./scripts/run-project.sh <project-id>${NC}"
    echo ""
    echo "可用项目:"
    jq -r '.projects[] | "  \(.id) - \(.name)"' "$PROJECTS_FILE" | head -20
    echo "  ..."
    exit 1
fi

PROJECT_ID=$1

# 获取项目信息
PROJECT_PATH=$(jq -r ".projects[] | select(.id==\"$PROJECT_ID\") | .path" "$PROJECTS_FILE")
PROJECT_NAME=$(jq -r ".projects[] | select(.id==\"$PROJECT_ID\") | .name" "$PROJECTS_FILE")

if [ -z "$PROJECT_PATH" ] || [ "$PROJECT_PATH" = "null" ]; then
    echo -e "${RED}❌ 项目未找到: $PROJECT_ID${NC}"
    exit 1
fi

if [ ! -d "$PROJECT_PATH" ]; then
    echo -e "${RED}❌ 目录不存在: $PROJECT_PATH${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 启动项目: $PROJECT_NAME${NC}"
echo -e "${CYAN}📁 路径: $PROJECT_PATH${NC}"
echo "----------------------------------------"

cd "$PROJECT_PATH"

# 检测运行类型
detect_and_run() {
    # 检查 package.json
    if [ -f "package.json" ]; then
        if grep -q '"dev"' package.json 2>/dev/null; then
            echo -e "${GREEN}📦 检测到 npm 项目，运行 npm run dev${NC}"
            npm run dev
            return
        elif grep -q '"start"' package.json 2>/dev/null; then
            echo -e "${GREEN}📦 检测到 npm 项目，运行 npm start${NC}"
            npm start
            return
        elif grep -q '"serve"' package.json 2>/dev/null; then
            echo -e "${GREEN}📦 检测到 npm 项目，运行 npm run serve${NC}"
            npm run serve
            return
        fi
    fi
    
    # 检查静态 HTML
    if [ -f "index.html" ]; then
        echo -e "${CYAN}🌐 检测到静态 HTML，使用 npx serve 启动${NC}"
        npx -y serve . -p 3030
        return
    fi
    
    # 检查 Python
    if [ -f "main.py" ]; then
        echo -e "${YELLOW}🐍 检测到 Python 项目，运行 python main.py${NC}"
        python main.py
        return
    elif [ -f "app.py" ]; then
        echo -e "${YELLOW}🐍 检测到 Python 项目，运行 python app.py${NC}"
        python app.py
        return
    fi
    
    # 检查 Docker
    if [ -f "docker-compose.yml" ]; then
        echo -e "${BLUE}🐳 检测到 Docker 项目，运行 docker-compose up${NC}"
        docker-compose up
        return
    fi
    
    # 检查 Makefile
    if [ -f "Makefile" ]; then
        echo -e "${GREEN}🔧 检测到 Makefile，运行 make${NC}"
        make
        return
    fi
    
    echo -e "${YELLOW}⚠️ 未检测到可运行的配置文件${NC}"
    echo "请手动指定运行命令"
}

detect_and_run
