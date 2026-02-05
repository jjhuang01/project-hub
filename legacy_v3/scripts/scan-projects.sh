#!/bin/bash
# Project Hub - 项目扫描脚本
# 扫描指定目录的 Git 项目并更新 projects.json

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../data"
OUTPUT_FILE="$DATA_DIR/scan-result.json"
# Configure your project directories here (use $HOME for portability)
SCAN_DIRS=("$HOME/code" "$HOME/projects")
MAX_DEPTH=3
TODAY=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Project Hub Scanner${NC}"
echo "----------------------------------------"

# 创建临时文件
TEMP_FILE=$(mktemp)
echo '{"scanTime": "'$TODAY'", "projects": [' > "$TEMP_FILE"

first=true

for SCAN_DIR in "${SCAN_DIRS[@]}"; do
    echo -e "${YELLOW}🔍 扫描目录: $SCAN_DIR${NC}"
    
    while IFS= read -r gitdir; do
        project_dir=$(dirname "$gitdir")
        project_name=$(basename "$project_dir")
        
        # 获取最后提交时间
        last_commit=$(cd "$project_dir" && git log -1 --format="%ci" 2>/dev/null || echo "")
        
        # 获取远程仓库
        remote=$(cd "$project_dir" && git remote get-url origin 2>/dev/null || echo "")
        
        # 计算天数
        if [ -n "$last_commit" ]; then
            commit_date=$(date -j -f "%Y-%m-%d %H:%M:%S %z" "$last_commit" "+%s" 2>/dev/null || echo "")
            if [ -n "$commit_date" ]; then
                now=$(date "+%s")
                days_ago=$(( (now - commit_date) / 86400 ))
            else
                days_ago=-1
            fi
        else
            days_ago=-1
        fi
        
        # 状态判断
        if [ "$days_ago" -gt 180 ]; then
            status="archived"
            suggest_archive="true"
        elif [ "$days_ago" -gt 60 ]; then
            status="dormant"
            suggest_archive="true"
        elif [ "$days_ago" -gt 0 ]; then
            status="active"
            suggest_archive="false"
        else
            status="unknown"
            suggest_archive="false"
        fi
        
        # JSON 输出
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$TEMP_FILE"
        fi
        
        cat >> "$TEMP_FILE" << EOF
    {
        "path": "$project_dir",
        "name": "$project_name",
        "lastCommit": "$last_commit",
        "daysAgo": $days_ago,
        "remote": "$remote",
        "status": "$status",
        "suggestArchive": $suggest_archive
    }
EOF
        
        # 输出状态
        if [ "$suggest_archive" = "true" ]; then
            echo -e "  ${YELLOW}⏰ $project_name ($days_ago 天前)${NC}"
        else
            echo -e "  ${GREEN}✓ $project_name${NC}"
        fi
        
    done < <(find "$SCAN_DIR" -maxdepth $MAX_DEPTH -name ".git" -type d 2>/dev/null)
done

echo "" >> "$TEMP_FILE"
echo "]}" >> "$TEMP_FILE"

# 保存结果
mkdir -p "$DATA_DIR"
mv "$TEMP_FILE" "$OUTPUT_FILE"

echo "----------------------------------------"
echo -e "${GREEN}✅ 扫描完成! 结果保存到: $OUTPUT_FILE${NC}"

# 统计
total=$(grep -c '"path"' "$OUTPUT_FILE" || echo 0)
stale=$(grep -c '"suggestArchive": true' "$OUTPUT_FILE" || echo 0)
echo -e "${BLUE}📊 统计: 共 $total 个项目, $stale 个建议归档${NC}"
