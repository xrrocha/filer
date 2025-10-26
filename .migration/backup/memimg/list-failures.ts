#!/usr/bin/env node
/**
 * List all test failures with full names
 */

import { run } from 'node:test';
import { glob } from 'glob';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function listFailures() {
  // Find all test files
  const testFiles = await glob('{unit,integration}/**/*.test.ts', {
    cwd: __dirname,
    absolute: true,
  });

  console.log(`Running ${testFiles.length} test files...\n`);

  const stream = run({
    files: testFiles,
    concurrency: true,
    timeout: 120000, // Increased to 120 seconds for deserialize tests
  });

  const failures: Array<{ name: string; file: string; error: any }> = [];

  for await (const event of stream) {
    if (event.type === 'test:fail') {
      failures.push({
        name: event.data.name,
        file: event.data.file || 'unknown',
        error: event.data.details?.error?.message || 'No error message',
      });
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`FAILED TESTS (${failures.length} total)`);
  console.log('='.repeat(80));

  failures.forEach((failure, index) => {
    const relativePath = path.relative(process.cwd(), failure.file);
    console.log(`\n${index + 1}. ${failure.name}`);
    console.log(`   File: ${relativePath}`);
    console.log(`   Error: ${failure.error.substring(0, 200)}`);
  });

  console.log(`\n${'='.repeat(80)}\n`);
}

listFailures().catch(console.error);
