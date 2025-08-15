// server.js - LLog 本地服务器
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// 数据文件路径配置
const DATA_DIR = process.env.LLOG_DATA_DIR || path.join(process.cwd(), '../data');
const DATA_FILE = path.join(DATA_DIR, 'llog_data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const EXPORT_DIR = path.join(DATA_DIR, 'exports');

// 中间件配置
app.use(cors({
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// 确保必要的目录存在
async function ensureDirectories() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(BACKUP_DIR, { recursive: true });
        await fs.mkdir(EXPORT_DIR, { recursive: true });
        console.log('目录结构已创建');
    } catch (error) {
        console.error('创建目录失败:', error);
    }
}

// 创建备份文件
async function createBackup(data) {
    try {
        const timestamp = new Date().toISOString().replace(/[:]/g, '-');
        const backupFile = path.join(BACKUP_DIR, `backup_${timestamp}.json`);
        await fs.writeFile(backupFile, JSON.stringify(data, null, 2), 'utf8');
        console.log(`备份已创建: ${backupFile}`);
        
        // 清理旧备份（保留最近30个）
        await cleanOldBackups();
    } catch (error) {
        console.error('创建备份失败:', error);
    }
}

// 清理旧备份文件
async function cleanOldBackups() {
    try {
        const files = await fs.readdir(BACKUP_DIR);
        const backupFiles = files
            .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
            .map(file => ({
                name: file,
                path: path.join(BACKUP_DIR, file)
            }));

        if (backupFiles.length > 30) {
            // 按文件名排序（包含时间戳）
            backupFiles.sort((a, b) => a.name.localeCompare(b.name));
            
            // 删除最旧的文件
            const filesToDelete = backupFiles.slice(0, backupFiles.length - 30);
            for (const file of filesToDelete) {
                await fs.unlink(file.path);
            }
            console.log(`清理了 ${filesToDelete.length} 个旧备份文件`);
        }
    } catch (error) {
        console.error('清理备份失败:', error);
    }
}

// 读取数据文件
async function readDataFile() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // 文件不存在，返回默认结构
            console.log('数据文件不存在，使用默认结构');
            return { events: [], topics: [], tasks: [] };
        }
        throw error;
    }
}

// 写入数据文件
async function writeDataFile(data) {
    try {
        // 先读取当前数据创建备份
        try {
            const currentData = await readDataFile();
            await createBackup(currentData);
        } catch (error) {
            console.warn('读取当前数据失败，跳过备份:', error.message);
        }

        // 写入新数据
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('数据文件已更新');
    } catch (error) {
        console.error('写入数据文件失败:', error);
        throw error;
    }
}

// API 路由

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        dataDir: DATA_DIR
    });
});

// 获取数据
app.get('/api/data', async (req, res) => {
    try {
        const data = await readDataFile();
        res.json(data);
    } catch (error) {
        console.error('读取数据失败:', error);
        res.status(500).json({ 
            error: '读取数据失败', 
            details: error.message 
        });
    }
});

// 生成唯一ID（与前端保持一致）
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 处理导入数据，生成缺失的ID并排序事件
function processImportData(data) {
    // 确保基本结构存在
    const processedData = {
        events: Array.isArray(data.events) ? [...data.events] : [],
        topics: Array.isArray(data.topics) ? [...data.topics] : [],
        tasks: Array.isArray(data.tasks) ? [...data.tasks] : []
    };

    // 处理事件：生成缺失的ID
    processedData.events = processedData.events.map(event => {
        return {
            ...event,
            id: event.id || uid(),
            ts: event.ts || new Date().toISOString()
        };
    });

    // 处理主题：生成缺失的ID
    processedData.topics = processedData.topics.map(topic => {
        return {
            ...topic,
            id: topic.id || uid(),
            createdAt: topic.createdAt || new Date().toISOString()
        };
    });

    // 处理任务：生成缺失的ID
    processedData.tasks = processedData.tasks.map(task => {
        return {
            ...task,
            id: task.id || uid(),
            createdAt: task.createdAt || new Date().toISOString()
        };
    });

    // 按时间戳对事件进行排序（升序）
    processedData.events.sort((a, b) => new Date(a.ts) - new Date(b.ts));

    return processedData;
}

// 保存数据
app.post('/api/data', async (req, res) => {
    try {
        const data = req.body;
        
        // 验证数据结构
        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: '无效的数据格式' });
        }

        // 处理导入数据：生成缺失的ID并排序事件
        const validData = processImportData(data);

        await writeDataFile(validData);
        res.json({ 
            success: true, 
            message: '数据保存成功',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('保存数据失败:', error);
        res.status(500).json({ 
            error: '保存数据失败', 
            details: error.message 
        });
    }
});

