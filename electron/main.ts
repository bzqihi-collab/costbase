import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { runMigrations } from './db/migrate';
import { seedInitialData } from './db/seed';
import { registerHandlers } from './ipc/handlers';
import { startScheduler } from './sync/scheduler';
import { registerAdapter } from './adapters/index';
import { FileSourceAdapter, FILE_ADAPTERS } from './adapters/file-source';
import { EurostatAdapter } from './adapters/eurostat';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  try {
    runMigrations();
    seedInitialData();
    // Register all data adapters
    registerAdapter('Eurostat Construction Cost Index', new EurostatAdapter());
    for (const [name, sourceId, filename, regionMap] of FILE_ADAPTERS) {
      registerAdapter(name, new FileSourceAdapter(name, sourceId, filename, regionMap));
    }
    registerHandlers();
    startScheduler();
  } catch (e) {
    console.error('Init error:', e);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
