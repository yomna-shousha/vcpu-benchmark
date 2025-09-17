#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// --- BENCHMARK CONFIGURATION ---
const NUM_BUILDS = parseInt(process.argv[2], 10) || 20; // Default to 20 runs for accuracy
const PRIME_ITERATIONS = 200000; // Increased for longer CPU stress
const MATRIX_SIZE = 200; // Increased for higher computation load
const MATRIX_RUNS = 5; // Increased for more stress
const PARALLEL_TASKS = 8; // Increased to test more concurrency
const PARALLEL_TASK_ITERATIONS = 50000; // Increased iterations per parallel task

console.log('=== CLOUDFLARE WORKERS VCPU BENCHMARK ===');
console.log(`Node.js: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`CPUs Available: ${os.cpus().length}`);
console.log(`Build Time: ${new Date().toISOString()}`);
console.log(`Number of Runs per Test: ${NUM_BUILDS}`);

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

// Parallel I/O simulation with CPU-intensive sub-tasks
async function parallelIOSimulation(tasks, iterations) {
  const promises = [];
  for (let i = 0; i < tasks; i++) {
    promises.push(new Promise(resolve => {
      // Simulate I/O with a small delay
      setTimeout(() => {
        // Run a CPU-intensive sub-task after the "I/O" completes
        const result = heavyPrimeWork(iterations);
        resolve(result);
      }, Math.random() * 10); // Random delay to simulate real-world I/O jitter
    }));
  }
  await Promise.all(promises);
}

// Warmup function to eliminate cold-start effects
function warmupCPU() {
  console.log('Running warmup to eliminate cold-start effects...');
  heavyPrimeWork(10000);
  matrixMultiply(50, 1);
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
    const start = performance.now();
    await func(...args);
    const time = performance.now() - start;
    times.push(time);
    console.log(`- Run ${i + 1}: ${time.toFixed(2)}ms`);
  }
  
  const averageTime = times.reduce((sum, t) => sum + t, 0) / NUM_BUILDS;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const stdDev = calculateStdDev(times, averageTime);
  const variance = ((stdDev / averageTime) * 100).toFixed(1); // Use stdDev for a more robust variance metric
  
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
  warmupCPU();

  // Run benchmarks and collect data
  const primeResults = await runBenchmark('Prime Test', heavyPrimeWork, PRIME_ITERATIONS);
  const matrixResults = await runBenchmark('Matrix Test', matrixMultiply, MATRIX_SIZE, MATRIX_RUNS);
  const parallelResults = await runBenchmark('Parallel I/O Simulation', parallelIOSimulation, PARALLEL_TASKS, PARALLEL_TASK_ITERATIONS);
  
  // Summary metrics
  const totalAverageTime = primeResults.average + matrixResults.average + parallelResults.average;
  const totalMinTime = primeResults.min + matrixResults.min + parallelResults.min;
  const totalMaxTime = primeResults.max + matrixResults.max + parallelResults.max;
  const cpuScore = (100000 / totalAverageTime).toFixed(2);
  
  // Calculate overall consistency score (lower variance = more consistent = better)
  const avgVariance = (primeResults.variance + matrixResults.variance + parallelResults.variance) / 3;
  const consistencyScore = (100 - avgVariance).toFixed(1);
  
  console.log('\n=== DETAILED ANALYSIS ===');
  console.log(`Total Average CPU Time: ${totalAverageTime.toFixed(2)}ms`);
  console.log(`CPU Score (based on average): ${cpuScore} (higher = better)`);
  console.log(`Consistency Score: ${consistencyScore}% (higher = more consistent)`);
  console.log(`Average Variance Across Tests: ${avgVariance.toFixed(1)}%`);
  console.log(`Plan Type: ${process.env.CF_PLAN_TYPE || 'Unknown'}`);
  
  console.log('\n--- INDIVIDUAL TEST RESULTS ---');
  console.log(`Prime Test: ${primeResults.average.toFixed(2)}ms ±${primeResults.stdDev.toFixed(2)}ms (${primeResults.variance}% variance)`);
  console.log(`Matrix Test: ${matrixResults.average.toFixed(2)}ms ±${matrixResults.stdDev.toFixed(2)}ms (${matrixResults.variance}% variance)`);
  console.log(`Parallel I/O Simulation: ${parallelResults.average.toFixed(2)}ms ±${parallelResults.stdDev.toFixed(2)}ms (${parallelResults.variance}% variance)`);
  
  // Performance insights
  console.log('\n--- PERFORMANCE INSIGHTS ---');
  if (avgVariance > 15) {
    console.log('⚠️  High variance detected - results may be affected by system load');
  } else if (avgVariance < 5) {
    console.log('✅ Very consistent results - reliable performance environment');
  } else {
    console.log('✅ Acceptable variance - reasonably consistent performance');
  }
  
  if (parallelResults.average < (primeResults.average / (PRIME_ITERATIONS / PARALLEL_TASK_ITERATIONS))) {
    console.log('✅ Parallel workload shows performance benefits');
  } else {
    console.log('⚠️  Parallel workload may be CPU-bound or facing I/O contention');
  }
  
  // Create src directory and worker file
  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }
  
  const workerCode = `export default {
    async fetch(request) {
      const results = {
        timestamp: new Date().toISOString(),
        planType: "Free Plan",
        buildMetrics: {
          numRuns: ${NUM_BUILDS},
          primeTime: {
            average: ${primeResults.average.toFixed(2)},
            min: ${primeResults.min.toFixed(2)},
            max: ${primeResults.max.toFixed(2)},
            stdDev: ${primeResults.stdDev.toFixed(2)},
            variance: ${primeResults.variance}
          },
          matrixTime: {
            average: ${matrixResults.average.toFixed(2)},
            min: ${matrixResults.min.toFixed(2)},
            max: ${matrixResults.max.toFixed(2)},
            stdDev: ${matrixResults.stdDev.toFixed(2)},
            variance: ${matrixResults.variance}
          },
          parallelTime: {
            average: ${parallelResults.average.toFixed(2)},
            min: ${parallelResults.min.toFixed(2)},
            max: ${parallelResults.max.toFixed(2)},
            stdDev: ${parallelResults.stdDev.toFixed(2)},
            variance: ${parallelResults.variance}
          },
          totalTime: {
            average: ${totalAverageTime.toFixed(2)},
            min: ${totalMinTime.toFixed(2)},
            max: ${totalMaxTime.toFixed(2)}
          },
          cpuScore: ${cpuScore},
          consistencyScore: ${consistencyScore},
          averageVariance: ${avgVariance.toFixed(1)},
          cpuCount: ${os.cpus().length}
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
  
  console.log('\n=== BENCHMARK COMPLETE ===');
  console.log('🎯 SAVE THESE NUMBERS FOR COMPARISON:');
  console.log(`    CPU Score: ${cpuScore}`);
  console.log(`    Consistency Score: ${consistencyScore}%`);
  console.log(`    Prime Time (Avg): ${primeResults.average.toFixed(2)}ms ±${primeResults.stdDev.toFixed(2)}ms`);
  console.log(`    Matrix Time (Avg): ${matrixResults.average.toFixed(2)}ms ±${matrixResults.stdDev.toFixed(2)}ms`);
  console.log(`    Parallel I/O Simulation (Avg): ${parallelResults.average.toFixed(2)}ms ±${parallelResults.stdDev.toFixed(2)}ms`);
  console.log('\n📊 Access results via deployed worker endpoint after deployment');
  console.log('\n');
}

main();
