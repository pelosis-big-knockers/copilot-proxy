import { getInstructionsForFilePath } from './get-instructions-for-file-path.js';

export function injectChatCompletionsContext(body, instructions) {
  try {
    console.log('Injecting chat completions context');
    const parsedBody = JSON.parse(body);
    if (parsedBody.messages?.length) {
      const systemMessageIndex = parsedBody.messages.findIndex(msg => msg.role === 'system');
      const userMessage = parsedBody.messages.find(msg => msg.role === 'user')?.content || '';
      const filePath = !!userMessage && attemptToFindCurrentFilePath(userMessage);
      if (!filePath) {
        console.warning('No file path found in user message: ', userMessage);
      }
      
      const instructionsText = getInstructionsForFilePath(instructions, filePath);
      if (systemMessageIndex !== -1) {
        parsedBody.messages[systemMessageIndex].content = instructionsText;
      } else {
        parsedBody.messages.unshift({
          role: 'system',
          content: instructionsText
        });
      }
    }

    return JSON.stringify(parsedBody);
  } catch (error) {
    console.error('Failed to parse request body as JSON:', error);
    return body;
  }
}

// example string \n<|current_file_content|>\ncurrent_file_path: .vscode/settings.json\n{\n  \"twee3Language
function attemptToFindCurrentFilePath (userMessage) {
  const fileTypeMatch = userMessage.match(/current_file_path:\s*([^\\\n]*\.\w+)\n/);
  if (fileTypeMatch && fileTypeMatch[1]) {
    return fileTypeMatch[1];
  }
}

