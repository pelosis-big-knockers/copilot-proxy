#!/usr/bin/env node

import { createServer, type IncomingHttpHeaders } from "http";
import { request } from "https";
import { alterVsSettings } from "./alter-vs-settings.ts";
import { InstructionsWatcher } from "./instructions-watcher.ts";
import { injectChatCompletionsContext } from "./inject-chat-completions-context.ts";
import { injectCopilotCompletionsContext } from "./inject-copilot-completions-context.ts";

const host = "localhost";
const defaultPort = 17345;
const copilotUrl = "https://proxy.individual.githubcopilot.com";

const httpServer = createServer((req, res) => {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", () => {
    const newUrl = copilotUrl + req.url;

    body = injectContext(newUrl, body);

    relayRequest(newUrl, req.method, req.headers, body)
      .then((response) => {
        res.writeHead(response.statusCode, response.headers);
        res.end(response.body);
      })
      .catch((error) => {
        console.error("Error relaying request:", error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      });
  });
});

let port = defaultPort;

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`Port ${port} is in use, trying port ${port + 1}...`);
    port += 1;

    httpServer.listen(port, host, () => {
      console.log(`Server running at http://${host}:${port}`);
    });
  } else {
    console.error("Server error:", err);
  }
});

httpServer.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});

const serverUrl = `http://${host}:${port}`;

alterVsSettings(serverUrl);

const instructionsWatcher = new InstructionsWatcher();
await instructionsWatcher.startWatching();

console.log("Listening for instructions changes...");

type RelayResponse = {
  statusCode: number | undefined;
  headers: IncomingHttpHeaders;
  body: string;
};

function relayRequest(url: string, method: string, headers: IncomingHttpHeaders, body: string) {
  return new Promise<RelayResponse>((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        ...headers,
        Host: new URL(copilotUrl).host,
        "Content-Length": body ? Buffer.byteLength(body) : 0,
      },
    };

    const req = request(url, options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData,
        });
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

function injectContext(url: string, body: string) {
  if (url.endsWith("/chat/completions")) {
    return injectChatCompletionsContext(body, instructionsWatcher.instructions);
  } else if (url.endsWith("-copilot/completions")) {
    return injectCopilotCompletionsContext(body, instructionsWatcher.instructions);
  } else {
    console.log("No context injection determined for this url: " + url);
  }

  return body;
}
