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

// 删除记录（软删除，设置is_deleted为1）
async function deleteRecord(billNo) {
  const sql = `
    UPDATE purchase_weight_records 
    SET is_deleted = 1 
    WHERE bill_no = ?
  `;
  const [result] = await pool.execute(sql, [billNo]);
  return result.affectedRows > 0;
}

// 更新记录（如果不存在则插入）
async function updateRecord(billNo, record) {
  // 先检查记录是否存在
  const checkSql = `SELECT id FROM purchase_weight_records WHERE bill_no = ?`;
  const [checkResult] = await pool.execute(checkSql, [billNo]);
  
  if (checkResult.length === 0) {
    // 记录不存在，执行插入
    console.log('【记录不存在，执行插入】');
    return await insertPurchaseWeightRecord(record);
  } else {
    // 记录存在，执行更新
    const sql = `
      UPDATE purchase_weight_records 
      SET 
        time = ?,
        supplier = ?,
        item = ?,
        maozhong = ?,
        pizhong = ?,
        jingzhong = ?,
        unit = ?,
        price = ?,
        amount = ?,
        is_deleted = 0
      WHERE bill_no = ?
    `;
    const values = [
      record.time,
      record.supplier,
      record.item,
      record.maozhong,
      record.pizhong,
      record.jingzhong,
      record.unit,
      record.price,
      record.amount,
      billNo
    ];
    
    console.log('【更新SQL】:', sql);
    console.log('【参数】:', values);
    const [result] = await pool.execute(sql, values);
    console.log('【影响行数】:', result.affectedRows);
    return result.affectedRows > 0;
  }
}

module.exports = { 
  insertPurchaseWeightRecord,
  getAllActiveRecords,
  getRecordsByTimeRange,
  deleteRecord,
  updateRecord
};
