/**
 * MCP StdioServerTransport uses stdout exclusively for JSON-RPC.
 * Any console.log / console.info / console.debug / console.warn that hits
 * stdout will break the Cursor client with:
 *   Unexpected token '✅', "..." is not valid JSON
 *
 * Redirect those to stderr for the lifetime of this process.
 * Do NOT patch process.stdout.write — that races with concurrent MCP replies.
 */

const toStderr = (...args) => console.error(...args);

console.log = toStderr;
console.info = toStderr;
console.debug = toStderr;
console.warn = toStderr;
