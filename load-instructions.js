import fs from 'fs';
import path from 'path';

const overallInstructionsPath = './.github/copilot-instructions.md';

const additionalInstructionsDirPath = './.github/instructions';

export function loadInstructions() {
  let overallInstructions 
  if (fs.existsSync(overallInstructionsPath)) {
    overallInstructions = fs.readFileSync(overallInstructionsPath, 'utf-8');
  }

  let additionalInstructions = [];
  if (fs.existsSync(additionalInstructionsDirPath)) {
    const files = fs.readdirSync(additionalInstructionsDirPath);
    for (const file of files) {
      const filePath = path.join(additionalInstructionsDirPath, file);
      if (fs.statSync(filePath).isFile() && file.endsWith('.md')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.trim().startsWith('---') && content.includes('applyTo:')) {
          const parts = content.split('---');
          if (parts.length >= 3) {
            const yamlContent = parts[1].trim();
            const markdownContent = parts.slice(2).join('---').trim();
            const applyToMatch = yamlContent.match(/applyTo:\s*"([^"]+)"/);
            if (applyToMatch) {
              const applyTo = applyToMatch[1].split(',').map(s => s.trim());
              additionalInstructions.push({ applyTo, content: markdownContent });
            }
          }
        }
      }
    }
  }
  return { overallInstructions, additionalInstructions };
}