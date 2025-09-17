#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const crypto = require('crypto');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// --- REFINED BENCHMARK CONFIGURATION ---
const args = process.argv.slice(2);
const NUM_BUILDS = parseInt(args.find(arg => arg.startsWith('--runs='))?.split('=')[1]) || 50;
const FORCE_THREADS = args.includes('--threads') || parseInt(args.find(arg => arg.startsWith('--threads='))?.split('=')[1]) || false;
const ENABLE_GC = args.includes('--gc');
const VARIANCE_RUNS = parseInt(args.find(arg => arg.startsWith('--variance-runs='))?.split('=')[1]) || 100;

// Enhanced computational loads
const PRIME_ITERATIONS = 3000000;
const MATRIX_SIZE = 600;
const MATRIX_RUNS = 25;
const PARALLEL_TASKS = 24;
const PARALLEL_TASK_ITERATIONS = 400000;
const CRYPTO_ITERATIONS = 100000;
const MEMORY_STRESS_SIZE = 200 * 1024 * 1024; // 200MB
const FIBONACCI_N = 47;
const SORTING_ARRAY_SIZE = 1000000;

// New advanced test parameters
const EVENT_LOOP_TASKS = 10000;
const RECURSIVE_TREE_DEPTH = 8;
const MEMORY_BANDWIDTH_SIZE = 500 * 1024 * 1024; // 500MB for bandwidth testing
const HTTP_SIM_REQUESTS = 1000;

const USE_WORKER_THREADS = FORCE_THREADS || os.cpus().length > 1;
const MAX_WORKERS = Math.min(os.cpus().length, 8);

