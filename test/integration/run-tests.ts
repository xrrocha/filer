#!/usr/bin/env node
/**
 * Test runner for cross-component integration tests
 *
 * Runs integration tests that exercise multiple components together:
 * - MemImg + Navigator
 * - Metadata + Navigator
 * - MemImg + Metadata
 * - Full stack (all three)
 */

import { run } from 'node:test';
import { spec as specReporter } from 'node:test/reporters';
import { glob } from 'glob';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  watch: args.includes('--watch') || args.includes('-w'),
  filter: args.find(arg => arg.startsWith('--filter='))?.split('=')[1],
};

async function runTests() {
  console.log('🧪 Integration Test Suite (Cross-Component)\n');

  // Find all test files
  const patterns = ['**/*.test.ts'];
  const testFiles: string[] = [];

  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: __dirname,
      absolute: true,
    });
    testFiles.push(...files);
  }

  // Apply filter if provided
  let filteredFiles = testFiles;
  if (options.filter) {
    filteredFiles = testFiles.filter(file =>
      path.basename(file).includes(options.filter!)
    );
  }

  if (filteredFiles.length === 0) {
    console.log('❌ No test files found matching criteria\n');
    process.exit(1);
  }

  console.log(`📁 Found ${filteredFiles.length} test file(s):\n`);
  for (const file of filteredFiles) {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`   - ${relativePath}`);
  }
  console.log('');

  // Configure test runner
  const stream = run({
    files: filteredFiles,
    concurrency: options.watch ? 1 : true,
    watch: options.watch,
    timeout: 30000, // 30 second timeout
  });

  // Use spec reporter for nice output
  stream.compose(specReporter).pipe(process.stdout);

  // Track results
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for await (const event of stream) {
    if (event.type === 'test:pass') {
      passed++;
    } else if (event.type === 'test:fail') {
      failed++;
    } else if (event.type === 'test:skip') {
      skipped++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed:  ${passed}`);
  console.log(`❌ Failed:  ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📈 Total:   ${passed + failed + skipped}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\n❌ Some tests failed\n');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
runTests().catch((error) => {
  console.error('❌ Error running tests:', error);
  process.exit(1);
});
