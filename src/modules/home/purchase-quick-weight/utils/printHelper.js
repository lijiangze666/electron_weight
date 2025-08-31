const { runPythonScript } = require('./printer');

/**
 * 将打印数据转换为Base64编码并调用打印脚本
 * @param {Object} printData - 要打印的数据对象
 * @param {function} callback - 回调函数 (err, stdout)
 */
function printRecord(printData, callback) {
  try {
    // 将JSON对象转换为Base64编码
    const jsonString = JSON.stringify(printData);
    const base64Data = Buffer.from(jsonString).toString('base64');
    
    console.log('🔄 转换打印数据:', JSON.stringify(printData, null, 2));
    console.log('📤 Base64编码:', base64Data);
    
    // 调用打印脚本
    runPythonScript(base64Data, callback);
  } catch (error) {
    console.error('❌ 数据转换失败:', error.message);
    if (callback) {
      callback(error);
    }
  }
}

/**
 * 将应用内的记录数据转换为打印脚本需要的格式
 * @param {Object} record - 应用内的记录对象
 * @returns {Object} - 打印脚本需要的数据格式
 */
function convertRecordForPrint(record) {
  return {
    bill_no: record.id,
    print_time: record.time || new Date().toLocaleString('zh-CN'),
    item: record.item,
    gross_weight: `${record.maozhong}kg`,
    tare_weight: `${record.pizhong || 0}kg`,
    net_weight: `${record.jingzhong}kg`,
    price: String(record.price || 0),
    amount: String(record.amount || 0),
    supplier: record.supplier,
    unit: record.unit,
    card_no: record.card_no || ''
  };
}

module.exports = {
  printRecord,
  convertRecordForPrint
};
