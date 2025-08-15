#!/usr/bin/env node

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic test to ensure Node.js testing works
describe('Cursor-Cortex Testing Infrastructure', () => {
  test('Node.js testing framework is working', () => {
    assert.strictEqual(1 + 1, 2);
  });

  test('can access file system', async () => {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf8');
    const packageData = JSON.parse(packageContent);
    assert.strictEqual(packageData.name, 'cursor-cortex');
  });

  test('index.js file exists', async () => {
    const indexPath = path.join(__dirname, '..', 'index.js');
    await fs.access(indexPath); // Will throw if file doesn't exist
    assert.ok(true);
  });
});

console.log('✅ Basic testing infrastructure validated');