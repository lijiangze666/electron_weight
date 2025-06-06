const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

let mainWindow = null;

function createLoginWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 600,
    resizable: false,
    maximizable: false,
    center: true,
    autoHideMenuBar: true,
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  Menu.setApplicationMenu(null);

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL + "/#/login");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"), {
      hash: "/login",
    });
  }

  // 监听登录事件
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
    // 重新加载 home 路由
    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL + "/#/home");
    } else {
      mainWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
        hash: "/home",
      });
    }
    mainWindow.maximize(); // 恢复时也最大化
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    autoHideMenuBar: true,
    frame: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  Menu.setApplicationMenu(null);

  // 加载 home 路由
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL + "/#/home");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
      hash: "/home",
    });
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.maximize(); // 显示时立即最大化
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
