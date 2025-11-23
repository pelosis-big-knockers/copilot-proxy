#!/usr/bin/env node

import { createServer } from 'http';
import { request } from 'https';
import { alterVsSettings } from './alter-vs-settings.js';
import { loadInstructions } from './load-instructions.js';
import { injectChatCompletionsContext } from './inject-chat-completions-context.js';
import { injectCopilotCompletionsContext } from './inject-copilot-completions-context.js';

const host = 'localhost';
const defaultPort = 17345;
const serverUrl = `http://${host}:${defaultPort}`;

const copilotUrl = 'https://proxy.individual.githubcopilot.com';

alterVsSettings(serverUrl);

const instructions = loadInstructions();
if (instructions.overallInstructions) {
  console.log('Loaded overall instructions.');
}

if (instructions.additionalInstructions?.length) {
  const count = instructions.additionalInstructions.length;
  const globPaths = instructions.additionalInstructions.map(instr => instr.applyTo.join(',')).join(';');
  console.log(`Loaded ${count} additional instruction files for glob paths: ${globPaths}`);
}

const httpServer = createServer((req, res) => {  
  let body = '';

  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', () => {
    const newUrl = copilotUrl + req.url;
    
    body = injectContext(newUrl, body);

    relayRequest(newUrl, req.method, req.headers, body)
      .then(response => {
        // console.log(`Received request for: ${req.url}`);
        // if (body) {
        //   console.log('Request body:', body);
        // }

        // console.log('--- End of Request ---');
        
        // console.log(`Relaying request to: ${newUrl}`);
        
        // console.log('Response body:', response.body);
        // console.log('--- End of Response ---');

        res.writeHead(response.statusCode, response.headers);
        res.end(response.body);
      })
      .catch(error => {
        console.error('Error relaying request:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      });
  });
});

httpServer.listen(defaultPort, host, () => {
  console.log(`Server running at ${serverUrl}`);
});

function relayRequest(url, method, headers, body) {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        ...headers,
        'Host': 'proxy.individual.githubcopilot.com',
        'Content-Length': body ? Buffer.byteLength(body) : 0
      }
    };

    const req = request(url, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData,
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

function injectContext(url, body) {
  if (url.endsWith('/chat/completions')) { 
    return injectChatCompletionsContext(body, instructions);
  } else if (url.endsWith('-copilot/completions')) {
    return injectCopilotCompletionsContext(body, instructions);
  }

  return body; 
}