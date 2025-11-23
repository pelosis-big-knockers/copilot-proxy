import fs from 'fs';
import path from 'path';

let vsCodeFolderExists = false;
let originalSettings = null;

const localSettingsFilePath = './.vscode/settings.json';
const vsCodeFolderPath = path.dirname(localSettingsFilePath);

export function alterVsSettings(serverUrl) {
  if (fs.existsSync(localSettingsFilePath)) {
    const settingsData = fs.readFileSync(localSettingsFilePath, 'utf-8');
    vsCodeFolderExists = true;
    originalSettings = JSON.parse(settingsData);
  }

  const alteredSettings = {
    ...originalSettings,
    "github.copilot.advanced": {
      "debug.testOverrideProxyUrl": serverUrl,
      "debug.overrideProxyUrl": serverUrl
    }
  };

  if (!vsCodeFolderExists) {
    if (!fs.existsSync(vsCodeFolderPath)) {
      fs.mkdirSync(vsCodeFolderPath);
    } else {
      vsCodeFolderExists = true;
    }
  }

  fs.writeFileSync(localSettingsFilePath, JSON.stringify(alteredSettings, null, 2), 'utf-8');
  console.log(`VS Code settings altered to redirect Copilot requests to the proxy: ${serverUrl}`);

  process.on('exit', restoreVsSettings);
  process.on('SIGINT', () => restoreVsSettings(true));
  process.on('SIGTERM', () => restoreVsSettings(true));
  process.on('SIGUSR1', () => restoreVsSettings(true));
  process.on('SIGUSR2', () => restoreVsSettings(true));
  process.on('uncaughtException', (err) => restoreVsSettings(true, err));
}

function restoreVsSettings(withExit, error) {
  if (originalSettings) {
    fs.writeFileSync(localSettingsFilePath, JSON.stringify(originalSettings, null, 2), 'utf-8');
  } else if (!vsCodeFolderExists) {
    fs.rmSync(vsCodeFolderPath, { recursive: true, force: true });
  } else {
    fs.rmSync(localSettingsFilePath, { force: true });
  }

  if (error) {
    console.error('Caught uncaught exception:', error.stack);
  }

  if (withExit) {
    process.exit(error ? 1 : 0);
  }
}