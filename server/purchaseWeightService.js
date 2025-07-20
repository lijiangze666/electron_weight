// purchaseWeightService.js
const pool = require('./db');

async function insertPurchaseWeightRecord(record) {
  try {
    console.log('准备插入数据:', record);
    
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
    
    console.log('SQL参数:', values);
    
    const [result] = await pool.execute(sql, values);
    console.log('数据库插入结果:', result);
    
    return result.insertId;
  } catch (error) {
    console.error('数据库插入错误:', error);
    throw error;
  }
}

// 查询所有未删除的记录
async function getAllActiveRecords() {
  const sql = `
    SELECT 
      id,
      bill_no,
      time,
      supplier,
      item,
      maozhong,
      pizhong,
      jingzhong,
      unit,
      price,
      amount,
      is_deleted
    FROM purchase_weight_records 
    WHERE is_deleted = 0 
    ORDER BY time DESC
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

// 根据时间范围查询记录
async function getRecordsByTimeRange(startTime, endTime) {
  const sql = `
    SELECT 
      id,
      bill_no,
      time,
      supplier,
      item,
      maozhong,
      pizhong,
      jingzhong,
      unit,
      price,
      amount,
      is_deleted
    FROM purchase_weight_records 
    WHERE is_deleted = 0 
    AND time >= ? 
    AND time <= ?
    ORDER BY time DESC
  `;
  const [rows] = await pool.execute(sql, [startTime, endTime]);
  return rows;
}

module.exports = { 
  insertPurchaseWeightRecord,
  getAllActiveRecords,
  getRecordsByTimeRange
};
