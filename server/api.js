const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { insertPurchaseWeightRecord, getAllActiveRecords, getRecordsByTimeRange, deleteRecord, updateRecord, getAllArchivedRecords, updatePaymentStatus, getRecordsByCardNo, getHomeStatistics, getChartData } = require('./purchaseWeightService');
const { insertSalesWeightRecord, getAllActiveSalesRecords, getSalesRecordsByTimeRange, deleteSalesRecord, updateSalesRecord, getAllArchivedSalesRecords, updateSalesPaymentStatus, getSalesRecordsByCardNo, getSalesStatistics, getSalesChartData } = require('./salesWeightService');
const { insertCard, updateCard, deleteCard, getAllCards, getCardById, batchInsertCards } = require('./cardService');
const { loadConfig, reconnect } = require('./db');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// 获取数据库配置
app.get('/api/database-config', async (req, res) => {
  try {
    const config = await loadConfig();
    res.json({ code: 0, msg: '获取配置成功', data: config.database });
  } catch (error) {
    console.error('获取数据库配置失败:', error);
    res.status(500).json({ code: 1, msg: '获取配置失败', error: error.message });
  }
});

// 更新数据库配置
app.put('/api/database-config', async (req, res) => {
  try {
    const newConfig = req.body;
    console.log('收到数据库配置更新请求:', newConfig);
    
    // 验证必填字段
    if (!newConfig.host || !newConfig.user || !newConfig.database) {
      return res.status(400).json({ code: 1, msg: '主机、用户名、数据库名必填' });
    }
    
    // 读取当前配置
    const configPath = path.join(__dirname, 'config.json');
    let currentConfig;
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      currentConfig = JSON.parse(configData);
    } catch (error) {
      currentConfig = { database: {} };
    }
    
    // 更新配置
    currentConfig.database = {
      ...currentConfig.database,
      ...newConfig,
      port: parseInt(newConfig.port) || 3306,
      connectionLimit: parseInt(newConfig.connectionLimit) || 10,
      queueLimit: parseInt(newConfig.queueLimit) || 0
    };
    
    // 保存配置到文件
    await fs.writeFile(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');
    
    // 重新连接数据库
    await reconnect();
    
    console.log('数据库配置更新成功');
    res.json({ code: 0, msg: '配置更新成功', data: currentConfig.database });
  } catch (error) {
    console.error('更新数据库配置失败:', error);
    res.status(500).json({ code: 1, msg: '配置更新失败', error: error.message });
  }
});

// 测试数据库连接
app.post('/api/test-database-connection', async (req, res) => {
  try {
    const config = req.body;
    console.log('测试数据库连接:', config);
    
    // 创建临时连接进行测试
    const mysql = require('mysql2/promise');
    const testPool = mysql.createPool({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: parseInt(config.port) || 3306,
      connectionLimit: 1,
      queueLimit: 0
    });
    
    // 测试连接
    const [rows] = await testPool.execute('SELECT 1 as test');
    await testPool.end();
    
    console.log('数据库连接测试成功');
    res.json({ code: 0, msg: '连接测试成功', data: rows });
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    res.status(500).json({ code: 1, msg: '连接测试失败', error: error.message });
  }
});

// 插入采购过磅记录
app.post('/api/purchase-weight', async (req, res) => {
  try {
    const record = req.body;
    console.log('收到保存请求:', record);
    
    if (!record.bill_no || !record.time) {
      console.log('缺少必填字段:', { bill_no: record.bill_no, time: record.time });
      return res.status(400).json({ code: 1, msg: 'bill_no 和 time 必填' });
    }
    
    console.log('开始插入数据库...');
    const insertId = await insertPurchaseWeightRecord(record);
    console.log('插入成功，ID:', insertId);
    
    res.json({ code: 0, msg: '插入成功', data: { id: insertId } });
  } catch (err) {
    console.error('保存失败:', err);
    res.status(500).json({ code: 1, msg: '数据库插入失败', error: err.message });
  }
});

