import { getInstructionsForFilePath } from "./get-instructions-for-file-path.ts";
import type { InstructionsData } from "./instructions-watcher.ts";
import json5 from "json5";

export function injectCopilotCompletionsContext(body: string, instructions: InstructionsData) {
  try {
    console.log("Injecting copilot completions context");
    const parsedBody = json5.parse(body);
    if (parsedBody.extra?.context?.length) {
      const pathContext = parsedBody.extra.context.find((ctx) => ctx.startsWith("Path: "));
      let filePath: string;
      if (pathContext) {
        filePath = pathContext.replace("Path: ", "").trim().split("\n")[0].trim();
      }

      const instructionsText = getInstructionsForFilePath(instructions, filePath);
      parsedBody.extra.context.push(instructionsText);
    }

    return JSON.stringify(parsedBody);
  } catch (error) {
    console.error("Failed to parse request body as JSON:", error);
    return body;
  }
}
