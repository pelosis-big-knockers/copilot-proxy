import { minimatch } from "minimatch";
import type { InstructionsData } from "./instructions-watcher.ts";

export function getInstructionsForFilePath(instructions: InstructionsData, filePath: string) {
  let applicableInstructions = instructions.overallInstructions || "";

  if (filePath && instructions.additionalInstructions) {
    for (const instruction of instructions.additionalInstructions) {
      if (instruction.applyTo.some((pattern) => minimatch(filePath, pattern))) {
        applicableInstructions = `${applicableInstructions}\n\n${instruction.content}`;
      }
    }
  }

  return applicableInstructions;
}
