// 从 electron 包中导入必要的模块：app(应用实例)、BrowserWindow(窗口类)、Menu(菜单类)
const { app, BrowserWindow, Menu, globalShortcut } = require("electron");
// 导入 Node.js 的 path 模块，用于处理文件路径
const path = require("path");
// 引入 serialport 包
const { SerialPort } = require("serialport");
// 引入 child_process 来启动后端服务
const { spawn } = require("child_process");
let serialPortInstance = null; // 用于保存串口实例

// 后端服务进程引用
let serverProcess = null;

// 启动后端服务
function startBackendServer() {
  const serverPath = path.join(__dirname, '../server/api.js');
  serverProcess = spawn('node', [serverPath], {
    stdio: 'pipe',
    detached: false
  });

  serverProcess.stdout.on('data', (data) => {
    console.log('后端服务输出:', data.toString());
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('后端服务错误:', data.toString());
  });

  serverProcess.on('close', (code) => {
    console.log('后端服务已关闭，退出码:', code);
  });

  serverProcess.on('error', (error) => {
    console.error('启动后端服务失败:', error);
  });

  console.log('后端服务已启动');
}

// 关闭后端服务
function stopBackendServer() {
  if (serverProcess) {
    console.log('正在关闭后端服务...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// 串口模拟功能
let mockSerialInterval = null;
function startMockSerial() {
  if (mockSerialInterval) return;
  mockSerialInterval = setInterval(() => {
    // 生成0~10000的随机整数
    const mockValue = Math.floor(Math.random() * 10000001);
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send("serialport-data", `${mockValue}\r\n`);
    });
  }, 3000);
}

// RFID卡号监听（USB HID键盘输入）
let rfidBuffer = '';
let rfidTimeout = null;
let lastInputTime = 0;
let firstInputTime = 0;


function startRFIDListener() {
  // 监听主窗口的键盘输入
  app.on('browser-window-created', (event, window) => {
    // 确保只注册一次事件监听器
    if (window.rfidListenerRegistered) return;
    window.rfidListenerRegistered = true;
    
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;

      const currentTime = Date.now();
      
      // 如果输入的是数字或字母（十六进制字符）
      if (/^[0-9A-Fa-f]$/.test(input.key)) {
        // 检查输入间隔，RFID刷卡通常间隔很短（小于50ms）
        const timeDiff = currentTime - lastInputTime;
        lastInputTime = currentTime;
        

        // 如果是第一个字符，记录开始时间
        if (rfidBuffer.length === 0) {
          firstInputTime = currentTime;
        }

        // 如果间隔很短，认为是RFID刷卡
        if (rfidBuffer.length === 0 || timeDiff < 50) {
          rfidBuffer += input.key.toUpperCase();
           // 设置 500ms 的超时清空
           if (rfidTimeout) clearTimeout(rfidTimeout);
           rfidTimeout = setTimeout(() => {
             rfidBuffer = '';
           }, 500);
          // // 清除之前的超时
          // if (rfidTimeout) {
          //   clearTimeout(rfidTimeout);
          // }
          
          // 设置超时，如果500ms内没有新输入，认为卡号读取完成
          // rfidTimeout = setTimeout(() => {
          //   if (rfidBuffer.length > 0) {
          //     console.log('RFID读到卡号:', rfidBuffer);
          //     // 发送RFID数据到渲染进程
          //     BrowserWindow.getAllWindows().forEach(win => {
          //       win.webContents.send('rfid-data', rfidBuffer);
          //     });
          //     rfidBuffer = '';
          //   }
          // }, 500);
        }
        // 如果间隔较长，认为是手动输入，不处理
      }
      // 如果输入的是回车键，立即处理卡号
      else if (input.key === 'Enter') {
        if (rfidBuffer.length > 0) {
          console.log('RFID读到卡号:', rfidBuffer);
          const duration = currentTime - firstInputTime;
          console.log('长度:',rfidBuffer.length, '时长:',duration);
           // ✅ 判断条件：长度 >= 6 && 总时长 < 300ms
           if (rfidBuffer.length >= 6 && duration > 300) {
            console.log('RFID刷卡识别成功:', rfidBuffer);
            BrowserWindow.getAllWindows().forEach(win => {
              win.webContents.send('rfid-data', rfidBuffer);
            });
          } else {
            console.log('普通键盘输入，不处理:', rfidBuffer);
          }

          rfidBuffer = '';
        }
        // 清除超时
        if (rfidTimeout) {
          clearTimeout(rfidTimeout);
          rfidTimeout = null;
        }
      }
    });
  });
}

