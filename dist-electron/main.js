"use strict";
const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const { SerialPort } = require("serialport");
let serialPortInstance = null;
let mockSerialInterval = null;
function startMockSerial() {
  if (mockSerialInterval) return;
  mockSerialInterval = setInterval(() => {
    const mockValue = Math.floor(Math.random() * 10000001);
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send("serialport-data", `${mockValue}\r
`);
    });
  }, 1e3);
}
const { ipcMain } = require("electron");
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
    console.log("串口收到数据:", data.toString());
    mainWindow.webContents.send("serialport-data", data.toString());
  });
  serialPortInstance.on("error", (err) => {
    event.sender.send("serialport-error", err.message);
  });
  serialPortInstance.open((err) => {
    if (err) {
      event.sender.send("serialport-error", err.message);
      return;
    }
    console.log("串口已打开");
  });
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
    win.webContents.openDevTools();
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
    mainWindow.webContents.openDevTools();
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
app.whenReady().then(createLoginWindow);
app.on("window-all-closed", () => {
  app.quit();
});
