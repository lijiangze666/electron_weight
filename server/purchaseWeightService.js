// purchaseWeightService.js
const { getPool } = require('./db');

async function insertPurchaseWeightRecord(record) {
  try {
    console.log('准备插入数据:', record);
    
    const pool = getPool();
    const sql = `
      INSERT INTO purchase_weight_records
      (bill_no, time, supplier, item, maozhong, pizhong, jingzhong, unit, price, amount, card_no, is_deleted, is_check)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

// 查询所有未删除且未归档的记录
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
      card_no,
      is_deleted,
      is_archived,
      is_check
    FROM purchase_weight_records 
    WHERE is_deleted = 0 AND is_archived = 0
    ORDER BY time DESC
  `;
  const pool = getPool();
  const [rows] = await pool.execute(sql);
  return rows;
}

// 根据时间范围查询记录（未归档）
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
      card_no,
      is_deleted,
      is_archived,
      is_check
    FROM purchase_weight_records 
    WHERE is_deleted = 0 AND is_archived = 0
    AND time >= ? 
    AND time <= ?
    ORDER BY time DESC
  `;
  const pool = getPool();
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
  const pool = getPool();
  const [result] = await pool.execute(sql, [billNo]);
  return result.affectedRows > 0;
}

// 更新记录（如果不存在则插入）
async function updateRecord(billNo, record) {
  // 先检查记录是否存在
  const checkSql = `SELECT id FROM purchase_weight_records WHERE bill_no = ?`;
  const pool = getPool();
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
        card_no = ?,
        is_deleted = 0,
        is_archived = ?,
        is_check = ?
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
      record.card_no || null,
      record.is_archived ?? 0,
      record.is_check ?? 0,
      billNo
    ];
    
    console.log('【更新SQL】:', sql);
    console.log('【参数】:', values);
    const pool = getPool();
    const [result] = await pool.execute(sql, values);
    console.log('【影响行数】:', result.affectedRows);
    return result.affectedRows > 0;
  }
}

// 查询所有已归档的记录
async function getAllArchivedRecords() {
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
      card_no,
      is_deleted,
      is_archived,
      is_check
    FROM purchase_weight_records 
    WHERE is_deleted = 0 AND is_archived = 1
    ORDER BY time DESC
  `;
  const pool = getPool();
  const [rows] = await pool.execute(sql);
  return rows;
}

// 更新付款状态
async function updatePaymentStatus(billNo, isCheck) {
  const sql = `
    UPDATE purchase_weight_records 
    SET is_check = ? 
    WHERE bill_no = ?
  `;
  const pool = getPool();
  const [result] = await pool.execute(sql, [isCheck, billNo]);
  return result.affectedRows > 0;
}

