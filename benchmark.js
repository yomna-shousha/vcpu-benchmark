#!/usr/bin/env node
const os = require('os');
const { performance } = require('perf_hooks');

console.log('=== CLOUDFLARE WORKERS VCPU BENCHMARK ===');
console.log(`Node.js: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`CPUs Available: ${os.cpus().length}`);
console.log(`Build Time: ${new Date().toISOString()}`);

// CPU-intensive prime number computation
function heavyPrimeWork(iterations) {
  let count = 0;
  for (let k = 0; k < iterations; k++) {
    let n = (k * 48271) & 0x7fffffff;
    if (n < 3) {
      if (n === 2) count++;
      continue;
    }
    let isPrime = true;
    for (let i = 2; i * i <= n; i++) {
      if (n % i === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) count++;
  }
  return count;
}

// CPU-intensive matrix multiplication
function matrixMultiply(n, runs) {
  const size = n * n;
  const a = new Array(size);
  const b = new Array(size);
  const c = new Array(size);
  
  for (let i = 0; i < size; i++) {
    a[i] = (i % 7) + 1;
    b[i] = (i % 13) + 1;
    c[i] = 0;
  }
  
  for (let run = 0; run < runs; run++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += a[i * n + k] * b[k * n + j];
        }
        c[i * n + j] = sum;
      }
    }
  }
  
  return c.reduce((sum, val) => sum + val, 0);
}

// Run benchmarks
console.log('\n--- BENCHMARK RESULTS ---');

// Test 1: Prime computation
const primeStart = performance.now();
const primeResult = heavyPrimeWork(50000);
const primeTime = performance.now() - primeStart;

console.log(`Prime Test: ${primeResult} primes found in ${primeTime.toFixed(2)}ms`);

// Test 2: Matrix multiplication  
const matrixStart = performance.now();
const matrixResult = matrixMultiply(100, 3);
const matrixTime = performance.now() - matrixStart;

console.log(`Matrix Test: Result ${matrixResult} in ${matrixTime.toFixed(2)}ms`);

// Test 3: Parallel-style workload (multiple operations)
const parallelStart = performance.now();
const results = [];
for (let i = 0; i < 4; i++) {
  results.push(heavyPrimeWork(10000));
}
const parallelTime = performance.now() - parallelStart;

console.log(`Parallel Test: ${results.length} tasks in ${parallelTime.toFixed(2)}ms`);

// Summary metrics
const totalTime = primeTime + matrixTime + parallelTime;
console.log('\n--- SUMMARY ---');
console.log(`Total CPU Time: ${totalTime.toFixed(2)}ms`);
console.log(`CPU Score: ${(100000 / totalTime).toFixed(2)} (higher = better)`);
console.log(`Plan Type: ${process.env.CF_PLAN_TYPE || 'Unknown'}`);

// Create a simple worker for deployment
require('fs').writeFileSync('src/index.js', `
export default {
  async fetch(request) {
    const results = {
      timestamp: new Date().toISOString(),
      buildMetrics: {
        primeTime: ${primeTime.toFixed(2)},
        matrixTime: ${matrixTime.toFixed(2)}, 
        parallelTime: ${parallelTime.toFixed(2)},
        totalTime: ${totalTime.toFixed(2)},
        cpuScore: ${(100000 / totalTime).toFixed(2)},
        cpuCount: ${os.cpus().length}
      }
    };
    
    return new Response(JSON.stringify(results, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
`);

console.log('\n=== BENCHMARK COMPLETE ===\n');
