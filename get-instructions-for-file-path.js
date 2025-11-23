import { minimatch } from 'minimatch';

export function getInstructionsForFilePath(instructions, filePath) {
  let applicableInstructions = instructions.overallInstructions || '';

  if (filePath && instructions.additionalInstructions) {
    for (const instruction of instructions.additionalInstructions) {
      if (instruction.applyTo.some(pattern => minimatch(filePath, pattern))) {
        applicableInstructions = `${applicableInstructions}\n\n${instruction.content}`;
      }
    }
  }

  return applicableInstructions;
}