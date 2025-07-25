// 从 electron 包中导入必要的模块：app(应用实例)、BrowserWindow(窗口类)、Menu(菜单类)
const { app, BrowserWindow, Menu } = require("electron");
// 导入 Node.js 的 path 模块，用于处理文件路径
const path = require("path");
// 引入 serialport 包
const { SerialPort } = require("serialport");
let serialPortInstance = null; // 用于保存串口实例

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
  }, 1000);
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

// 在主进程顶部引入serialport后添加如下代码：
let rfidPort = null;
function startRFIDSerial() {
  if (rfidPort && rfidPort.isOpen) return;
  rfidPort = new SerialPort({ path: 'COM3', baudRate: 115200, autoOpen: false }, (err) => {
    if (err) {
      console.error('RFID串口打开失败:', err.message);
      return;
    }
  });
  rfidPort.on('data', (data) => {
    const cardId = data.toString().trim();
    console.log('RFID读到卡号:', cardId);
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('rfid-data', cardId);
    });
  });
  rfidPort.on('error', (err) => {
    console.error('RFID串口错误:', err.message);
  });
  rfidPort.open((err) => {
    if (err) {
      console.error('RFID串口打开失败:', err.message);
      return;
    }
    console.log('RFID串口已打开');
  });
}

// 启动RFID串口监听
app.whenReady().then(() => {
  startRFIDSerial();
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
    win.webContents.openDevTools();
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
    mainWindow.webContents.openDevTools();
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

// 当 Electron 完成初始化时，调用 createLoginWindow 函数创建登录窗口
app.whenReady().then(createLoginWindow);

// 监听所有窗口关闭的事件
app.on("window-all-closed", () => {
  // 当所有窗口都关闭时，退出应用
  app.quit();
});
