/**
 * Date Serialization Performance Benchmark
 *
 * Measures performance BEFORE and AFTER the Date refactoring to ensure
 * no significant regression.
 *
 * Target: < 5% performance regression
 */

import { serializeMemoryImageToJson, deserializeMemoryImageFromJson } from 'ireneo';

function benchmark(name: string, fn: () => void, iterations: number = 10000): number {
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const elapsed = Date.now() - start;
  console.log(`${name}: ${elapsed}ms (${iterations} iterations, ${(elapsed/iterations).toFixed(3)}ms avg)`);
  return elapsed;
}

console.log('=== Date Serialization Performance Benchmark ===\n');

// Baseline: Bare Date (current behavior)
const bareDateTime = benchmark('Bare Date serialization', () => {
  const date = new Date('2024-01-15T10:00:00.000Z');
  serializeMemoryImageToJson(date);
});

// Baseline: Date with properties (future behavior)
const dateWithPropsTime = benchmark('Date with properties serialization', () => {
  const date = new Date('2024-01-15T10:00:00.000Z');
  (date as any).location = "Room A";
  (date as any).attendees = ["Alice", "Bob"];
  serializeMemoryImageToJson(date);
});

// Baseline: Round-trip
const roundTripTime = benchmark('Date round-trip (serialize + deserialize)', () => {
  const date = new Date('2024-01-15T10:00:00.000Z');
  const json = serializeMemoryImageToJson(date);
  deserializeMemoryImageFromJson(json);
}, 5000);

console.log(`\n=== Baseline Summary ===`);
console.log(`Bare Date: ${bareDateTime}ms`);
console.log(`Date with props: ${dateWithPropsTime}ms`);
console.log(`Round-trip: ${roundTripTime}ms`);
console.log(`\nSave this output to .local/perf-baseline.txt`);
