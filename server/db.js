const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

let pool = null;

// 读取配置文件
async function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('读取配置文件失败:', error);
    // 返回默认配置
    return {
      database: {
        host: '47.94.131.132',
        user: 'weight',
        password: '123456',
        database: 'weight',
        port: 3306,
        connectionLimit: 10,
        queueLimit: 0
      }
    };
  }
}

// 创建数据库连接池
async function createPool() {
  try {
    const config = await loadConfig();
    const dbConfig = config.database;
    
    pool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port,
      waitForConnections: true,
      connectionLimit: dbConfig.connectionLimit,
      queueLimit: dbConfig.queueLimit
    });
    
    console.log('数据库连接池创建成功');
    return pool;
  } catch (error) {
    console.error('创建数据库连接池失败:', error);
    throw error;
  }
}

// 重新连接数据库
async function reconnect() {
  try {
    if (pool) {
      await pool.end();
    }
    return await createPool();
  } catch (error) {
    console.error('重新连接数据库失败:', error);
    throw error;
  }
}

// 初始化连接池
createPool();

module.exports = {
  getPool: () => pool,
  reconnect,
  loadConfig
}; 