const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { insertPurchaseWeightRecord } = require('./purchaseWeightService');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

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

app.listen(port, () => {
  console.log(`采购过磅服务已启动，端口: ${port}`);
});