// 根据卡号查询记录
async function getRecordsByCardNo(cardNo) {
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
      card_no,
      is_deleted,
      is_archived,
      is_check
    FROM purchase_weight_records 
    WHERE card_no = ? AND is_deleted = 0
    ORDER BY time DESC
  `;
  const pool = getPool();
  const [rows] = await pool.execute(sql, [cardNo]);
  return rows;
}

// 获取图表数据
async function getChartData() {
  try {
    const pool = getPool();
    
    // 获取近7天的过磅量趋势数据
    const [weeklyTrendResult] = await pool.execute(`
      SELECT 
        DATE(time) as date,
        COUNT(*) as count,
        COALESCE(SUM(jingzhong), 0) as total_weight
      FROM purchase_weight_records 
      WHERE DATE(time) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND is_deleted = 0
      GROUP BY DATE(time)
      ORDER BY DATE(time) ASC
    `);
    
    // 获取每月采购对比数据（最近6个月）
    const [monthlyComparisonResult] = await pool.execute(`
      SELECT 
        DATE_FORMAT(time, '%Y-%m') as month,
        COUNT(*) as purchase_count,
        COALESCE(SUM(jingzhong), 0) as purchase_weight,
        0 as sales_count,
        0 as sales_weight
      FROM purchase_weight_records 
      WHERE time >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        AND is_deleted = 0
      GROUP BY DATE_FORMAT(time, '%Y-%m')
      ORDER BY month ASC
    `);
    
    // 获取供应商分布数据（前10名）
    const [supplierDistributionResult] = await pool.execute(`
      SELECT 
        supplier,
        COUNT(*) as count,
        COALESCE(SUM(jingzhong), 0) as total_weight
      FROM purchase_weight_records 
      WHERE is_deleted = 0 
        AND supplier IS NOT NULL 
        AND supplier != ''
      GROUP BY supplier
      ORDER BY total_weight DESC
      LIMIT 10
    `);
    
    // 处理近7天数据，确保每天都有数据（没有数据的天数填充0）
    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existingData = weeklyTrendResult.find(item => item.date === dateStr);
      last7Days.push({
        date: dateStr,
        day: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        count: existingData ? existingData.count : 0,
        weight: existingData ? Math.round(existingData.total_weight / 1000 * 100) / 100 : 0
      });
    }
    
    // 处理月度对比数据
    const monthlyData = monthlyComparisonResult.map(item => ({
      month: item.month,
      monthName: new Date(item.month + '-01').toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' }),
      purchaseCount: item.purchase_count,
      purchaseWeight: Math.round(item.purchase_weight / 1000 * 100) / 100,
      salesCount: 0, // 暂时没有销售数据
      salesWeight: 0
    }));
    
    // 处理供应商分布数据
    const supplierData = supplierDistributionResult.map(item => ({
      name: item.supplier,
      count: item.count,
      weight: Math.round(item.total_weight / 1000 * 100) / 100
    }));
    
    return {
      weeklyTrend: last7Days,
      monthlyComparison: monthlyData,
      supplierDistribution: supplierData
    };
  } catch (error) {
    console.error('获取图表数据失败:', error);
    throw error;
  }
}

// 获取首页统计数据
async function getHomeStatistics() {
  try {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0]; // 今天的日期 YYYY-MM-DD
    
    // 今日过磅总数
    const [todayCountResult] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM purchase_weight_records 
      WHERE DATE(time) = ? AND is_deleted = 0
    `, [today]);
    
    // 今日采购总量（净重）
    const [todayPurchaseResult] = await pool.execute(`
      SELECT COALESCE(SUM(jingzhong), 0) as total
      FROM purchase_weight_records 
      WHERE DATE(time) = ? AND is_deleted = 0 AND jingzhong IS NOT NULL
    `, [today]);
    
    // 今日车辆数（去重）
    const [todayVehicleResult] = await pool.execute(`
      SELECT COUNT(DISTINCT supplier) as count
      FROM purchase_weight_records 
      WHERE DATE(time) = ? AND is_deleted = 0 AND supplier IS NOT NULL AND supplier != ''
    `, [today]);
    
    // 今日异常数（假设净重为0或负数为异常）
    const [todayAbnormalResult] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM purchase_weight_records 
      WHERE DATE(time) = ? AND is_deleted = 0 AND (jingzhong <= 0 OR jingzhong IS NULL)
    `, [today]);
    
    // 供应商总数
    const [supplierCountResult] = await pool.execute(`
      SELECT COUNT(DISTINCT supplier) as count
      FROM purchase_weight_records 
      WHERE is_deleted = 0 AND supplier IS NOT NULL AND supplier != ''
    `);
    
    // 累计采购总量
    const [totalPurchaseResult] = await pool.execute(`
      SELECT COALESCE(SUM(jingzhong), 0) as total
      FROM purchase_weight_records 
      WHERE is_deleted = 0 AND jingzhong IS NOT NULL
    `);
    
    // 最新过磅记录（最近5条）
    const [latestRecordsResult] = await pool.execute(`
      SELECT 
        TIME_FORMAT(time, '%H:%i') as time,
        supplier,
        item,
        jingzhong
      FROM purchase_weight_records 
      WHERE is_deleted = 0
      ORDER BY time DESC 
      LIMIT 5
    `);
    
    return {
      todayCount: todayCountResult[0].count,
      todayPurchase: Math.round(todayPurchaseResult[0].total / 1000 * 100) / 100, // 转换为吨，保留2位小数
      todaySales: 0, // 暂时没有销售数据
      todayVehicles: todayVehicleResult[0].count,
      todayAbnormal: todayAbnormalResult[0].count,
      customerCount: 0, // 暂时没有客户数据
      supplierCount: supplierCountResult[0].count,
      totalPurchase: Math.round(totalPurchaseResult[0].total / 1000 * 100) / 100, // 转换为吨
      totalSales: 0, // 暂时没有销售数据
      latestRecords: latestRecordsResult.map(record => ({
        time: record.time,
        plate: record.supplier || '未知车辆',
        type: '采购',
        weight: record.jingzhong ? `${Math.round(record.jingzhong / 1000 * 100) / 100}吨` : '0吨'
      }))
    };
  } catch (error) {
    console.error('获取首页统计数据失败:', error);
    throw error;
  }
}

module.exports = {
  insertPurchaseWeightRecord,
  getAllActiveRecords,
  getRecordsByTimeRange,
  deleteRecord,
  updateRecord,
  getAllArchivedRecords,
  updatePaymentStatus,
  getRecordsByCardNo,
  getHomeStatistics,
  getChartData
};