console.log('=== REFINED ENTERPRISE CLOUDFLARE WORKERS BENCHMARK ===');
console.log(`Node.js: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`CPUs Available: ${os.cpus().length}`);
console.log(`Memory Available: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}GB`);
console.log(`Free Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)}GB`);
console.log(`Worker Threads: ${USE_WORKER_THREADS ? 'Enabled' : 'Disabled'}`);
console.log(`Max Workers: ${MAX_WORKERS}`);
console.log(`GC Exposed: ${ENABLE_GC && global.gc ? 'Yes' : 'No'}`);
console.log(`Standard Runs: ${NUM_BUILDS}, Variance Runs: ${VARIANCE_RUNS}`);
console.log(`Build Time: ${new Date().toISOString()}`);
console.log(`Estimated Runtime: 25-30 minutes`);

// Enhanced memory tracking
let peakMemoryUsage = 0;
function trackMemory() {
  const usage = process.memoryUsage();
  peakMemoryUsage = Math.max(peakMemoryUsage, usage.heapUsed);
  return usage;
}

// Async wrapper for consistent timing
async function asyncWrapper(syncFunc, ...args) {
  return new Promise((resolve) => {
    setImmediate(() => {
      const result = syncFunc(...args);
      resolve(result);
    });
  });
}

// Parallel Fibonacci using worker threads
async function parallelFibonacci(n) {
  if (!USE_WORKER_THREADS || n < 35) {
    return asyncWrapper(sequentialFibonacci, n);
  }

  const fibWorkerCode = `
    const { parentPort, workerData } = require('worker_threads');
    
    function fib(n) {
      if (n <= 1) return n;
      return fib(n - 1) + fib(n - 2);
    }
    
    const result = fib(workerData.n);
    parentPort.postMessage(result);
  `;

  // Split into parallel tasks for n-1 and n-2
  const promises = [
    new Promise((resolve, reject) => {
      const worker = new Worker(fibWorkerCode, {
        eval: true,
        workerData: { n: n - 1 }
      });
      worker.on('message', resolve);
      worker.on('error', reject);
    }),
    new Promise((resolve, reject) => {
      const worker = new Worker(fibWorkerCode, {
        eval: true,
        workerData: { n: n - 2 }
      });
      worker.on('message', resolve);
      worker.on('error', reject);
    })
  ];

  const [fib1, fib2] = await Promise.all(promises);
  return fib1 + fib2;
}

function sequentialFibonacci(n) {
  if (n <= 1) return n;
  return sequentialFibonacci(n - 1) + sequentialFibonacci(n - 2);
}

// Enhanced multi-threaded prime sieve with configurable workers
async function configurablePrimeSieve(limit, numWorkers = MAX_WORKERS) {
  if (!USE_WORKER_THREADS) {
    return asyncWrapper(singleThreadedPrimeSieve, limit);
  }

  const chunkSize = Math.floor(limit / numWorkers);
  const workerPromises = [];

  const primeWorkerCode = `
    const { parentPort, workerData } = require('worker_threads');
    
    function sievePrimes(start, end) {
      const primes = [];
      for (let n = Math.max(start, 2); n <= end; n++) {
        let isPrime = true;
        const sqrtN = Math.sqrt(n);
        for (let i = 2; i <= sqrtN; i++) {
          if (n % i === 0) {
            isPrime = false;
            break;
          }
        }
        if (isPrime) primes.push(n);
      }
      return primes.length;
    }
    
    const result = sievePrimes(workerData.start, workerData.end);
    parentPort.postMessage(result);
  `;

  for (let i = 0; i < numWorkers; i++) {
    const start = i * chunkSize;
    const end = i === numWorkers - 1 ? limit : (i + 1) * chunkSize;
    
    const promise = new Promise((resolve, reject) => {
      const worker = new Worker(primeWorkerCode, {
        eval: true,
        workerData: { start, end }
      });
      
      worker.on('message', resolve);
      worker.on('error', reject);
      
      setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker timeout'));
      }, 60000);
    });
    
    workerPromises.push(promise);
  }

  const results = await Promise.all(workerPromises);
  return results.reduce((sum, count) => sum + count, 0);
}

function singleThreadedPrimeSieve(limit) {
  let count = 0;
  for (let n = 2; n <= limit; n++) {
    let isPrime = true;
    const sqrtN = Math.sqrt(n);
    for (let i = 2; i <= sqrtN; i++) {
      if (n % i === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) count++;
  }
  return count;
}

// Memory bandwidth stress test
async function memoryBandwidthStress(sizeBytes) {
  return asyncWrapper(() => {
    const numArrays = 8;
    const arraySize = Math.floor(sizeBytes / numArrays / 8);
    const arrays = [];
    
    // Allocate arrays
    for (let i = 0; i < numArrays; i++) {
      arrays.push(new Float64Array(arraySize));
    }
    
    // Initialize with cache-unfriendly patterns
    for (let i = 0; i < numArrays; i++) {
      for (let j = 0; j < arraySize; j += 64) { // 64-element stride for cache misses
        arrays[i][j] = Math.sin(j * i * 0.001);
      }
    }
    
    // Memory bandwidth test - sustained reads/writes
    let result = 0;
    for (let iteration = 0; iteration < 10; iteration++) {
      for (let i = 0; i < numArrays; i++) {
        const src = arrays[i];
        const dest = arrays[(i + 1) % numArrays];
        
        // Stream processing with cache-unfriendly access
        for (let j = 0; j < arraySize; j += 64) {
          dest[j] = src[j] * 1.1 + src[(j + 32) % arraySize] * 0.9;
          result += dest[j];
        }
      }
    }
    
    return result;
  });
}

// Event loop stress test
async function eventLoopStress(numTasks) {
  const tasks = [];
  
  for (let i = 0; i < numTasks; i++) {
    if (i % 3 === 0) {
      tasks.push(new Promise(resolve => setImmediate(() => resolve(i))));
    } else if (i % 3 === 1) {
      tasks.push(new Promise(resolve => setTimeout(() => resolve(i), 0)));
    } else {
      tasks.push(Promise.resolve().then(() => i));
    }
  }
  
  const results = await Promise.all(tasks);
  return results.reduce((sum, val) => sum + val, 0);
}

// Recursive task tree with parallel workers
async function recursiveTaskTree(depth, branchFactor = 3) {
  if (depth <= 0) return 1;
  
  if (!USE_WORKER_THREADS || depth <= 2) {
    // Sequential fallback
    let sum = 0;
    for (let i = 0; i < branchFactor; i++) {
      sum += await recursiveTaskTree(depth - 1, branchFactor);
    }
    return sum + 1;
  }
  
  const treeWorkerCode = `
    const { parentPort, workerData } = require('worker_threads');
    
    async function taskTree(depth, branchFactor) {
      if (depth <= 0) return 1;
      
      let sum = 0;
      for (let i = 0; i < branchFactor; i++) {
        sum += await taskTree(depth - 1, branchFactor);
      }
      return sum + 1;
    }
    
    taskTree(workerData.depth, workerData.branchFactor).then(result => {
      parentPort.postMessage(result);
    });
  `;
  
  const promises = [];
  for (let i = 0; i < branchFactor; i++) {
    const promise = new Promise((resolve, reject) => {
      const worker = new Worker(treeWorkerCode, {
        eval: true,
        workerData: { depth: depth - 1, branchFactor }
      });
      
      worker.on('message', resolve);
      worker.on('error', reject);
    });
    
    promises.push(promise);
  }
  
  const results = await Promise.all(promises);
  return results.reduce((sum, val) => sum + val, 0) + 1;
}

// HTTP request simulation
async function httpRequestSimulation(numRequests) {
  const requests = [];
  
  for (let i = 0; i < numRequests; i++) {
    const delay = Math.random() * 10; // Simulate network jitter
    const request = new Promise(resolve => {
      setTimeout(() => {
        // Simulate JSON processing
        const data = { id: i, timestamp: Date.now(), payload: 'x'.repeat(100) };
        const processed = JSON.parse(JSON.stringify(data));
        resolve(processed.payload.length + processed.id);
      }, delay);
    });
    
    requests.push(request);
  }
  
  const results = await Promise.all(requests);
  return results.reduce((sum, val) => sum + val, 0);
}

// Enhanced statistics with percentiles
function calculateComprehensiveStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const percentile = (p) => sorted[Math.floor(sorted.length * p / 100)] || sorted[sorted.length - 1];
  
  return {
    mean,
    median: percentile(50),
    min: Math.min(...values),
    max: Math.max(...values),
    stdDev,
    variance: (stdDev / mean) * 100,
    p5: percentile(5),
    p25: percentile(25),
    p75: percentile(75),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99),
    range: Math.max(...values) - Math.min(...values),
    iqr: percentile(75) - percentile(25)
  };
}

// Enhanced benchmark runner with proper GC and memory tracking
async function runRefinedBenchmark(name, func, isVarianceSensitive = false, ...args) {
  const numRuns = isVarianceSensitive ? VARIANCE_RUNS : NUM_BUILDS;
  const times = [];
  const memorySnapshots = [];
  
  console.log(`\n--- Running ${name} Benchmark (${numRuns} times) ---`);
  
  for (let i = 0; i < numRuns; i++) {
    // Optional garbage collection
    if (ENABLE_GC && global.gc) {
      global.gc();
    }
    
    const memBefore = trackMemory();
    const start = performance.now();
    
    await func(...args);
    
    const time = performance.now() - start;
    const memAfter = trackMemory();
    
    times.push(time);
    memorySnapshots.push({
      heapUsed: (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024,
      external: (memAfter.external - memBefore.external) / 1024 / 1024,
      peak: peakMemoryUsage / 1024 / 1024
    });
    
    console.log(`- Run ${i + 1}: ${time.toFixed(2)}ms (Heap: ${memorySnapshots[i].heapUsed.toFixed(1)}MB)`);
    
    if (i % 10 === 9) {
      const progress = ((i + 1) / numRuns * 100).toFixed(1);
      console.log(`  Progress: ${progress}%`);
    }
  }
  
  const stats = calculateComprehensiveStats(times);
  const avgMemory = memorySnapshots.reduce((sum, mem) => sum + mem.heapUsed, 0) / memorySnapshots.length;
  const peakMemory = Math.max(...memorySnapshots.map(m => m.peak));
  
  console.log(`  Mean: ${stats.mean.toFixed(2)}ms, Median: ${stats.median.toFixed(2)}ms`);
  console.log(`  Min: ${stats.min.toFixed(2)}ms, Max: ${stats.max.toFixed(2)}ms, Range: ${stats.range.toFixed(2)}ms`);
  console.log(`  P5: ${stats.p5.toFixed(2)}ms, P95: ${stats.p95.toFixed(2)}ms, P99: ${stats.p99.toFixed(2)}ms`);
  console.log(`  Std Dev: ${stats.stdDev.toFixed(2)}ms, Variance: ${stats.variance.toFixed(1)}%, IQR: ${stats.iqr.toFixed(2)}ms`);
  console.log(`  Memory - Avg: ${avgMemory.toFixed(1)}MB, Peak: ${peakMemory.toFixed(1)}MB`);
  
  return {
    name,
    stats,
    memory: { average: avgMemory, peak: peakMemory },
    rawTimes: times,
    numRuns
  };
}

// Comprehensive warmup with heap stress
function comprehensiveWarmup() {
  console.log('Running comprehensive warmup with heap stress...');
  
  // Allocate and deallocate to stress heap
  const tempArrays = [];
  for (let i = 0; i < 50; i++) {
    tempArrays.push(new Float64Array(100000));
  }
  
  // Run small versions of each test
  singleThreadedPrimeSieve(1000);
  sequentialFibonacci(20);
  
  // Clear temp arrays
  tempArrays.length = 0;
  
  if (ENABLE_GC && global.gc) {
    global.gc();
  }
}

async function main() {
  const startTime = performance.now();
  console.log('\n🚀 Starting refined enterprise benchmark suite...\n');
  
  comprehensiveWarmup();
  
  // Run all benchmarks with proper async/await consistency
  const results = [];
  
  results.push(await runRefinedBenchmark('Configurable Prime Sieve', configurablePrimeSieve, true, PRIME_ITERATIONS));
  results.push(await runRefinedBenchmark('Parallel Fibonacci', parallelFibonacci, false, FIBONACCI_N));
  results.push(await runRefinedBenchmark('Memory Bandwidth Stress', memoryBandwidthStress, true, MEMORY_BANDWIDTH_SIZE));
  results.push(await runRefinedBenchmark('Event Loop Stress', eventLoopStress, true, EVENT_LOOP_TASKS));
  results.push(await runRefinedBenchmark('Recursive Task Tree', recursiveTaskTree, false, RECURSIVE_TREE_DEPTH));
  results.push(await runRefinedBenchmark('HTTP Request Simulation', httpRequestSimulation, true, HTTP_SIM_REQUESTS));
  
  const totalTime = (performance.now() - startTime) / 1000;
  const totalAverageTime = results.reduce((sum, result) => sum + result.stats.mean, 0);
  const avgVariance = results.reduce((sum, result) => sum + result.stats.variance, 0) / results.length;
  const enterpriseCpuScore = (50000000 / totalAverageTime).toFixed(2);
  const consistencyScore = Math.max(0, 100 - avgVariance).toFixed(1);
  const totalPeakMemory = (peakMemoryUsage / 1024 / 1024).toFixed(1);
  
  console.log('\n=== REFINED ENTERPRISE ANALYSIS ===');
  console.log(`Total Runtime: ${totalTime.toFixed(2)} seconds`);
  console.log(`Total Average CPU Time: ${totalAverageTime.toFixed(2)}ms`);
  console.log(`Enterprise CPU Score: ${enterpriseCpuScore} (higher = better)`);
  console.log(`Consistency Score: ${consistencyScore}% (higher = more consistent)`);
  console.log(`Average Variance: ${avgVariance.toFixed(1)}%`);
  console.log(`Peak Memory Usage: ${totalPeakMemory}MB`);
  console.log(`Worker Threads Utilized: ${USE_WORKER_THREADS}`);
  console.log(`Max Workers: ${MAX_WORKERS}`);
  
  console.log('\n--- COMPREHENSIVE RESULTS ---');
  results.forEach(result => {
    console.log(`${result.name} (${result.numRuns} runs):`);
    console.log(`  Mean: ${result.stats.mean.toFixed(2)}ms ±${result.stats.stdDev.toFixed(2)}ms (${result.stats.variance.toFixed(1)}% var)`);
    console.log(`  Range: ${result.stats.min.toFixed(2)}-${result.stats.max.toFixed(2)}ms, IQR: ${result.stats.iqr.toFixed(2)}ms`);
    console.log(`  Percentiles: P95=${result.stats.p95.toFixed(2)}ms, P99=${result.stats.p99.toFixed(2)}ms`);
    console.log(`  Memory: Avg=${result.memory.average.toFixed(1)}MB, Peak=${result.memory.peak.toFixed(1)}MB`);
  });
  
  // Write comprehensive JSON results to file for deployment
  const resultsFile = path.join(process.cwd(), 'benchmark-results.json');
  const comprehensiveResults = {
    timestamp: new Date().toISOString(),
    planType: "Refined Enterprise Test",
    runtime: totalTime,
    workerThreadsUsed: USE_WORKER_THREADS,
    maxWorkers: MAX_WORKERS,
    gcEnabled: ENABLE_GC && !!global.gc,
    peakMemoryMB: parseFloat(totalPeakMemory),
    buildMetrics: {
      standardRuns: NUM_BUILDS,
      varianceRuns: VARIANCE_RUNS,
      totalAverageTime: totalAverageTime,
      enterpriseCpuScore: parseFloat(enterpriseCpuScore),
      consistencyScore: parseFloat(consistencyScore),
      averageVariance: parseFloat(avgVariance.toFixed(1)),
      benchmarks: results.map(result => ({
        name: result.name,
        numRuns: result.numRuns,
        mean: parseFloat(result.stats.mean.toFixed(2)),
        median: parseFloat(result.stats.median.toFixed(2)),
        min: parseFloat(result.stats.min.toFixed(2)),
        max: parseFloat(result.stats.max.toFixed(2)),
        stdDev: parseFloat(result.stats.stdDev.toFixed(2)),
        variance: parseFloat(result.stats.variance.toFixed(1)),
        p5: parseFloat(result.stats.p5.toFixed(2)),
        p25: parseFloat(result.stats.p25.toFixed(2)),
        p75: parseFloat(result.stats.p75.toFixed(2)),
        p90: parseFloat(result.stats.p90.toFixed(2)),
        p95: parseFloat(result.stats.p95.toFixed(2)),
        p99: parseFloat(result.stats.p99.toFixed(2)),
        iqr: parseFloat(result.stats.iqr.toFixed(2)),
        memoryAvgMB: parseFloat(result.memory.average.toFixed(1)),
        memoryPeakMB: parseFloat(result.memory.peak.toFixed(1))
      }))
    },
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      cpuCount: os.cpus().length,
      totalMemoryGB: parseFloat((os.totalmem() / 1024 / 1024 / 1024).toFixed(2)),
      freeMemoryGB: parseFloat((os.freemem() / 1024 / 1024 / 1024).toFixed(2))
    }
  };
  
  fs.writeFileSync(resultsFile, JSON.stringify(comprehensiveResults, null, 2));
  
  // Create streamlined worker that serves the JSON file
  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }
  
  const workerCode = `export default {
    async fetch(request) {
      const url = new URL(request.url);
      
      if (url.pathname === '/raw') {
        // Serve raw benchmark data
        const results = ${JSON.stringify(comprehensiveResults)};
        return new Response(JSON.stringify(results, null, 2), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
          }
        });
      }
      
      // Serve summary
      return new Response(\`# Refined Enterprise Benchmark Results

**Enterprise CPU Score**: ${enterpriseCpuScore}
**Consistency Score**: ${consistencyScore}%
**Total Runtime**: ${totalTime.toFixed(2)} seconds
**Peak Memory**: ${totalPeakMemory}MB
**Worker Threads**: ${USE_WORKER_THREADS ? 'Enabled' : 'Disabled'}
**Max Workers**: ${MAX_WORKERS}

## Results Summary
${results.map(r => `- **${r.name}**: ${r.stats.mean.toFixed(2)}ms ±${r.stats.stdDev.toFixed(2)}ms (${r.stats.variance.toFixed(1)}% variance)`).join('\n')}

Access full JSON data at: /raw
\`, {
        headers: { 
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  };`;
  
  fs.writeFileSync(path.join(srcDir, 'index.js'), workerCode);
  
  console.log('\n=== REFINED BENCHMARK COMPLETE ===');
  console.log(`Runtime: ${totalTime.toFixed(2)} seconds`);
  console.log(`Enterprise CPU Score: ${enterpriseCpuScore}`);
  console.log(`Consistency Score: ${consistencyScore}%`);
  console.log(`Peak Memory: ${totalPeakMemory}MB`);
  console.log(`Results saved to: benchmark-results.json`);
  console.log('\nAccess results via deployed worker endpoint or /raw for JSON');
  
  // Performance insights
  console.log('\n--- INSIGHTS ---');
  if (avgVariance > 25) {
    console.log('High variance detected - significant resource contention');
  } else if (avgVariance < 5) {
    console.log('Exceptional consistency - premium performance environment');
  }
  
  if (USE_WORKER_THREADS) {
    console.log(`Multi-threading active with ${MAX_WORKERS} workers`);
  } else {
    console.log('Single-threaded mode - limited scalability');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