// 监听渲染进程请求打开串口
const { ipcMain } = require("electron");
ipcMain.on("open-serialport", (event) => {
  // 如果启用模拟串口，直接返回
  if (process.env.MOCK_SERIAL === "1") {
    startMockSerial();
    return;
  }
  // 如果串口已打开，避免重复打开
  if (serialPortInstance && serialPortInstance.isOpen) return;
  // 创建串口实例
  serialPortInstance = new SerialPort(
    { path: "COM3", baudRate: 9600, autoOpen: false },
    (err) => {
      if (err) {
        event.sender.send("serialport-error", err.message);
        return;
      }
    }
  );
  // 监听串口数据
  serialPortInstance.on("data", (data) => {
    console.log("串口收到数据:", data.toString()); // 控制台打印
    mainWindow.webContents.send("serialport-data", data.toString());
  });
  // 监听串口错误
  serialPortInstance.on("error", (err) => {
    event.sender.send("serialport-error", err.message);
  });
  // 打开串口
  serialPortInstance.open((err) => {
    if (err) {
      event.sender.send("serialport-error", err.message);
      return;
    }
    console.log("串口已打开");
  });
});

// 启动RFID监听
app.whenReady().then(() => {
  startRFIDListener();
});

// 声明一个全局变量，用于存储主窗口的引用，初始值为 null
let mainWindow = null;

/**
 * 创建登录窗口的函数
 * 这是应用启动时显示的第一个窗口
 */
function createLoginWindow() {
  // 创建一个新的浏览器窗口实例，并传入配置对象
  const win = new BrowserWindow({
    width: 1000, // 设置窗口的初始宽度为 1000 像素
    height: 600, // 设置窗口的初始高度为 600 像素
    resizable: false, // 禁止用户调整窗口大小
    maximizable: false, // 禁止窗口最大化按钮
    center: true, // 窗口在屏幕中居中显示
    autoHideMenuBar: true, // 自动隐藏窗口的菜单栏
    frame: true, // 显示窗口的边框和标题栏
    icon: path.join(__dirname, 'logo.ico'), // 设置窗口图标
    webPreferences: {
      // 网页功能的配置项
      nodeIntegration: true, // 允许在渲染进程中使用 Node.js API
      contextIsolation: false, // 关闭上下文隔离，允许直接访问 Node.js API
    },
  });

  // 移除应用程序的菜单栏
  Menu.setApplicationMenu(null);

  // 判断当前是否在开发环境中运行
  if (process.env.VITE_DEV_SERVER_URL) {
    // 在开发环境中，加载开发服务器的 URL，并添加登录页面的路由
    win.loadURL(process.env.VITE_DEV_SERVER_URL + "/#/login");
    // 打开开发者工具，方便调试
    // win.webContents.openDevTools();
  } else {
    // 在生产环境中，加载打包后的 HTML 文件
    win.loadFile(path.join(__dirname, "../dist/index.html"), {
      hash: "/login", // 使用 hash 路由加载登录页面
    });
  }

  // 监听来自渲染进程的 IPC 消息
  win.webContents.on("ipc-message", (event, channel, ...args) => {
    // 当收到登录成功的消息时
    if (channel === "login-success") {
      // 创建主窗口
      createMainWindow();
      // 关闭登录窗口
      win.close();
    }
  });

  // 监听窗口的关闭事件
  win.on("closed", () => {
    // 如果没有主窗口存在，则退出整个应用
    if (!mainWindow) {
      app.quit();
    }
  });
}

