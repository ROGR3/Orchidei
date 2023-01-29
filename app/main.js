const { app, BrowserWindow } = require('electron');
let op = {
  theme: 'dark',
}
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    transparent: true,
    frame: false,
    vibrancy: op,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: false,
    },
    icon: 'assets/icons/orchideiMini.png',
    autoHideMenuBar: true,
  });
  mainWindow.loadFile('./views/index.html');
  require('@electron/remote/main').initialize()
  require("@electron/remote/main").enable(mainWindow.webContents);
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
const { ipcMain } = require('electron');

ipcMain.on('ondragstart', (event, filePath, logoPath) => {
  event.sender.startDrag({
    file: filePath,
    icon: logoPath,
  });
});
