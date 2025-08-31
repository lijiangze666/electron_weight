const { runPythonScript } = require('./src/modules/home/purchase-quick-weight/utils/printer');

// 测试用的Base64编码数据（就是您提供的示例）
const testBase64Data = "eyJiaWxsX25vIjogIkIyMDI1MDgyNzAwMSIsICJwcmludF90aW1lIjogIjIwMjUtMDgtMjcgMTU6MzI6MTAiLCAiaXRlbSI6ICJkYW1pIiwgImdyb3NzX3dlaWdodCI6ICIxMDBrZyIsICJ0YXJlX3dlaWdodCI6ICI1a2ciLCAibmV0X3dlaWdodCI6ICI5NWtnIiwgInByaWNlIjogIjMuNTAiLCAiYW1vdW50IjogIjMzMi41MCJ9";

// 解码显示原始数据（仅用于调试查看）
try {
  const originalData = JSON.parse(Buffer.from(testBase64Data, 'base64').toString());
  console.log('📄 原始数据 (解码后):', JSON.stringify(originalData, null, 2));
} catch (e) {
  console.log('⚠️  无法解码Base64数据');
}

console.log('🖨️  开始测试打印功能...');
console.log('📤 Base64编码数据:', testBase64Data);

runPythonScript(testBase64Data, (error, result) => {
  if (error) {
    console.error('❌ 打印失败:', error.message);
    process.exit(1);
  } else {
    console.log('✅ 打印成功!');
    if (result && result.trim()) {
      console.log('📤 Python脚本返回:', result.trim());
    }
    process.exit(0);
  }
});