/**
 * 创建主窗口的函数
 * 这是用户登录后显示的主应用窗口
 */
function createMainWindow() {
  // 检查主窗口是否已经存在
  if (mainWindow) {
    // 如果窗口处于最小化状态
    if (mainWindow.isMinimized()) {
      // 恢复窗口到正常大小
      mainWindow.restore();
    }
    // 根据环境重新加载 home 路由
    if (process.env.VITE_DEV_SERVER_URL) {
      // 在开发环境中，加载开发服务器的 URL
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL + "/#/home");
    } else {
      // 在生产环境中，加载打包后的 HTML 文件
      mainWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
        hash: "/home", // 使用 hash 路由加载首页
      });
    }
    // 最大化窗口
    mainWindow.maximize();
    // 让窗口获得焦点
    mainWindow.focus();
    // 结束函数执行
    return;
  }

  // 创建新的主窗口实例，并传入配置对象
  mainWindow = new BrowserWindow({
    width: 1200, // 设置窗口的初始宽度为 1200 像素
    height: 800, // 设置窗口的初始高度为 800 像素
    minWidth: 800, // 设置窗口的最小宽度为 800 像素
    minHeight: 600, // 设置窗口的最小高度为 600 像素
    resizable: true, // 允许用户调整窗口大小
    maximizable: true, // 允许窗口最大化
    fullscreenable: true, // 允许窗口全屏显示
    autoHideMenuBar: true, // 自动隐藏窗口的菜单栏
    frame: true, // 显示窗口的边框和标题栏
    show: false, // 初始时不显示窗口，等待内容加载完成
    icon: path.join(__dirname, 'logo.ico'), // 设置窗口图标
    webPreferences: {
      // 网页功能的配置项
      nodeIntegration: true, // 允许在渲染进程中使用 Node.js API
      contextIsolation: false, // 关闭上下文隔离，允许直接访问 Node.js API
    },
  });

  // 移除应用程序的菜单栏
  Menu.setApplicationMenu(null);

  // 根据环境加载主窗口内容
  if (process.env.VITE_DEV_SERVER_URL) {
    // 在开发环境中，加载开发服务器的 URL
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL + "/#/home");
  } else {
    // 在生产环境中，加载打包后的 HTML 文件
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
      hash: "/home", // 使用 hash 路由加载首页 
    });
  }

  // 监听窗口的 ready-to-show 事件，这个事件在窗口内容加载完成后触发
  mainWindow.once("ready-to-show", () => {
    // 显示窗口
    mainWindow.show();
    // 最大化窗口
    mainWindow.maximize();
    // 打开调试工具
    // mainWindow.webContents.openDevTools();
  });

  // 监听窗口的最大化事件
  mainWindow.on("maximize", () => {
    // 在控制台输出日志
    console.log("Window maximized");
  });

  // 监听窗口的取消最大化事件
  mainWindow.on("unmaximize", () => {
    // 在控制台输出日志
    console.log("Window unmaximized");
  });

  // 监听窗口的大小改变事件
  mainWindow.on("resize", () => {
    // 在控制台输出日志
    console.log("Window resized");
  });

  // 监听窗口的关闭事件
  mainWindow.on("closed", () => {
    // 清除主窗口的引用
    mainWindow = null;
    // 退出整个应用
    app.quit();
  });
}

// 当 Electron 完成初始化时，启动后端服务并创建登录窗口
app.whenReady().then(() => {
  // 启动后端服务
  startBackendServer();
  // 创建登录窗口
  createLoginWindow();
});

// 监听所有窗口关闭的事件
app.on("window-all-closed", () => {
  // 关闭后端服务
  stopBackendServer();
  // 当所有窗口都关闭时，退出应用
  app.quit();
});

// 监听应用即将退出的事件
app.on("before-quit", () => {
  // 确保在应用退出前关闭后端服务
  stopBackendServer();
});
