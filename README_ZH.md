# LLog - 本地时间线数据管理器

[English Version](README.md)

LLog 是一个轻量级的自托管时间线数据管理应用程序，既可以在浏览器中作为 Web 应用程序使用，也可以通过本地服务器进行持久化存储。它允许您通过美观的时间线界面管理事件、主题和任务。

## 功能特性

- 📅 **时间线界面**：以时间顺序可视化您的事件
- 🏷️ **主题管理**：通过主题对事件进行分类整理
- ✅ **任务跟踪**：跟踪待办事项及其完成状态
- 💾 **双重存储系统**：
  - 浏览器存储用于离线使用
  - 本地服务器用于持久化数据存储
  - 服务器可用时自动同步两者数据
- 🔄 **自动备份**：保留最近30个数据备份
- 📤 **导入/导出**：轻松在不同安装之间迁移数据
- 🌐 **跨平台**：支持 Windows、macOS 和 Linux

## 使用场景

- 个人日记和事件跟踪
- 项目管理与时间线可视化
- 会议记录和行动项跟踪
- 日常任务管理
- 研究和想法整理

## 快速开始

### 方式一：运行预构建可执行文件（推荐）

1. 从 [Releases](https://github.com/your-username/llog/releases) 页面下载适用于您平台的预构建可执行文件
2. 运行可执行文件：
   - Windows：双击 `my-node-service.exe`
   - Linux/macOS：在终端中运行 `./my-node-service`
3. 打开浏览器并访问 http://127.0.0.1:3001
4. 开始使用 LLog！

### 方式二：从源代码运行

1. 克隆仓库：
   ```bash
   git clone https://github.com/your-username/llog.git
   cd llog
   ```

2. 安装依赖：
   ```bash
   npm run setup
   ```

3. 启动服务器：
   ```bash
   ./start.sh
   ```
   或手动启动：
   ```bash
   npm start
   ```

4. 打开浏览器并访问 http://127.0.0.1:3001

## 从源代码构建

如果您想自己构建项目：

1. 克隆仓库：
   ```bash
   git clone https://github.com/your-username/llog.git
   cd llog
   ```

2. 安装依赖：
   ```bash
   npm run setup
   ```

3. 安装 pkg 用于构建可执行文件：
   ```bash
   npm install -g pkg
   ```

4. 构建可执行文件：
   ```bash
   ./pack.sh
   ```
   或手动构建：
   ```bash
   pkg server.js --targets node18-linux-x64 --output my-node-service
   pkg server.js --targets node18-win-x64 --output my-node-service.exe
   ```

## 项目结构

```
llog/
├── index.html          # 前端客户端应用程序
├── server.js           # 主服务器实现
├── start.sh            # 交互式启动脚本
├── pack.sh             # 可执行文件打包脚本
├── ecosystem.config.js # 生产环境的 PM2 配置
├── package.json        # 项目依赖和脚本
├── test-server.js      # API 测试套件
├── data/               # 数据存储目录
│   ├── llog_data.json  # 主数据文件
│   ├── backups/        # 自动备份
│   └── exports/        # 导出的数据文件
└── logs/               # 服务器日志（运行时创建）
```

## API 端点

- `GET /api/health` - 服务器健康检查
- `GET /api/data` - 获取所有数据
- `POST /api/data` - 保存数据
- `POST /api/export` - 导出数据到文件
- `POST /api/import` - 从最新导出文件导入数据
- `GET /api/backups` - 列出备份
- `POST /api/restore/:filename` - 从备份恢复
- `GET /api/info` - 服务器信息

## 开发

### 以开发模式运行

```bash
npm run dev
```

### 以生产模式运行（PM2）

```bash
npm run pm2:start
```

### 运行测试

```bash
# 首先在另一个终端启动服务器
npm start

# 然后运行测试
npm test
```

## 配置

环境变量：
- `PORT` - 服务器端口（默认：3001）
- `LLOG_DATA_DIR` - 数据目录路径（默认：./data）
- `NODE_ENV` - 环境（开发/生产）

## 许可证

MIT 许可证 - 详情请见 [LICENSE](LICENSE) 文件。