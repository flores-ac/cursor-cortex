/**
 * MCP StdioServerTransport uses stdout exclusively for JSON-RPC.
 * Any console.log / console.info / console.debug / console.warn that hits
 * stdout will break the Cursor client with:
 *   Unexpected token '...', "..." is not valid JSON
 * (the first character of the leaked line — often an emoji — is what JSON.parse reports)
 *
 * Redirect those to stderr for the lifetime of this process, using a Console
 * bound to process.stderr so diagnostic logs stay logs (not console.error).
 * Keep MCP diagnostic logs ASCII-only so a future stdout leak is easier to
 * diagnose and less likely to trip encoding-sensitive clients.
 * Do NOT patch process.stdout.write — that races with concurrent MCP replies.
 */

import { Console } from 'node:console';

const stderrConsole = new Console({
  stdout: process.stderr,
  stderr: process.stderr,
});

console.log = (...args) => stderrConsole.log(...args);
console.info = (...args) => stderrConsole.info(...args);
console.debug = (...args) => stderrConsole.debug(...args);
console.warn = (...args) => stderrConsole.warn(...args);
