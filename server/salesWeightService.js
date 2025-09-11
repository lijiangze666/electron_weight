// salesWeightService.js
const { getPool } = require('./db');

async function insertSalesWeightRecord(record) {
  try {
    console.log('准备插入销售数据:', record);
    
    const pool = getPool();
    const sql = `
      INSERT INTO sales_weight_records
      (bill_no, time, customer, item, net_weight, tare_weight, gross_weight, unit, price, amount, card_no, is_deleted, is_check)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      record.bill_no,
      record.time,
      record.customer,
      record.item,
      record.net_weight,
      record.tare_weight,
      record.gross_weight,
      record.unit || '公斤',
      record.price,
      record.amount,
      record.card_no || null,
      record.is_deleted || 0,
      record.is_check || 0
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

// 查询所有未删除且未归档的销售记录
async function getAllActiveSalesRecords() {
  const sql = `
    SELECT 
      id,
      bill_no,
      time,
      customer,
      item,
      net_weight,
      tare_weight,
      gross_weight,
      unit,
      price,
      amount,
      card_no,
      is_deleted,
      is_archived,
      is_check
    FROM sales_weight_records 
    WHERE is_deleted = 0 AND is_archived = 0
    ORDER BY time DESC
  `;
  const pool = getPool();
  const [rows] = await pool.execute(sql);
  return rows;
}

// 根据时间范围查询销售记录（未归档）
async function getSalesRecordsByTimeRange(startTime, endTime) {
  const sql = `
    SELECT 
      id,
      bill_no,
      time,
      customer,
      item,
      net_weight,
      tare_weight,
      gross_weight,
      unit,
      price,
      amount,
      card_no,
      is_deleted,
      is_archived,
      is_check
    FROM sales_weight_records 
    WHERE is_deleted = 0 AND is_archived = 0
    AND time >= ? 
    AND time <= ?
    ORDER BY time DESC
  `;
  const pool = getPool();
  const [rows] = await pool.execute(sql, [startTime, endTime]);
  return rows;
}

// 删除销售记录（软删除，设置is_deleted为1）
async function deleteSalesRecord(billNo) {
  const sql = `
    UPDATE sales_weight_records 
    SET is_deleted = 1 
    WHERE bill_no = ?
  `;
  const pool = getPool();
  const [result] = await pool.execute(sql, [billNo]);
  return result.affectedRows > 0;
}

// 更新销售记录
async function updateSalesRecord(billNo, record) {
  try {
    console.log('准备更新销售数据:', billNo, record);
    
    const pool = getPool();
    const sql = `
      UPDATE sales_weight_records 
      SET 
        time = ?,
        customer = ?,
        item = ?,
        net_weight = ?,
        tare_weight = ?,
        gross_weight = ?,
        unit = ?,
        price = ?,
        amount = ?,
        card_no = ?,
        is_deleted = ?,
        is_check = ?
      WHERE bill_no = ?
    `;
    const values = [
      record.time,
      record.customer,
      record.item,
      record.net_weight,
      record.tare_weight,
      record.gross_weight,
      record.unit || '公斤',
      record.price,
      record.amount,
      record.card_no || null,
      record.is_deleted || 0,
      record.is_check || 0,
      billNo
    ];
    
    console.log('更新SQL参数:', values);
    
    const [result] = await pool.execute(sql, values);
    console.log('数据库更新结果:', result);
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('数据库更新错误:', error);
    throw error;
  }
}

// 查询所有已归档的销售记录
async function getAllArchivedSalesRecords() {
  const sql = `
    SELECT 
      id,
      bill_no,
      time,
      customer,
      item,
      net_weight,
      tare_weight,
      gross_weight,
      unit,
      price,
      amount,
      card_no,
      is_deleted,
      is_archived,
      is_check
    FROM sales_weight_records 
    WHERE is_deleted = 0 AND is_archived = 1
    ORDER BY time DESC
  `;
  const pool = getPool();
  const [rows] = await pool.execute(sql);
  return rows;
}

// 更新销售记录付款状态
async function updateSalesPaymentStatus(billNo, isCheck) {
  const sql = `
    UPDATE sales_weight_records 
    SET is_check = ? 
    WHERE bill_no = ?
  `;
  const pool = getPool();
  const [result] = await pool.execute(sql, [isCheck, billNo]);
  return result.affectedRows > 0;
}

// 根据卡号查询销售记录
async function getSalesRecordsByCardNo(cardNo, isArchived = 0) {
  const sql = `
    SELECT 
      id,
      bill_no,
      time,
      customer,
      item,
      net_weight,
      tare_weight,
      gross_weight,
      unit,
      price,
      amount,
      card_no,
      is_deleted,
      is_archived,
      is_check
    FROM sales_weight_records 
    WHERE is_deleted = 0 
    AND is_archived = ?
    AND card_no = ?
    ORDER BY time DESC
  `;
  const pool = getPool();
  const [rows] = await pool.execute(sql, [isArchived, cardNo]);
  return rows;
}

// 获取销售统计信息
async function getSalesStatistics() {
  const sql = `
    SELECT 
      COUNT(*) as total_records,
      SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived_count,
      SUM(CASE WHEN is_archived = 0 THEN 1 ELSE 0 END) as active_count,
      SUM(CASE WHEN is_archived = 1 THEN net_weight ELSE 0 END) as total_net_weight,
      SUM(CASE WHEN is_archived = 1 THEN amount ELSE 0 END) as total_amount,
      SUM(CASE WHEN is_archived = 1 AND is_check = 1 THEN amount ELSE 0 END) as paid_amount,
      SUM(CASE WHEN is_archived = 1 AND is_check = 0 THEN amount ELSE 0 END) as unpaid_amount
    FROM sales_weight_records 
    WHERE is_deleted = 0
  `;
  const pool = getPool();
  const [rows] = await pool.execute(sql);
  return rows[0];
}

// 获取销售图表数据
async function getSalesChartData(days = 30) {
  const sql = `
    SELECT 
      DATE(time) as date,
      COUNT(*) as record_count,
      SUM(net_weight) as total_net_weight,
      SUM(amount) as total_amount
    FROM sales_weight_records 
    WHERE is_deleted = 0 
    AND is_archived = 1
    AND time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(time)
    ORDER BY date DESC
  `;
  const pool = getPool();
  const [rows] = await pool.execute(sql, [days]);
  return rows;
}

module.exports = {
  insertSalesWeightRecord,
  getAllActiveSalesRecords,
  getSalesRecordsByTimeRange,
  deleteSalesRecord,
  updateSalesRecord,
  getAllArchivedSalesRecords,
  updateSalesPaymentStatus,
  getSalesRecordsByCardNo,
  getSalesStatistics,
  getSalesChartData
};
