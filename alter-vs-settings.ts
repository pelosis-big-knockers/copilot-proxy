import fs from "fs";
import path from "path";
import file from "./file.ts";
import json5 from "json5";

let vsCodeFolderExisted = false;

const localSettingsFilePath = "./.vscode/settings.json";
const vsCodeFolderPath = path.dirname(localSettingsFilePath);

export async function alterVsSettings(serverUrl: string) {
  let originalSettings = {};
  try {
    const settingsData = await file.read(localSettingsFilePath);
    vsCodeFolderExisted = true;
    originalSettings = json5.parse(settingsData);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Error reading VS Code settings:", err);
    }
  }

  const alteredSettings = {
    ...originalSettings,
    "github.copilot.advanced": {
      "debug.testOverrideProxyUrl": serverUrl,
      "debug.overrideProxyUrl": serverUrl,
    },
  };

  if (!vsCodeFolderExisted) {
    if (await file.exists(vsCodeFolderPath)) {
      vsCodeFolderExisted = true;
    } else {
      await file.mkdir(vsCodeFolderPath);
    }
  }

  await file.writeFile(localSettingsFilePath, json5.stringify(alteredSettings, null, 2));

  console.log(`VS Code settings altered to redirect Copilot to: ${serverUrl}`);

  process.on("exit", restoreVsSettings);
  process.on("SIGINT", () => restoreVsSettings(true));
  process.on("SIGTERM", () => restoreVsSettings(true));
  process.on("SIGUSR1", () => restoreVsSettings(true));
  process.on("SIGUSR2", () => restoreVsSettings(true));
  process.on("uncaughtException", (err) => restoreVsSettings(true, err));
}

function restoreVsSettings(withExit: boolean, error?: Error) {
  if (vsCodeFolderExisted) {
    const contents = fs.readFileSync(localSettingsFilePath, "utf-8");
    const settings = json5.parse(contents);
    delete settings["github.copilot.advanced"];
    if (Object.keys(settings).length === 0) {
      fs.rmSync(localSettingsFilePath);
      console.log("Removed VS Code settings file.");
      return;
    } else {
      fs.writeFileSync(localSettingsFilePath, JSON.stringify(settings, null, 2), "utf-8");
      console.log("Restored VS Code settings.");
    }
  } else {
    fs.rmSync(vsCodeFolderPath, { recursive: true, force: true });
    console.log("Removed VS Code settings folder.");
  }

  if (error) {
    console.error("Caught uncaught exception:", error.stack);
  }

  if (withExit) {
    process.exit(error ? 1 : 0);
  }
}
