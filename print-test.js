const { printRecord, convertRecordForPrint } = require('./src/modules/home/purchase-quick-weight/utils/printHelper');

// 模拟应用内的记录数据
const sampleRecord = {
  id: "B20250827001",
  time: "2025-08-27 15:32:10",
  supplier: "测试供应商",
  item: "dami",
  maozhong: 100,
  pizhong: 5,
  jingzhong: 95,
  unit: "kg",
  price: 3.50,
  amount: 332.50,
  card_no: "12345"
};

console.log('🧪 测试打印功能');
console.log('📋 原始记录数据:', JSON.stringify(sampleRecord, null, 2));

// 转换数据格式
const printData = convertRecordForPrint(sampleRecord);
console.log('🔄 转换后的打印数据:', JSON.stringify(printData, null, 2));

// 执行打印
printRecord(printData, (error, result) => {
  if (error) {
    console.error('❌ 打印失败:', error.message);
    process.exit(1);
  } else {
    console.log('✅ 打印成功!');
    if (result && result.trim()) {
      console.log('📤 返回结果:', result.trim());
    }
    process.exit(0);
  }
});
