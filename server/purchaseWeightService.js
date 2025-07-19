// purchaseWeightService.js
const pool = require('./db');

async function insertPurchaseWeightRecord(record) {
  const sql = `
    INSERT INTO purchase_weight_records
    (bill_no, time, supplier, item, maozhong, pizhong, jingzhong, unit, price, amount, is_deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [
    record.bill_no,
    record.time,
    record.supplier,
    record.item,
    record.maozhong,
    record.pizhong,
    record.jingzhong,
    record.unit || '斤',
    record.price,
    record.amount,
    record.is_deleted || 0
  ];
  const [result] = await pool.execute(sql, values);
  return result.insertId;
}

module.exports = { insertPurchaseWeightRecord };