// 更新采购过磅记录
app.put('/api/purchase-weight/:billNo', async (req, res) => {
  try {
    const { billNo } = req.params;
    const record = req.body;
    console.log('收到更新请求，单据号:', billNo, '数据:', record);
    
    if (!billNo) {
      return res.status(400).json({ code: 1, msg: '单据号必填' });
    }
    
    if (!record.time) {
      return res.status(400).json({ code: 1, msg: '时间必填' });
    }
    
    console.log('开始更新数据库记录...');
    const result = await updateRecord(billNo, record);
    
    if (typeof result === 'number') {
      // 插入操作，返回插入ID
      console.log('插入成功，ID:', result);
      res.json({ code: 0, msg: '插入成功', data: { id: result } });
    } else if (result === true) {
      // 更新操作成功
      console.log('更新成功');
      res.json({ code: 0, msg: '更新成功' });
    } else {
      // 操作失败
      console.log('操作失败');
      res.status(404).json({ code: 1, msg: '操作失败' });
    }
  } catch (err) {
    console.error('更新失败:', err);
    res.status(500).json({ code: 1, msg: '数据库操作失败', error: err.message });
  }
});

// 删除采购过磅记录
app.delete('/api/purchase-weight/:billNo', async (req, res) => {
  try {
    const { billNo } = req.params;
    console.log('收到删除请求，单据号:', billNo);
    
    if (!billNo) {
      return res.status(400).json({ code: 1, msg: '单据号必填' });
    }
    
    console.log('开始删除数据库记录...');
    const success = await deleteRecord(billNo);
    
    if (success) {
      console.log('删除成功');
      res.json({ code: 0, msg: '删除成功' });
    } else {
      console.log('删除失败，记录不存在');
      res.status(404).json({ code: 1, msg: '记录不存在' });
    }
  } catch (err) {
    console.error('删除失败:', err);
    res.status(500).json({ code: 1, msg: '数据库删除失败', error: err.message });
  }
});

// 查询所有未删除的记录
app.get('/api/purchase-weight', async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    
    let records;
    if (startTime && endTime) {
      // 按时间范围查询
      records = await getRecordsByTimeRange(startTime, endTime);
    } else {
      // 查询所有记录
      records = await getAllActiveRecords();
    }
    
    res.json({ 
      code: 0, 
      msg: '查询成功', 
      data: records 
    });
  } catch (err) {
    res.status(500).json({ code: 1, msg: '数据库查询失败', error: err.message });
  }
});

// 查询所有已归档的记录
app.get('/api/purchase-weight-archived', async (req, res) => {
  try {
    const records = await getAllArchivedRecords();
    res.json({ code: 0, msg: '查询成功', data: records });
  } catch (err) {
    res.status(500).json({ code: 1, msg: '数据库查询失败', error: err.message });
  }
});

// 更新付款状态
app.put('/api/purchase-weight-payment/:billNo', async (req, res) => {
  try {
    const { billNo } = req.params;
    const { is_check } = req.body;
    console.log('收到付款状态更新请求，单据号:', billNo, '付款状态:', is_check);
    
    if (!billNo) {
      return res.status(400).json({ code: 1, msg: '单据号必填' });
    }
    
    if (is_check === undefined || is_check === null) {
      return res.status(400).json({ code: 1, msg: '付款状态必填' });
    }
    
    console.log('开始更新付款状态...');
    const success = await updatePaymentStatus(billNo, is_check);
    
    if (success) {
      console.log('付款状态更新成功');
      res.json({ code: 0, msg: '付款状态更新成功' });
    } else {
      console.log('付款状态更新失败，记录不存在');
      res.status(404).json({ code: 1, msg: '记录不存在' });
    }
  } catch (err) {
    console.error('付款状态更新失败:', err);
    res.status(500).json({ code: 1, msg: '数据库更新失败', error: err.message });
  }
});

// 根据卡号查询采购过磅记录
app.get('/api/purchase-weight-by-card/:cardNo', async (req, res) => {
  try {
    const { cardNo } = req.params;
    console.log('收到卡号查询请求，卡号:', cardNo);
    
    if (!cardNo) {
      return res.status(400).json({ code: 1, msg: '卡号必填' });
    }
    
    console.log('开始查询卡号对应的记录...');
    const records = await getRecordsByCardNo(cardNo);
    
    console.log('查询结果:', records.length, '条记录');
    res.json({ 
      code: 0, 
      msg: '查询成功', 
      data: records 
    });
  } catch (err) {
    console.error('卡号查询失败:', err);
    res.status(500).json({ code: 1, msg: '数据库查询失败', error: err.message });
  }
});

// ========== 首页统计接口 ==========

// 获取首页统计数据
app.get('/api/home-statistics', async (req, res) => {
  try {
    console.log('收到首页统计数据请求');
    const statistics = await getHomeStatistics();
    
    console.log('首页统计数据:', statistics);
    res.json({ 
      code: 0, 
      msg: '获取统计数据成功', 
      data: statistics 
    });
  } catch (err) {
    console.error('获取首页统计数据失败:', err);
    res.status(500).json({ code: 1, msg: '获取统计数据失败', error: err.message });
  }
});

