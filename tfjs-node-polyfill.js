/**
 * Polyfill for Node.js util.isNullOrUndefined()
 * This function was deprecated in Node.js v10 and removed in v14+
 * Required for @tensorflow/tfjs-node to work with modern Node.js versions
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const util = require('util');

// Only add the polyfill if it doesn't exist
if (typeof util.isNullOrUndefined !== 'function') {
  util.isNullOrUndefined = function(value) {
    return value === null || value === undefined;
  };
  console.log('✅ Applied polyfill for util.isNullOrUndefined()');
}

