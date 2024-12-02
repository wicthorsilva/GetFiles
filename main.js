const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result;
});

ipcMain.on('process-files', async (event, { source, destination, moveFiles, copyFiles }) => {
  try {
    global.sourceFolder = source;
    global.destinationFolder = destination;
    global.moveFiles = moveFiles;
    global.copyFiles = copyFiles;

    const conflictFiles = await findConflicts(source, destination);

    if (conflictFiles.length > 0) {
      event.reply('show-conflict-dialog');
    } else {
      await processFiles(source, destination, moveFiles ? fs.move : fs.copy);
      event.reply('move-files-response', { message: 'Arquivos processados com sucesso!' });
    }
  } catch (error) {
    event.reply('move-files-response', { message: `Erro: ${error.message}` });
  }
});

ipcMain.on('conflict-action', async (event, { action }) => {
  try {
    global.conflictAction = action;
    await processFiles(global.sourceFolder, global.destinationFolder, global.moveFiles ? fs.move : fs.copy);
    event.reply('move-files-response', { message: 'Arquivos processados com sucesso!' });
  } catch (error) {
    event.reply('move-files-response', { message: `Erro: ${error.message}` });
  }
});

async function findConflicts(srcFolder, destFolder) {
  const files = await fs.readdir(srcFolder);
  const conflicts = [];

  for (const file of files) {
    const destPath = path.join(destFolder, file);
    if (await fs.pathExists(destPath)) {
      conflicts.push(file);
    }
  }

  return conflicts;
}

async function processFiles(srcFolder, destFolder, operation) {
  const files = await fs.readdir(srcFolder);

  for (const file of files) {
    const fullPath = path.join(srcFolder, file);
    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      await processFiles(fullPath, destFolder, operation);
    } else {
      const ext = path.extname(file).toLowerCase();
      
      if (ext === '.xlsx' || ext === '.xls') {
        const destPath = path.join(destFolder, file);
        if (await fs.pathExists(destPath)) {
          if (global.conflictAction === 'rename') {
            const newDestPath = getUniqueFilePath(destPath);
            await operation(fullPath, newDestPath, { overwrite: false });
          } else if (global.conflictAction === 'overwrite') {
            await operation(fullPath, destPath, { overwrite: true });
          }
        } else {
          await operation(fullPath, destPath, { overwrite: false });
        }
      }
    }
  }
}

function getUniqueFilePath(filePath) {
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const dir = path.dirname(filePath);

  let newFilePath = filePath;
  let counter = 1;

  while (fs.existsSync(newFilePath)) {
    newFilePath = path.join(dir, `${baseName} (${counter})${ext}`);
    counter++;
  }

  return newFilePath;
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