// 获取图表数据
app.get('/api/chart-data', async (req, res) => {
  try {
    console.log('收到图表数据请求');
    const chartData = await getChartData();
    
    console.log('图表数据:', chartData);
    res.json({ 
      code: 0, 
      msg: '获取图表数据成功', 
      data: chartData 
    });
  } catch (err) {
    console.error('获取图表数据失败:', err);
    res.status(500).json({ code: 1, msg: '获取图表数据失败', error: err.message });
  }
});

// ========== 卡号管理接口 ==========

// 获取所有卡号
app.get('/api/cards', async (req, res) => {
  try {
    const cards = await getAllCards();
    res.json({ code: 0, msg: '查询成功', data: cards });
  } catch (err) {
    console.error('查询卡号失败:', err);
    res.status(500).json({ code: 1, msg: '查询卡号失败', error: err.message });
  }
});

// 根据ID获取卡号
app.get('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const card = await getCardById(id);
    
    if (!card) {
      return res.status(404).json({ code: 1, msg: '卡号不存在' });
    }
    
    res.json({ code: 0, msg: '查询成功', data: card });
  } catch (err) {
    console.error('查询卡号失败:', err);
    res.status(500).json({ code: 1, msg: '查询卡号失败', error: err.message });
  }
});

// 添加单个卡号
app.post('/api/cards', async (req, res) => {
  try {
    const { card_number, description } = req.body;
    
    if (!card_number) {
      return res.status(400).json({ code: 1, msg: '卡号必填' });
    }
    
    const insertId = await insertCard({ card_number, description });
    res.json({ code: 0, msg: '添加成功', data: { id: insertId } });
  } catch (err) {
    console.error('添加卡号失败:', err);
    if (err.message === '卡号已存在') {
      res.status(400).json({ code: 1, msg: '卡号已存在' });
    } else {
      res.status(500).json({ code: 1, msg: '添加卡号失败', error: err.message });
    }
  }
});

// 批量添加卡号
app.post('/api/cards/batch', async (req, res) => {
  try {
    const { cards } = req.body;
    
    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ code: 1, msg: '卡号列表不能为空' });
    }
    
    // 验证数据格式
    for (const card of cards) {
      if (!card.card_number) {
        return res.status(400).json({ code: 1, msg: '卡号必填' });
      }
    }
    
    const results = await batchInsertCards(cards);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    res.json({ 
      code: 0, 
      msg: `批量添加完成，成功${successCount}个，失败${failCount}个`, 
      data: { results, successCount, failCount } 
    });
  } catch (err) {
    console.error('批量添加卡号失败:', err);
    res.status(500).json({ code: 1, msg: '批量添加卡号失败', error: err.message });
  }
});

// 更新卡号
app.put('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { card_number, description } = req.body;
    
    if (!card_number) {
      return res.status(400).json({ code: 1, msg: '卡号必填' });
    }
    
    await updateCard(id, { card_number, description });
    res.json({ code: 0, msg: '更新成功' });
  } catch (err) {
    console.error('更新卡号失败:', err);
    if (err.message === '卡号已被其他记录使用') {
      res.status(400).json({ code: 1, msg: '卡号已被其他记录使用' });
    } else if (err.message === '卡号记录不存在') {
      res.status(404).json({ code: 1, msg: '卡号记录不存在' });
    } else {
      res.status(500).json({ code: 1, msg: '更新卡号失败', error: err.message });
    }
  }
});

// 删除卡号
app.delete('/api/cards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteCard(id);
    
    if (success) {
      res.json({ code: 0, msg: '删除成功' });
    } else {
      res.status(404).json({ code: 1, msg: '卡号记录不存在' });
    }
  } catch (err) {
    console.error('删除卡号失败:', err);
    res.status(500).json({ code: 1, msg: '删除卡号失败', error: err.message });
  }
});

// ==================== 销售系统接口 ====================

// 添加销售记录
app.post('/api/sales-weight', async (req, res) => {
  try {
    const record = req.body;
    console.log('收到销售记录添加请求:', record);
    
    // 验证必填字段
    if (!record.bill_no || !record.time || !record.customer) {
      return res.status(400).json({ code: 1, msg: '单据号、时间、销售方必填' });
    }
    
    const insertId = await insertSalesWeightRecord(record);
    res.json({ code: 0, msg: '添加成功', data: { id: insertId } });
  } catch (err) {
    console.error('添加销售记录失败:', err);
    res.status(500).json({ code: 1, msg: '添加销售记录失败', error: err.message });
  }
});

