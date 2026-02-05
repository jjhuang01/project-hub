#!/bin/bash
# Project Hub - 项目运行机制检测脚本
# 检测每个项目的运行方式并更新 projects.json

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../data"
PROJECTS_FILE="$DATA_DIR/projects.json"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}🔍 运行机制检测器${NC}"
echo "----------------------------------------"

# 检测单个项目的运行机制
detect_run_mechanism() {
    local project_path=$1
    local type="none"
    local command=""
    local port=""
    local entry=""
    
    if [ ! -d "$project_path" ]; then
        echo '{"type":"missing","command":null,"port":null,"entry":null}'
        return
    fi
    
    cd "$project_path"
    
    # 检查 package.json
    if [ -f "package.json" ]; then
        # 检查 scripts
        if grep -q '"dev"' package.json 2>/dev/null; then
            type="npm"
            command="npm run dev"
            # 尝试猜测端口
            if grep -q '"dev".*vite' package.json 2>/dev/null; then
                port="5173"
            elif grep -q '"dev".*nest' package.json 2>/dev/null || grep -q '"dev".*node' package.json 2>/dev/null; then
                port="3000"
            fi
        elif grep -q '"start"' package.json 2>/dev/null; then
            type="npm"
            command="npm start"
            port="3000"
        elif grep -q '"serve"' package.json 2>/dev/null; then
            type="npm"
            command="npm run serve"
            port="8080"
        fi
    fi
    
    # 如果还没检测到，检查静态 HTML
    if [ "$type" = "none" ] && [ -f "index.html" ]; then
        type="static"
        command="python3 -m http.server"
        entry="index.html"
    fi
    
    # 检查 Python 项目
    if [ "$type" = "none" ]; then
        if [ -f "main.py" ]; then
            type="python"
            command="python main.py"
        elif [ -f "app.py" ]; then
            type="python"
            command="python app.py"
        elif [ -f "run.py" ]; then
            type="python"
            command="python run.py"
        fi
    fi
    
    # 检查 Makefile
    if [ "$type" = "none" ] && [ -f "Makefile" ]; then
        type="make"
        command="make"
    fi
    
    # 检查 Docker
    if [ "$type" = "none" ] && [ -f "docker-compose.yml" ]; then
        type="docker"
        command="docker-compose up"
    fi
    
    # 输出 JSON
    cat <<EOF
{"type":"$type","command":$([ -n "$command" ] && echo "\"$command\"" || echo "null"),"port":$([ -n "$port" ] && echo "$port" || echo "null"),"entry":$([ -n "$entry" ] && echo "\"$entry\"" || echo "null")}
EOF
}

# 处理所有项目
# 读取 projects.json 并为每个项目检测运行机制
if [ ! -f "$PROJECTS_FILE" ]; then
    echo -e "${YELLOW}⚠️ projects.json 未找到${NC}"
    exit 1
fi

# 创建临时文件存储结果
TEMP_OUTPUT=$(mktemp)

# 使用 jq 遍历并更新每个项目
jq -c '.projects[]' "$PROJECTS_FILE" | while read -r project; do
    id=$(echo "$project" | jq -r '.id')
    path=$(echo "$project" | jq -r '.path')
    name=$(echo "$project" | jq -r '.name')
    
    mechanism=$(detect_run_mechanism "$path" 2>/dev/null)
    type=$(echo "$mechanism" | jq -r '.type')
    
    # 显示进度
    case $type in
        "npm") echo -e "  ${GREEN}📦 $name${NC} → npm" ;;
        "static") echo -e "  ${CYAN}🌐 $name${NC} → static HTML" ;;
        "python") echo -e "  ${YELLOW}🐍 $name${NC} → python" ;;
        "docker") echo -e "  ${BLUE}🐳 $name${NC} → docker" ;;
        "missing") echo -e "  ⚠️ $name → 目录不存在" ;;
        *) echo -e "  ⬜ $name → none" ;;
    esac
    
    # 保存结果
    echo "$id|$mechanism" >> "$TEMP_OUTPUT"
done

echo "----------------------------------------"
echo -e "${GREEN}✅ 检测完成!${NC}"

# 显示统计
npm_count=$(grep -c '"type":"npm"' "$TEMP_OUTPUT" 2>/dev/null || echo 0)
static_count=$(grep -c '"type":"static"' "$TEMP_OUTPUT" 2>/dev/null || echo 0)
python_count=$(grep -c '"type":"python"' "$TEMP_OUTPUT" 2>/dev/null || echo 0)
none_count=$(grep -c '"type":"none"' "$TEMP_OUTPUT" 2>/dev/null || echo 0)

echo -e "${BLUE}📊 统计: npm=$npm_count, static=$static_count, python=$python_count, none=$none_count${NC}"

# 清理
rm -f "$TEMP_OUTPUT"