// 导出数据
app.post('/api/export', async (req, res) => {
    try {
        const { data, filename } = req.body;
        
        if (!data) {
            return res.status(400).json({ error: '没有数据可导出' });
        }

        const exportFilename = filename || `llog_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
        const exportPath = path.join(EXPORT_DIR, exportFilename);
        
        await fs.writeFile(exportPath, JSON.stringify(data, null, 2), 'utf8');
        
        console.log(`数据已导出到: ${exportPath}`);
        res.json({ 
            success: true, 
            message: '导出成功',
            filename: exportFilename,
            path: exportPath
        });
    } catch (error) {
        console.error('导出失败:', error);
        res.status(500).json({ 
            error: '导出失败', 
            details: error.message 
        });
    }
});

// 导入数据（这里简化为从最新的导出文件导入）
app.post('/api/import', async (req, res) => {
    try {
        // 列出导出目录中的文件
        const files = await fs.readdir(EXPORT_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        if (jsonFiles.length === 0) {
            return res.status(404).json({ error: '没有找到可导入的文件' });
        }

        // 按修改时间排序，获取最新的文件
        const filesWithStats = await Promise.all(
            jsonFiles.map(async (file) => {
                const filePath = path.join(EXPORT_DIR, file);
                const stats = await fs.stat(filePath);
                return { file, path: filePath, mtime: stats.mtime };
            })
        );

        filesWithStats.sort((a, b) => b.mtime - a.mtime);
        const latestFile = filesWithStats[0];

        const data = await fs.readFile(latestFile.path, 'utf8');
        const parsedData = JSON.parse(data);

        res.json({ 
            success: true, 
            data: parsedData,
            filename: latestFile.file,
            message: `已从 ${latestFile.file} 导入数据`
        });
    } catch (error) {
        console.error('导入失败:', error);
        res.status(500).json({ 
            error: '导入失败', 
            details: error.message 
        });
    }
});

// 获取备份列表
app.get('/api/backups', async (req, res) => {
    try {
        const files = await fs.readdir(BACKUP_DIR);
        const backupFiles = files
            .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
            .map(file => {
                const timestamp = file.replace('backup_', '').replace('.json', '');
                return {
                    filename: file,
                    timestamp: timestamp,
                    date: new Date(timestamp.replace(/-/g, ':'))
                };
            })
            .sort((a, b) => b.date - a.date);

        res.json({ backups: backupFiles });
    } catch (error) {
        console.error('获取备份列表失败:', error);
        res.status(500).json({ 
            error: '获取备份列表失败', 
            details: error.message 
        });
    }
});

// 从备份恢复
app.post('/api/restore/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const backupPath = path.join(BACKUP_DIR, filename);
        
        const data = await fs.readFile(backupPath, 'utf8');
        const parsedData = JSON.parse(data);
        
        await writeDataFile(parsedData);
        
        res.json({ 
            success: true, 
            message: `已从备份 ${filename} 恢复数据`
        });
    } catch (error) {
        console.error('恢复备份失败:', error);
        res.status(500).json({ 
            error: '恢复备份失败', 
            details: error.message 
        });
    }
});

// 获取服务器信息
app.get('/api/info', async (req, res) => {
    try {
        const dataExists = await fs.access(DATA_FILE).then(() => true).catch(() => false);
        const dataStats = dataExists ? await fs.stat(DATA_FILE) : null;
        
        const backupFiles = await fs.readdir(BACKUP_DIR).catch(() => []);
        const exportFiles = await fs.readdir(EXPORT_DIR).catch(() => []);
        
        res.json({
            server: {
                version: '1.0.0',
                port: PORT,
                startTime: app.startTime,
                uptime: Date.now() - app.startTime
            },
            storage: {
                dataDir: DATA_DIR,
                dataFile: DATA_FILE,
                dataExists,
                lastModified: dataStats ? dataStats.mtime : null,
                backupsCount: backupFiles.length,
                exportsCount: exportFiles.length
            }
        });
    } catch (error) {
        console.error('获取服务器信息失败:', error);
        res.status(500).json({ 
            error: '获取服务器信息失败', 
            details: error.message 
        });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({ 
        error: '服务器内部错误', 
        details: error.message 
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

// 启动服务器
async function startServer() {
    try {
        await ensureDirectories();
        
        app.startTime = Date.now();
        
        const server = app.listen(PORT, '127.0.0.1', () => {
            console.log('\n=================================');
            console.log('🚀 LLog 本地服务器启动成功！');
            console.log(`📡 服务地址: http://127.0.0.1:${PORT}`);
            console.log(`📁 数据目录: ${DATA_DIR}`);
            console.log(`📄 数据文件: ${DATA_FILE}`);
            console.log('=================================\n');
        });

        // 优雅关闭处理
        process.on('SIGTERM', () => {
            console.log('收到 SIGTERM 信号，正在关闭服务器...');
            server.close(() => {
                console.log('服务器已关闭');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('\n收到 SIGINT 信号，正在关闭服务器...');
            server.close(() => {
                console.log('服务器已关闭');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
}

// 启动服务器
startServer();