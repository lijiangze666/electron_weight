const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { insertPurchaseWeightRecord, getAllActiveRecords, getRecordsByTimeRange, deleteRecord, updateRecord, getAllArchivedRecords } = require('./purchaseWeightService');
const { insertCard, updateCard, deleteCard, getAllCards, getCardById, batchInsertCards } = require('./cardService');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

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

app.listen(port, () => {
  console.log(`采购过磅服务已启动，端口: ${port}`);
});