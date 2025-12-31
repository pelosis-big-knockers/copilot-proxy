import fs from "fs";

const exists = async (path: string) => {
  try {
    await fs.promises.access(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const readDir = async (dirPath: string) => {
  return fs.promises.readdir(dirPath);
};

const read = async (filePath: string) => {
  return fs.promises.readFile(filePath, "utf-8");
};

const isFile = async (path: string) => {
  try {
    const stats = await fs.promises.stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
};

const mkdir = async (dirPath: string) => {
  return fs.promises.mkdir(dirPath, { recursive: true });
};

const writeFile = async (filePath: string, data: string) => {
  return fs.promises.writeFile(filePath, data, "utf-8");
};

export default { exists, readDir, read, isFile, mkdir, writeFile };
