/**
 * Optional: notify local Knowledge Explorer live demo when any MCP tool runs.
 * Works for Cursor, Claude Code, thin assistant, etc. — all go through this server.
 *
 * Default: notifications ON (localhost POST, fails fast if bridge is down).
 * Set CORTEX_DEMO_BRIDGE=0 (or false) to disable — e.g. if you never run the demo bridge.
 * Override URL: CORTEX_DEMO_BRIDGE_URL=http://127.0.0.1:47123/demo
 *
 * Cursor: same MCP `command`/`args` you already use; optional `"env": { "CORTEX_DEMO_BRIDGE": "0" }` to turn off.
 */
export function notifyCortexDemoBridge(toolName, toolArgs) {
  if (process.env.CORTEX_DEMO_BRIDGE === '0' || process.env.CORTEX_DEMO_BRIDGE === 'false') {
    return;
  }
  const url = process.env.CORTEX_DEMO_BRIDGE_URL || 'http://127.0.0.1:47123/demo';
  const body = {
    type: 'mcp',
    tool: String(toolName || '').replace(/-/g, '_'),
  };
  if (toolArgs && typeof toolArgs === 'object') {
    const a = toolArgs;
    if (a.projectName != null && a.projectName !== '') body.projectName = String(a.projectName);
    if (a.branchName != null && a.branchName !== '') body.branchName = String(a.branchName);
    else if (a.branch != null && a.branch !== '') body.branchName = String(a.branch);
    if (a.message != null && String(a.message).trim() !== '') {
      body.message = String(a.message).trim().replace(/\s+/g, ' ').slice(0, 280);
    }
    if (a.title != null && String(a.title).trim() !== '') {
      body.title = String(a.title).trim().slice(0, 160);
    }
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 400);
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: ac.signal,
  })
    .catch(() => {})
    .finally(() => clearTimeout(timer));
}
