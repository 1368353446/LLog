#!/bin/bash
# start.sh - LLog 服务器快速启动脚本

echo "🚀 LLog 服务器启动脚本"
echo "======================="

# 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    echo "请访问 https://nodejs.org 下载安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 检查项目文件
if [ ! -f "package.json" ]; then
    echo "❌ 未找到 package.json 文件"
    echo "请确保在项目根目录运行此脚本"
    exit 1
fi

if [ ! -f "server.js" ]; then
    echo "❌ 未找到 server.js 文件"
    echo "请确保 server.js 文件存在"
    exit 1
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
fi

# 创建必要目录
mkdir -p data/backups data/exports logs

echo ""
echo "请选择启动模式："
echo "1) 开发模式 (npm start)"
echo "2) 开发模式 + 自动重启 (npm run dev)"  
echo "3) 生产模式 (PM2 守护进程)"
echo "4) 运行测试"
echo ""

read -p "请输入选择 (1-4): " choice

case $choice in
    1)
        echo "🚀 启动开发模式..."
        npm start
        ;;
    2)
        echo "🚀 启动开发模式 (自动重启)..."
        if ! command -v nodemon &> /dev/null; then
            echo "📦 安装 nodemon..."
            npm install -g nodemon
        fi
        npm run dev
        ;;
    3)
        echo "🚀 启动生产模式 (PM2)..."
        if ! command -v pm2 &> /dev/null; then
            echo "📦 安装 PM2..."
            npm install -g pm2
        fi
        npm run pm2:start
        echo "✅ 服务已启动"
        echo "💡 使用以下命令管理服务："
        echo "   npm run pm2:logs    # 查看日志"
        echo "   npm run pm2:monit   # 监控面板" 
        echo "   npm run pm2:stop    # 停止服务"
        echo "   npm run pm2:restart # 重启服务"
        ;;
    4)
        echo "🧪 运行服务器测试..."
        echo "请确保服务器已在另一个终端启动 (npm start)"
        read -p "按回车键继续测试..."
        npm test
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "🎉 操作完成！"
echo "📡 服务地址: http://127.0.0.1:3001"
echo "🔍 健康检查: http://127.0.0.1:3001/api/health"