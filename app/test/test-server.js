// test-server.js - 服务器功能测试脚本
const http = require('http');

const SERVER_URL = 'http://127.0.0.1:3001';

// 发送HTTP请求的工具函数
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${SERVER_URL}${path}`;
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// 测试用例
async function runTests() {
  console.log('🧪 开始测试 LLog 服务器...\n');

  try {
    // 测试 1: 健康检查
    console.log('1. 测试健康检查接口...');
    const health = await makeRequest('/api/health');
    if (health.status === 200) {
      console.log('✅ 健康检查通过');
      console.log('   服务器版本:', health.data.version);
      console.log('   数据目录:', health.data.dataDir);
    } else {
      console.log('❌ 健康检查失败');
      return;
    }

    // 测试 2: 获取初始数据
    console.log('\n2. 测试获取数据接口...');
    const getData = await makeRequest('/api/data');
    if (getData.status === 200) {
      console.log('✅ 数据获取成功');
      console.log('   事件数量:', getData.data.events?.length || 0);
      console.log('   主题数量:', getData.data.topics?.length || 0);
      console.log('   任务数量:', getData.data.tasks?.length || 0);
    } else {
      console.log('❌ 数据获取失败:', getData.data);
    }

    // 测试 3: 保存测试数据
    console.log('\n3. 测试保存数据接口...');
    const testData = {
      events: [
        {
          id: 'test-event-1',
          ts: new Date().toISOString(),
          text: '测试事件 1',
          topic: null
        }
      ],
      topics: [
        {
          id: 'test-topic-1',
          name: '测试主题',
          notes: '这是一个测试主题',
          done: false,
          createdAt: new Date().toISOString()
        }
      ],
      tasks: [
        {
          id: 'test-task-1',
          text: '测试任务',
          done: false,
          notes: '这是一个测试任务',
          createdAt: new Date().toISOString()
        }
      ]
    };

    const saveData = await makeRequest('/api/data', {
      method: 'POST',
      body: testData
    });

    if (saveData.status === 200) {
      console.log('✅ 数据保存成功');
      console.log('   保存时间:', saveData.data.timestamp);
    } else {
      console.log('❌ 数据保存失败:', saveData.data);
    }

    // 测试 4: 验证数据保存
    console.log('\n4. 验证数据是否正确保存...');
    const verifyData = await makeRequest('/api/data');
    if (verifyData.status === 200) {
      const saved = verifyData.data;
      if (saved.events.length === 1 && saved.topics.length === 1 && saved.tasks.length === 1) {
        console.log('✅ 数据验证成功');
      } else {
        console.log('❌ 数据验证失败 - 数量不匹配');
      }
    }

    // 测试 5: 测试导出功能
    console.log('\n5. 测试导出功能...');
    const exportData = await makeRequest('/api/export', {
      method: 'POST',
      body: {
        data: testData,
        filename: 'test_export.json'
      }
    });

    if (exportData.status === 200) {
      console.log('✅ 导出功能正常');
      console.log('   导出文件:', exportData.data.filename);
    } else {
      console.log('❌ 导出功能失败:', exportData.data);
    }

    // 测试 6: 测试服务器信息
    console.log('\n6. 测试服务器信息接口...');
    const serverInfo = await makeRequest('/api/info');
    if (serverInfo.status === 200) {
      console.log('✅ 服务器信息获取成功');
      console.log('   运行时长:', Math.round(serverInfo.data.server.uptime / 1000), '秒');
      console.log('   数据文件存在:', serverInfo.data.storage.dataExists);
      console.log('   备份数量:', serverInfo.data.storage.backupsCount);
    }

    // 测试 7: 测试备份列表
    console.log('\n7. 测试备份列表接口...');
    const backupList = await makeRequest('/api/backups');
    if (backupList.status === 200) {
      console.log('✅ 备份列表获取成功');
      console.log('   备份数量:', backupList.data.backups.length);
    }

    console.log('\n🎉 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.log('\n💡 请确保服务器已启动：npm start');
  }
}

// 检查服务器是否运行
async function checkServerStatus() {
  try {
    const health = await makeRequest('/api/health');
    return health.status === 200;
  } catch (error) {
    return false;
  }
}

// 主函数
async function main() {
  const isRunning = await checkServerStatus();
  
  if (!isRunning) {
    console.log('❌ 服务器未运行');
    console.log('请先启动服务器：npm start');
    console.log('然后再运行测试：npm test');
    process.exit(1);
  }

  await runTests();
}

main();