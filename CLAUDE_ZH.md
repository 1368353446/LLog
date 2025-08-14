# CLAUDE_ZH.md

此文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是一个 LLog 本地时间线数据服务器和客户端应用程序，使用 Node.js、Express 和原生 JavaScript 构建。系统管理时间线事件、主题和任务，数据持久化到 JSON 文件中。包含自动备份功能、数据导入/导出功能，以及可在浏览器和本地服务器之间工作的双重存储系统。

主要特性：
- 前端：响应式的 HTML/JavaScript 客户端，数据存储在浏览器 localStorage 中
- 后端：Node.js/Express 服务器，将数据持久化到本地 JSON 文件
- 双重存储：当服务器可用时，数据会在浏览器存储和本地文件之间自动同步
- 自动备份系统（保留最近 30 个备份）
- 数据导入/导出功能
- 启用 CORS 以支持跨域请求

## 常用开发命令

### 启动服务器
- `npm start` - 以开发模式启动服务器
- `npm run dev` - 启动服务器并监听文件变化自动重启（需要 nodemon）
- `npm run pm2:start` - 使用 PM2 以生产模式启动服务器
- `./start.sh` - 交互式启动脚本，可选择启动模式

### 测试
- `npm test` - 运行服务器 API 测试（服务器需单独运行）
- `node test-server.js` - 运行测试的另一种方式

### 管理 PM2 进程
- `npm run pm2:stop` - 停止 PM2 进程
- `npm run pm2:restart` - 重启 PM2 进程
- `npm run pm2:logs` - 查看 PM2 日志
- `npm run pm2:monit` - 监控 PM2 进程

### 设置命令
- `npm run setup` - 安装依赖和全局 PM2
- `npm run install:pm2` - 全局安装 PM2
- `npm run install:nodemon` - 全局安装 nodemon

## 代码架构

### 主要组件
1. **index.html** - 前端客户端应用程序
   - 基于时间线的 UI，用于管理事件、主题和任务
   - 浏览器 localStorage 用于数据持久化
   - 自动检测到本地服务器的连接
   - 双重存储系统，在服务器可用时与服务器同步

2. **server.js** - 基于 Express.js 的核心服务器实现
   - 用于数据管理的 REST API 端点
   - 基于文件的数据持久化和自动备份
   - 目录结构管理
   - 健康检查和服务器信息端点

3. **test-server.js** - 基于 HTTP 的 API 测试套件
   - 对所有服务器端点的全面测试
   - 测试数据生成和验证

4. **start.sh** - 交互式启动脚本
   - 环境验证
   - 依赖安装
   - 模式选择（开发、开发+监听、生产）

5. **ecosystem.config.js** - PM2 进程管理配置
   - 生产部署设置
   - 日志和重启策略

### 数据模型
服务器管理存储在 `data/llog_data.json` 中的三个主要数据实体：
- **events**: 带时间戳的时间线事件
- **topics**: 可与事件关联的主题
- **tasks**: 可标记为完成的任务项

### 主要功能
- 自动备份系统（保留最近 30 个备份）
- 数据导入/导出功能
- 启用 CORS 以支持跨域请求
- 健康检查和服务器信息端点
- 优雅关闭处理
- 双重存储系统（浏览器 + 本地文件）

### 目录结构
- `data/` - 主数据存储目录
- `data/backups/` - 自动备份文件
- `data/exports/` - 导出的数据文件
- `logs/` - 服务器日志（运行时创建）

### 环境配置
- `PORT` - 服务器端口（默认：3001）
- `LLOG_DATA_DIR` - 数据目录路径（默认：./data）
- `NODE_ENV` - 环境（开发/生产）