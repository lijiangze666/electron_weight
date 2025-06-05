const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

let mainWindow = null;

function createLoginWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 600,
    resizable: false,
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
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // 监听导航事件
  win.webContents.on('will-navigate', (event, url) => {
    if (url.includes('/home')) {
      event.preventDefault();
      createMainWindow();
      win.close();
    }
  });

  // 监听 hash 变化
  win.webContents.on('hash-change', (event, url) => {
    if (url.includes('/home')) {
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

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL + '/#/home');
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"), {
      hash: '/home'
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
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
