const { exec } = require('child_process');
const path = require('path');

/**
 * 调用 Python 脚本
 * @param {string} pythonArg - 动态参数，传给 Python 脚本（Base64编码的JSON字符串）
 * @param {function} callback - 可选，脚本执行完后的回调 (err, stdout)
 */
function runPythonScript(pythonArg, callback) {
  // Python 脚本所在目录
  const scriptDir = path.join(process.cwd(), "public", "printer_sdk");
  
  // 构造命令：.\python.exe .\main.py [base64编码的参数]
  const command = `.\\python.exe .\\main.py ${pythonArg}`;
  
  console.log(`执行命令: ${command}`);
  console.log(`工作目录: ${scriptDir}`);

  // 执行命令
  exec(command, {
    cwd: scriptDir, // 设置当前工作目录为 printer_sdk
    shell: true     // Windows 下需要 shell
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`执行错误: ${error.message}`);
      if (callback) {
        callback(error);
      }
      return;
    }

    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }

    if (stdout) {
      console.log(`stdout: ${stdout}`);
    }

    if (callback) {
      if (stderr && !stdout) {
        // 如果有错误输出但没有正常输出，视为错误
        callback(new Error(stderr));
      } else {
        // 成功执行
        callback(null, stdout);
      }
    }
  });
}

// 导出方法，供其他模块调用
module.exports = { runPythonScript };
