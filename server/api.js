const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { insertPurchaseWeightRecord, getAllActiveRecords, getRecordsByTimeRange } = require('./purchaseWeightService');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// 插入采购过磅记录
app.post('/api/purchase-weight', async (req, res) => {
  try {
    const record = req.body;
    if (!record.bill_no || !record.time) {
      return res.status(400).json({ code: 1, msg: 'bill_no 和 time 必填' });
    }
    const insertId = await insertPurchaseWeightRecord(record);
    res.json({ code: 0, msg: '插入成功', data: { id: insertId } });
  } catch (err) {
    res.status(500).json({ code: 1, msg: '数据库插入失败', error: err.message });
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

app.listen(port, () => {
  console.log(`采购过磅服务已启动，端口: ${port}`);
});