// 更新销售记录
app.put('/api/sales-weight/:billNo', async (req, res) => {
  try {
    const { billNo } = req.params;
    const record = req.body;
    console.log('收到销售记录更新请求:', billNo, record);
    
    const success = await updateSalesRecord(billNo, record);
    if (success) {
      res.json({ code: 0, msg: '更新成功' });
    } else {
      res.status(404).json({ code: 1, msg: '销售记录不存在' });
    }
  } catch (err) {
    console.error('更新销售记录失败:', err);
    res.status(500).json({ code: 1, msg: '更新销售记录失败', error: err.message });
  }
});

// 删除销售记录
app.delete('/api/sales-weight/:billNo', async (req, res) => {
  try {
    const { billNo } = req.params;
    console.log('收到销售记录删除请求:', billNo);
    
    const success = await deleteSalesRecord(billNo);
    if (success) {
      res.json({ code: 0, msg: '删除成功' });
    } else {
      res.status(404).json({ code: 1, msg: '销售记录不存在' });
    }
  } catch (err) {
    console.error('删除销售记录失败:', err);
    res.status(500).json({ code: 1, msg: '删除销售记录失败', error: err.message });
  }
});

// 查询所有销售记录
app.get('/api/sales-weight', async (req, res) => {
  try {
    const records = await getAllActiveSalesRecords();
    res.json({ code: 0, msg: '查询成功', data: records });
  } catch (err) {
    console.error('查询销售记录失败:', err);
    res.status(500).json({ code: 1, msg: '查询销售记录失败', error: err.message });
  }
});

// 查询已归档的销售记录
app.get('/api/sales-weight-archived', async (req, res) => {
  try {
    const records = await getAllArchivedSalesRecords();
    res.json({ code: 0, msg: '查询成功', data: records });
  } catch (err) {
    console.error('查询归档销售记录失败:', err);
    res.status(500).json({ code: 1, msg: '查询归档销售记录失败', error: err.message });
  }
});

// 更新销售记录收款状态
app.put('/api/sales-weight-payment/:billNo', async (req, res) => {
  try {
    const { billNo } = req.params;
    const { is_check } = req.body;
    console.log('收到销售收款状态更新请求:', billNo, is_check);
    
    const success = await updateSalesPaymentStatus(billNo, is_check);
    if (success) {
      res.json({ code: 0, msg: '收款状态更新成功' });
    } else {
      res.status(404).json({ code: 1, msg: '销售记录不存在' });
    }
  } catch (err) {
    console.error('更新销售收款状态失败:', err);
    res.status(500).json({ code: 1, msg: '更新销售收款状态失败', error: err.message });
  }
});

// 根据卡号查询销售记录
app.get('/api/sales-weight-by-card/:cardNo', async (req, res) => {
  try {
    const { cardNo } = req.params;
    const { is_archived = 0 } = req.query;
    console.log('收到销售记录卡号查询请求:', cardNo, '归档状态:', is_archived);
    
    const records = await getSalesRecordsByCardNo(cardNo, parseInt(is_archived));
    res.json({ code: 0, msg: '查询成功', data: records });
  } catch (err) {
    console.error('根据卡号查询销售记录失败:', err);
    res.status(500).json({ code: 1, msg: '根据卡号查询销售记录失败', error: err.message });
  }
});

// 获取销售统计信息
app.get('/api/sales-statistics', async (req, res) => {
  try {
    const statistics = await getSalesStatistics();
    res.json({ code: 0, msg: '查询成功', data: statistics });
  } catch (err) {
    console.error('查询销售统计失败:', err);
    res.status(500).json({ code: 1, msg: '查询销售统计失败', error: err.message });
  }
});

// 获取销售图表数据
app.get('/api/sales-chart-data', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const chartData = await getSalesChartData(parseInt(days));
    res.json({ code: 0, msg: '查询成功', data: chartData });
  } catch (err) {
    console.error('查询销售图表数据失败:', err);
    res.status(500).json({ code: 1, msg: '查询销售图表数据失败', error: err.message });
  }
});

app.listen(port, () => {
  console.log(`采购过磅服务已启动，端口: ${port}`);
});