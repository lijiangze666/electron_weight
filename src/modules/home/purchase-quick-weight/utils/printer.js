const { spawn } = require('child_process');
const path = require('path');

/**
 * 调用 Python 脚本
 * @param {string} pythonArg - 动态参数，传给 Python 脚本
 * @param {function} callback - 可选，脚本执行完后的回调 (err, stdout)
 */
function runPythonScript(pythonArg, callback) {
  // Python 脚本所在目录
  const scriptDir = path.join(process.cwd(), "public", "printer_sdk");
  const pythonExe = path.join(scriptDir, "python.exe");
  const scriptPath = path.join(scriptDir, "main.py");

  const pythonProcess = spawn(pythonExe, [scriptPath, pythonArg], {
    cwd: scriptDir, // 设置当前工作目录
    shell: true     // Windows 下执行 .\python.exe 需要 shell
  });

  let stdoutData = '';
  let stderrData = '';

  // 监听标准输出
  pythonProcess.stdout.on('data', (data) => {
    stdoutData += data.toString();
    console.log(`stdout: ${data.toString()}`);
  });

  // 监听错误输出
  pythonProcess.stderr.on('data', (data) => {
    stderrData += data.toString();
    console.error(`stderr: ${data.toString()}`);
  });

  // 监听子进程退出
  pythonProcess.on('close', (code) => {
    if (callback) {
      if (code === 0) {
        callback(null, stdoutData);
      } else {
        callback(new Error(`Python 脚本退出码 ${code}\n${stderrData}`));
      }
    }
  });
}

// 导出方法，供其他模块调用
module.exports = { runPythonScript };
