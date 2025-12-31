import fs from "fs";
import file from "./file.ts";
import path from "path";

const overallInstructionsPath = "./.github/copilot-instructions.md";

const additionalInstructionsDirPath = "./.github/instructions";

export interface AdditionalInstructionData {
  content: string;
  applyTo: string[];
}

export interface InstructionsData {
  overallInstructions?: string;
  additionalInstructions: Iterable<AdditionalInstructionData>;
}

export class InstructionsWatcher {
  private watchedFiles: Map<string, number>;
  private mainInstructions?: string;
  private additionalInstructions: Map<string, AdditionalInstructionData>;

  constructor() {
    this.watchedFiles = new Map();
    this.additionalInstructions = new Map();
  }

  get instructions(): InstructionsData {
    return {
      overallInstructions: this.mainInstructions,
      additionalInstructions: this.additionalInstructions.values(),
    };
  }

  async startWatching() {
    const overallPath = path.resolve(overallInstructionsPath);
    try {
      this.mainInstructions = await file.read(overallPath);
      this.watchedFiles.set(overallPath, performance.now());
    } catch (err) {
      console.warn(`Main instructions file not found at path: ${overallPath}`);
    }

    if (await file.exists(additionalInstructionsDirPath)) {
      const filePaths = await file.readDir(additionalInstructionsDirPath);
      for (const filePath of filePaths) {
        const fullPath = path.join(additionalInstructionsDirPath, filePath);
        if (filePath.endsWith(".md") && (await file.isFile(fullPath))) {
          await this.readAndWatchFile(fullPath);
        }
      }
    }

    console.log(`Found ${this.watchedFiles.size} instruction files to watch.`);
  }

  private async readAndWatchFile(filePath: string) {
    this.watchedFiles.set(filePath, performance.now());
    fs.watch(filePath, (eventType) => {
      if (eventType === "change") {
        const timestamp = performance.now();
        this.watchedFiles.set(filePath, timestamp);
        setTimeout(async () => {
          await this.onFileChange(filePath, timestamp);
        }, 100);
      }
    });

    await this.loadInstructionsFile(filePath);
  }

  private async onFileChange(filePath: string, timestamp: number) {
    if (this.watchedFiles.get(filePath) !== timestamp) {
      return;
    }

    console.log(`Instructions file changed: ${filePath}. Reloading...`);
    await this.loadInstructionsFile(filePath);
  }

  private async loadInstructionsFile(filePath: string) {
    const content = (await file.read(filePath)).trim();
    if (content.startsWith("---") && content.includes("applyTo:")) {
      const parts = content.split("---");
      if (parts.length >= 3) {
        const yamlContent = parts[1].trim();
        const markdownContent = parts.slice(2).join("---").trim();
        const applyToMatch = yamlContent.match(/applyTo:\s*"([^"]+)"/);
        if (applyToMatch) {
          const applyTo = applyToMatch[1].split(",").map((s) => s.trim());
          this.additionalInstructions.set(filePath, {
            content: markdownContent,
            applyTo,
          });
        }
      }
    }
  }
}
