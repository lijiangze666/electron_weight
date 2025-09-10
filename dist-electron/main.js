"use strict";
const { app, BrowserWindow, Menu, globalShortcut } = require("electron");
const path = require("path");
const { SerialPort } = require("serialport");
const { spawn } = require("child_process");
let serialPortInstance = null;
let serverProcess = null;
function startBackendServer() {
  const serverPath = path.join(__dirname, "../server/api.js");
  serverProcess = spawn("node", [serverPath], {
    stdio: "pipe",
    detached: false
  });
  serverProcess.stdout.on("data", (data) => {
    console.log("后端服务输出:", data.toString());
  });
  serverProcess.stderr.on("data", (data) => {
    console.error("后端服务错误:", data.toString());
  });
  serverProcess.on("close", (code) => {
    console.log("后端服务已关闭，退出码:", code);
  });
  serverProcess.on("error", (error) => {
    console.error("启动后端服务失败:", error);
  });
  console.log("后端服务已启动");
}
function stopBackendServer() {
  if (serverProcess) {
    console.log("正在关闭后端服务...");
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
}
let mockSerialInterval = null;
function startMockSerial() {
  if (mockSerialInterval) return;
  mockSerialInterval = setInterval(() => {
    const mockValue = Math.floor(Math.random() * 10000001);
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send("serialport-data", `${mockValue}\r
`);
    });
  }, 300);
}
let rfidBuffer = "";
let rfidTimeout = null;
let lastInputTime = 0;
let firstInputTime = 0;
function startRFIDListener() {
  app.on("browser-window-created", (event, window) => {
    if (window.rfidListenerRegistered) return;
    window.rfidListenerRegistered = true;
    window.webContents.on("before-input-event", (event2, input) => {
      if (input.type !== "keyDown") return;
      const currentTime = Date.now();
      if (/^[0-9A-Fa-f]$/.test(input.key)) {
        const timeDiff = currentTime - lastInputTime;
        lastInputTime = currentTime;
        if (rfidBuffer.length === 0) {
          firstInputTime = currentTime;
        }
        if (rfidBuffer.length === 0 || timeDiff < 50) {
          rfidBuffer += input.key.toUpperCase();
          if (rfidTimeout) clearTimeout(rfidTimeout);
          rfidTimeout = setTimeout(() => {
            rfidBuffer = "";
          }, 500);
        }
      } else if (input.key === "Enter") {
        if (rfidBuffer.length > 0) {
          console.log("RFID读到卡号:", rfidBuffer);
          const duration = currentTime - firstInputTime;
          console.log("长度:", rfidBuffer.length, "时长:", duration);
          if (rfidBuffer.length >= 6 && duration > 300) {
            console.log("RFID刷卡识别成功:", rfidBuffer);
            BrowserWindow.getAllWindows().forEach((win) => {
              win.webContents.send("rfid-data", rfidBuffer);
            });
          } else {
            console.log("普通键盘输入，不处理:", rfidBuffer);
          }
          rfidBuffer = "";
        }
        if (rfidTimeout) {
          clearTimeout(rfidTimeout);
          rfidTimeout = null;
        }
      }
    });
  });
}
const { ipcMain } = require("electron");
let serialBuffer = "";
let bufferTimeout = null;
ipcMain.on("open-serialport", (event) => {
  if (process.env.MOCK_SERIAL === "1") {
    startMockSerial();
    return;
  }
  if (serialPortInstance && serialPortInstance.isOpen) return;
  serialPortInstance = new SerialPort(
    { path: "COM3", baudRate: 9600, autoOpen: false },
    (err) => {
      if (err) {
        event.sender.send("serialport-error", err.message);
        return;
      }
    }
  );
  serialPortInstance.on("data", (data) => {
    const dataStr = data.toString();
    console.log("串口收到数据:", dataStr, "原始字节:", Array.from(data));
    serialBuffer += dataStr;
    if (bufferTimeout) {
      clearTimeout(bufferTimeout);
    }
    const cleanedBuffer = serialBuffer.replace(/[\x02\x03]/g, "");
    console.log("清理后的缓冲区:", JSON.stringify(cleanedBuffer));
    let completePacketMatch = cleanedBuffer.match(/([+-]\d{9})(?![0-9])/g);
    if (!completePacketMatch) {
      completePacketMatch = cleanedBuffer.match(/([+-]\d{8}[A-Z])/g);
    }
    if (completePacketMatch) {
      const latestPacket = completePacketMatch[completePacketMatch.length - 1];
      console.log("发送完整数据包:", latestPacket);
      mainWindow.webContents.send("serialport-data", latestPacket);
      serialBuffer = "";
    } else {
      bufferTimeout = setTimeout(() => {
        if (serialBuffer.length > 0) {
          console.log("超时发送缓冲区数据:", serialBuffer);
          const cleanedData = serialBuffer.replace(/[\x02\x03]/g, "");
          if (cleanedData.length > 0) {
            mainWindow.webContents.send("serialport-data", cleanedData);
          }
          serialBuffer = "";
        }
      }, 100);
    }
  });
  serialPortInstance.on("error", (err) => {
    event.sender.send("serialport-error", err.message);
  });
  serialPortInstance.open((err) => {
    if (err) {
      event.sender.send("serialport-error", err.message);
      return;
    }
  });
});
app.whenReady().then(() => {
  startRFIDListener();
});
let mainWindow = null;
function createLoginWindow() {
  const win = new BrowserWindow({
    width: 1e3,
    // 设置窗口的初始宽度为 1000 像素
    height: 600,
    // 设置窗口的初始高度为 600 像素
    resizable: false,
    // 禁止用户调整窗口大小
    maximizable: false,
    // 禁止窗口最大化按钮
    center: true,
    // 窗口在屏幕中居中显示
    autoHideMenuBar: true,
    // 自动隐藏窗口的菜单栏
    frame: true,
    // 显示窗口的边框和标题栏
    icon: path.join(__dirname, "logo.ico"),
    // 设置窗口图标
    webPreferences: {
      // 网页功能的配置项
      nodeIntegration: true,
      // 允许在渲染进程中使用 Node.js API
      contextIsolation: false
      // 关闭上下文隔离，允许直接访问 Node.js API
    }
  });
  Menu.setApplicationMenu(null);
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL + "/#/login");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), {
      hash: "/login"
      // 使用 hash 路由加载登录页面
    });
  }
  win.webContents.on("ipc-message", (event, channel, ...args) => {
    if (channel === "login-success") {
      createMainWindow();
      win.close();
    }
  });
  win.on("closed", () => {
    if (!mainWindow) {
      app.quit();
    }
  });
}
function createMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL + "/#/home");
    } else {
      mainWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
        hash: "/home"
        // 使用 hash 路由加载首页
      });
    }
    mainWindow.maximize();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 1200,
    // 设置窗口的初始宽度为 1200 像素
    height: 800,
    // 设置窗口的初始高度为 800 像素
    minWidth: 800,
    // 设置窗口的最小宽度为 800 像素
    minHeight: 600,
    // 设置窗口的最小高度为 600 像素
    resizable: true,
    // 允许用户调整窗口大小
    maximizable: true,
    // 允许窗口最大化
    fullscreenable: true,
    // 允许窗口全屏显示
    autoHideMenuBar: true,
    // 自动隐藏窗口的菜单栏
    frame: true,
    // 显示窗口的边框和标题栏
    show: false,
    // 初始时不显示窗口，等待内容加载完成
    icon: path.join(__dirname, "logo.ico"),
    // 设置窗口图标
    webPreferences: {
      // 网页功能的配置项
      nodeIntegration: true,
      // 允许在渲染进程中使用 Node.js API
      contextIsolation: false
      // 关闭上下文隔离，允许直接访问 Node.js API
    }
  });
  Menu.setApplicationMenu(null);
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL + "/#/home");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
      hash: "/home"
      // 使用 hash 路由加载首页 
    });
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.maximize();
  });
  mainWindow.on("maximize", () => {
    console.log("Window maximized");
  });
  mainWindow.on("unmaximize", () => {
    console.log("Window unmaximized");
  });
  mainWindow.on("resize", () => {
    console.log("Window resized");
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    app.quit();
  });
}
app.whenReady().then(() => {
  startBackendServer();
  createLoginWindow();
});
app.on("window-all-closed", () => {
  stopBackendServer();
  app.quit();
});
app.on("before-quit", () => {
  stopBackendServer();
});
