const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { getPool } = require('./db');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// 测试数据库连接
app.get('/test-db', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT 1 as test');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 测试查询表结构
app.get('/test-table', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('DESCRIBE purchase_weight_records');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 测试查询数据
app.get('/test-data', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM purchase_weight_records LIMIT 5');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 测试PUT接口
app.put('/test-put/:billNo', async (req, res) => {
  try {
    const { billNo } = req.params;
    const record = req.body;
    
    console.log('测试PUT请求:', { billNo, record });
    
    // 先检查记录是否存在
    const checkSql = `SELECT id FROM purchase_weight_records WHERE bill_no = ?`;
    const pool = getPool();
    const [checkResult] = await pool.execute(checkSql, [billNo]);
    
    console.log('检查结果:', checkResult);
    
    if (checkResult.length === 0) {
      res.status(404).json({ success: false, message: '记录不存在' });
    } else {
      res.json({ success: true, message: '记录存在', data: checkResult[0] });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`调试服务已启动，端口: ${port}`);
  console.log(`测试数据库连接: http://localhost:${port}/test-db`);
  console.log(`测试表结构: http://localhost:${port}/test-table`);
  console.log(`测试数据查询: http://localhost:${port}/test-data`);
}); 