#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

// --- ENHANCED BENCHMARK CONFIGURATION ---
const NUM_BUILDS = parseInt(process.argv[2], 10) || 30; // Increased from 20
const PRIME_ITERATIONS = 1000000; // 5x increase from 200k
const MATRIX_SIZE = 400; // 2x increase from 200
const MATRIX_RUNS = 15; // 3x increase from 5
const PARALLEL_TASKS = 16; // 2x increase from 8
const PARALLEL_TASK_ITERATIONS = 200000; // 4x increase from 50k
const CRYPTO_ITERATIONS = 50000; // New crypto benchmark
const MEMORY_STRESS_SIZE = 100 * 1024 * 1024; // 100MB memory stress test
const FIBONACCI_N = 45; // Recursive fibonacci for stack stress
const SORTING_ARRAY_SIZE = 500000; // Large array sorting

console.log('=== ENHANCED CLOUDFLARE WORKERS VCPU BENCHMARK ===');
console.log(`Node.js: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`CPUs Available: ${os.cpus().length}`);
console.log(`Memory Available: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}GB`);
console.log(`Build Time: ${new Date().toISOString()}`);
console.log(`Number of Runs per Test: ${NUM_BUILDS}`);
console.log(`Estimated Runtime: 15-20 minutes`);

// Enhanced CPU-intensive prime number computation with better algorithm
function heavyPrimeWork(iterations) {
  let count = 0;
  const primes = [2];
  
  for (let n = 3; n <= iterations; n += 2) {
    let isPrime = true;
    const sqrtN = Math.sqrt(n);
    
    for (let i = 0; i < primes.length && primes[i] <= sqrtN; i++) {
      if (n % primes[i] === 0) {
        isPrime = false;
        break;
      }
    }
    
    if (isPrime) {
      primes.push(n);
      count++;
    }
  }
  
  return count;
}

// Enhanced matrix multiplication with more operations
function matrixMultiply(n, runs) {
  const size = n * n;
  const a = new Float64Array(size);
  const b = new Float64Array(size);
  const c = new Float64Array(size);
  const d = new Float64Array(size); // Additional matrix for more operations
  
  // Initialize with more complex values
  for (let i = 0; i < size; i++) {
    a[i] = Math.sin(i * 0.1) * 100;
    b[i] = Math.cos(i * 0.1) * 100;
    c[i] = 0;
    d[i] = 0;
  }
  
  for (let run = 0; run < runs; run++) {
    // Matrix multiplication A * B = C
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += a[i * n + k] * b[k * n + j];
        }
        c[i * n + j] = sum;
      }
    }
    
    // Additional matrix operations: C * A = D
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += c[i * n + k] * a[k * n + j];
        }
        d[i * n + j] = sum;
      }
    }
  }
  
  return d.reduce((sum, val) => sum + Math.abs(val), 0);
}

// Cryptographic operations benchmark
function cryptoIntensiveWork(iterations) {
  let result = 0;
  const data = Buffer.from('benchmark-data-for-hashing');
  
  for (let i = 0; i < iterations; i++) {
    // Multiple hash operations
    const sha256 = crypto.createHash('sha256').update(data).update(String(i)).digest();
    const sha512 = crypto.createHash('sha512').update(sha256).digest();
    const md5 = crypto.createHash('md5').update(sha512).digest();
    
    // PBKDF2 for CPU-intensive key derivation
    if (i % 100 === 0) {
      crypto.pbkdf2Sync(data, sha256, 1000, 32, 'sha256');
    }
    
    result += md5[0];
  }
  
  return result;
}

// Memory-intensive operations
function memoryStressTest(sizeBytes) {
  const arrays = [];
  const numArrays = 10;
  const arraySize = Math.floor(sizeBytes / numArrays / 8); // 8 bytes per Float64
  
  // Allocate multiple large arrays
  for (let i = 0; i < numArrays; i++) {
    const arr = new Float64Array(arraySize);
    
    // Fill with computed values
    for (let j = 0; j < arraySize; j++) {
      arr[j] = Math.sin(j * i * 0.001) * Math.cos(j * 0.001);
    }
    
    arrays.push(arr);
  }
  
  // Perform operations across arrays
  let result = 0;
  for (let i = 0; i < numArrays; i++) {
    for (let j = 0; j < Math.min(10000, arraySize); j++) {
      result += arrays[i][j] * arrays[(i + 1) % numArrays][j];
    }
  }
  
  return result;
}

// Recursive fibonacci for stack stress
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Large array sorting benchmark
function sortingBenchmark(size) {
  const arr = new Array(size);
  
  // Fill with random numbers
  for (let i = 0; i < size; i++) {
    arr[i] = Math.floor(Math.random() * 1000000);
  }
  
  // Multiple sorting algorithms
  const arr1 = [...arr];
  const arr2 = [...arr];
  const arr3 = [...arr];
  
  // Built-in sort
  arr1.sort((a, b) => a - b);
  
  // Quick sort implementation
  function quickSort(array, low = 0, high = array.length - 1) {
    if (low < high) {
      const pi = partition(array, low, high);
      quickSort(array, low, pi - 1);
      quickSort(array, pi + 1, high);
    }
  }
  
  function partition(array, low, high) {
    const pivot = array[high];
    let i = low - 1;
    
    for (let j = low; j < high; j++) {
      if (array[j] < pivot) {
        i++;
        [array[i], array[j]] = [array[j], array[i]];
      }
    }
    
    [array[i + 1], array[high]] = [array[high], array[i + 1]];
    return i + 1;
  }
  
  // Only sort a portion with quicksort to avoid stack overflow
  const sortSize = Math.min(size, 50000);
  quickSort(arr2.slice(0, sortSize));
  
  return arr1[0] + arr2[0];
}

// Enhanced parallel I/O simulation with mixed workloads
async function parallelIOSimulation(tasks, iterations) {
  const promises = [];
  
  for (let i = 0; i < tasks; i++) {
    promises.push(new Promise(resolve => {
      setTimeout(() => {
        let result = 0;
        
        // Mix different types of operations
        if (i % 4 === 0) {
          result = heavyPrimeWork(iterations / 10);
        } else if (i % 4 === 1) {
          result = cryptoIntensiveWork(iterations / 20);
        } else if (i % 4 === 2) {
          result = fibonacci(Math.min(35, Math.floor(iterations / 50000)));
        } else {
          result = sortingBenchmark(Math.min(50000, iterations));
        }
        
        resolve(result);
      }, Math.random() * 50); // Increased jitter
    }));
  }
  
  const results = await Promise.all(promises);
  return results.reduce((sum, val) => sum + val, 0);
}

// Comprehensive warmup
function warmupCPU() {
  console.log('Running comprehensive warmup to eliminate cold-start effects...');
  heavyPrimeWork(1000);
  matrixMultiply(50, 1);
  cryptoIntensiveWork(100);
  memoryStressTest(1024 * 1024); // 1MB
  fibonacci(20);
  sortingBenchmark(1000);
}

// Function to calculate standard deviation
function calculateStdDev(values, mean) {
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// Function to run a benchmark and record results
async function runBenchmark(name, func, ...args) {
  const times = [];
  console.log(`\n--- Running ${name} Benchmark (${NUM_BUILDS} times) ---`);
  
  for (let i = 0; i < NUM_BUILDS; i++) {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const start = performance.now();
    await func(...args);
    const time = performance.now() - start;
    times.push(time);
    console.log(`- Run ${i + 1}: ${time.toFixed(2)}ms`);
    
    // Progress indicator for longer tests
    if (i % 5 === 4) {
      const progress = ((i + 1) / NUM_BUILDS * 100).toFixed(1);
      console.log(`  Progress: ${progress}%`);
    }
  }
  
  const averageTime = times.reduce((sum, t) => sum + t, 0) / NUM_BUILDS;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const stdDev = calculateStdDev(times, averageTime);
  const variance = ((stdDev / averageTime) * 100).toFixed(1);
  
  console.log(`  Average: ${averageTime.toFixed(2)}ms`);
  console.log(`  Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
  console.log(`  Std Dev: ${stdDev.toFixed(2)}ms, Variance: ${variance}%`);
  
  return {
    name,
    average: averageTime,
    min: minTime,
    max: maxTime,
    stdDev: stdDev,
    variance: parseFloat(variance),
    rawTimes: times,
  };
}

