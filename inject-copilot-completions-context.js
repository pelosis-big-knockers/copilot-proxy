import { getInstructionsForFilePath } from './get-instructions-for-file-path.js';

export function injectCopilotCompletionsContext(body, instructions) {
  try {
    console.log('Injecting copilot completions context');
    const parsedBody = JSON.parse(body);
    if (parsedBody.extra?.context?.length) {
      const pathContext = parsedBody.extra.context.find(ctx => ctx.startsWith('Path: '));
      let filePath;
      if (pathContext) {
        filePath = pathContext.replace('Path: ', '').trim().split('\n')[0].trim();
      }
      
      const instructionsText = getInstructionsForFilePath(instructions, filePath);
      parsedBody.extra.context.push(instructionsText);
    }

    return JSON.stringify(parsedBody);
  } catch (error) {
    console.error('Failed to parse request body as JSON:', error);
    return body;
  }
}