async function main() {
  const startTime = performance.now();
  console.log('\n🚀 Starting enhanced benchmark suite...\n');
  
  warmupCPU();

  // Run all benchmarks
  const primeResults = await runBenchmark('Enhanced Prime Test', heavyPrimeWork, PRIME_ITERATIONS);
  const matrixResults = await runBenchmark('Enhanced Matrix Test', matrixMultiply, MATRIX_SIZE, MATRIX_RUNS);
  const cryptoResults = await runBenchmark('Cryptographic Operations', cryptoIntensiveWork, CRYPTO_ITERATIONS);
  const memoryResults = await runBenchmark('Memory Stress Test', memoryStressTest, MEMORY_STRESS_SIZE);
  const fibonacciResults = await runBenchmark('Recursive Fibonacci', fibonacci, FIBONACCI_N);
  const sortingResults = await runBenchmark('Large Array Sorting', sortingBenchmark, SORTING_ARRAY_SIZE);
  const parallelResults = await runBenchmark('Enhanced Parallel I/O Simulation', parallelIOSimulation, PARALLEL_TASKS, PARALLEL_TASK_ITERATIONS);
  
  // Summary metrics
  const allResults = [primeResults, matrixResults, cryptoResults, memoryResults, fibonacciResults, sortingResults, parallelResults];
  const totalAverageTime = allResults.reduce((sum, result) => sum + result.average, 0);
  const totalMinTime = allResults.reduce((sum, result) => sum + result.min, 0);
  const totalMaxTime = allResults.reduce((sum, result) => sum + result.max, 0);
  const cpuScore = (1000000 / totalAverageTime).toFixed(2); // Adjusted for more tests
  
  // Calculate overall consistency score
  const avgVariance = allResults.reduce((sum, result) => sum + result.variance, 0) / allResults.length;
  const consistencyScore = Math.max(0, 100 - avgVariance).toFixed(1);
  
  const totalTime = (performance.now() - startTime) / 1000;
  
  console.log('\n=== ENHANCED DETAILED ANALYSIS ===');
  console.log(`Total Benchmark Runtime: ${totalTime.toFixed(2)} seconds`);
  console.log(`Total Average CPU Time: ${totalAverageTime.toFixed(2)}ms`);
  console.log(`CPU Score (based on average): ${cpuScore} (higher = better)`);
  console.log(`Consistency Score: ${consistencyScore}% (higher = more consistent)`);
  console.log(`Average Variance Across Tests: ${avgVariance.toFixed(1)}%`);
  console.log(`Plan Type: ${process.env.CF_PLAN_TYPE || 'Unknown'}`);
  
  console.log('\n--- INDIVIDUAL TEST RESULTS ---');
  allResults.forEach(result => {
    console.log(`${result.name}: ${result.average.toFixed(2)}ms ±${result.stdDev.toFixed(2)}ms (${result.variance}% variance)`);
  });
  
  // Enhanced performance insights
  console.log('\n--- PERFORMANCE INSIGHTS ---');
  if (avgVariance > 20) {
    console.log('🔴 Very high variance detected - significant system load or resource contention');
  } else if (avgVariance > 15) {
    console.log('⚠️  High variance detected - results may be affected by system load');
  } else if (avgVariance < 5) {
    console.log('✅ Very consistent results - reliable performance environment');
  } else {
    console.log('✅ Acceptable variance - reasonably consistent performance');
  }
  
  if (totalTime > 900) { // 15 minutes
    console.log('⚠️  Very long runtime - approaching timeout limits');
  } else if (totalTime > 600) { // 10 minutes
    console.log('⚡ Substantial runtime - good stress test coverage');
  }
  
  // Resource utilization insights
  console.log('\n--- RESOURCE UTILIZATION INSIGHTS ---');
  console.log(`Memory stress test: ${(MEMORY_STRESS_SIZE / 1024 / 1024).toFixed(0)}MB allocation`);
  console.log(`Crypto operations: ${CRYPTO_ITERATIONS.toLocaleString()} iterations`);
  console.log(`Prime calculations: ${PRIME_ITERATIONS.toLocaleString()} iterations`);
  console.log(`Matrix operations: ${MATRIX_SIZE}x${MATRIX_SIZE} * ${MATRIX_RUNS} runs`);
  
  // Create enhanced worker with all results
  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }
  
  const workerCode = `export default {
    async fetch(request) {
      const results = {
        timestamp: new Date().toISOString(),
        planType: "Enhanced Stress Test",
        runtime: ${totalTime.toFixed(2)},
        buildMetrics: {
          numRuns: ${NUM_BUILDS},
          ${allResults.map(result => `
          ${result.name.toLowerCase().replace(/[^a-z0-9]/g, '')}Time: {
            average: ${result.average.toFixed(2)},
            min: ${result.min.toFixed(2)},
            max: ${result.max.toFixed(2)},
            stdDev: ${result.stdDev.toFixed(2)},
            variance: ${result.variance}
          }`).join(',')}
          ,
          totalTime: {
            average: ${totalAverageTime.toFixed(2)},
            min: ${totalMinTime.toFixed(2)},
            max: ${totalMaxTime.toFixed(2)}
          },
          cpuScore: ${cpuScore},
          consistencyScore: ${consistencyScore},
          averageVariance: ${avgVariance.toFixed(1)},
          cpuCount: ${os.cpus().length},
          memoryGB: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}
        },
        testConfiguration: {
          primeIterations: ${PRIME_ITERATIONS},
          matrixSize: ${MATRIX_SIZE},
          matrixRuns: ${MATRIX_RUNS},
          cryptoIterations: ${CRYPTO_ITERATIONS},
          memoryStressMB: ${MEMORY_STRESS_SIZE / 1024 / 1024},
          fibonacciN: ${FIBONACCI_N},
          sortingArraySize: ${SORTING_ARRAY_SIZE},
          parallelTasks: ${PARALLEL_TASKS},
          parallelTaskIterations: ${PARALLEL_TASK_ITERATIONS}
        }
      };
      
      return new Response(JSON.stringify(results, null, 2), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  };`;
  
  fs.writeFileSync(path.join(srcDir, 'index.js'), workerCode);
  
  console.log('\n=== ENHANCED BENCHMARK COMPLETE ===');
  console.log(`⏱️  Total Runtime: ${totalTime.toFixed(2)} seconds`);
  console.log('🎯 SAVE THESE ENHANCED NUMBERS FOR COMPARISON:');
  console.log(`    CPU Score: ${cpuScore}`);
  console.log(`    Consistency Score: ${consistencyScore}%`);
  console.log(`    Total Average Time: ${totalAverageTime.toFixed(2)}ms`);
  allResults.forEach(result => {
    console.log(`    ${result.name}: ${result.average.toFixed(2)}ms ±${result.stdDev.toFixed(2)}ms`);
  });
  console.log('\n📊 Access enhanced results via deployed worker endpoint after deployment');
  console.log('\n');
}

main().catch(console.error);
