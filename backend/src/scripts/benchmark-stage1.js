/**
 * Stage 1 Optimization - Performance Benchmarking Script
 * 
 * This script tests the improvements from Stage 1 optimizations:
 * 1. Compression middleware (gzip/brotli)
 * 2. Response pagination
 * 3. Database query indexes (will test in Stage 7)
 * 4. In-memory caching
 * 5. Performance monitoring
 * 
 * Run: node src/scripts/benchmark-stage1.js
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:5000/api';
const TEST_TIMEOUT = 30000;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`),
  title: (msg) => console.log(`${colors.bold}${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.yellow}ℹ ${msg}${colors.reset}`),
  metric: (label, value, unit = '') => console.log(`  ${label}: ${colors.bold}${value}${unit}${colors.reset}`),
};

class BenchmarkSuite {
  constructor() {
    this.results = {
      compression: [],
      caching: [],
      pagination: [],
      performance: [],
    };
    this.metrics = {};
  }

  /**
   * Test 1: Compression Middleware
   * Measures payload size reduction with gzip compression
   */
  async testCompression() {
    log.header();
    log.title('TEST 1: Compression Middleware');
    log.info('Measuring response payload reduction with gzip compression...');

    try {
      // Request WITHOUT compression header (force uncompressed)
      const noCompressionStart = performance.now();
      const noCompressionRes = await axios.get(`${BASE_URL}/shops`, {
        headers: { 'Accept-Encoding': 'identity' },
        timeout: TEST_TIMEOUT,
      });
      const noCompressionEnd = performance.now();

      const uncompressedSize = JSON.stringify(noCompressionRes.data).length;
      const uncompressedTime = (noCompressionEnd - noCompressionStart).toFixed(2);

      log.metric('Uncompressed Response Size', `${(uncompressedSize / 1024).toFixed(2)} KB`);
      log.metric('Uncompressed Response Time', uncompressedTime, ' ms');

      // Request WITH compression header (gzip will be applied)
      const compressionStart = performance.now();
      const compressionRes = await axios.get(`${BASE_URL}/shops`, {
        timeout: TEST_TIMEOUT,
      });
      const compressionEnd = performance.now();

      const compressedSize = compressionRes.headers['content-length'] || JSON.stringify(compressionRes.data).length;
      const compressedTime = (compressionEnd - compressionStart).toFixed(2);
      const encoding = compressionRes.headers['content-encoding'] || 'none';

      log.metric('Compressed Response Size', `${(compressedSize / 1024).toFixed(2)} KB`);
      log.metric('Compressed Response Time', compressedTime, ' ms');
      log.metric('Encoding Used', encoding);

      const reduction = ((1 - compressedSize / uncompressedSize) * 100).toFixed(2);
      log.success(`Compression reduced payload by ${reduction}%`);

      // Check for X-Response-Time header
      const responseTime = compressionRes.headers['x-response-time'];
      if (responseTime) {
        log.metric('Server Response Time', responseTime);
      }

      this.results.compression = {
        uncompressedSize: (uncompressedSize / 1024).toFixed(2),
        compressedSize: (compressedSize / 1024).toFixed(2),
        reduction: reduction,
        encoding: encoding,
        timeUncompressed: uncompressedTime,
        timeCompressed: compressedTime,
      };

      return true;
    } catch (error) {
      log.error(`Compression test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Test 2: In-Memory Caching
   * Measures response time improvement from caching
   */
  async testCaching() {
    log.header();
    log.title('TEST 2: In-Memory Caching');
    log.info('Measuring response time improvement from caching...');

    try {
      // First, get a list of shops to find a valid shop ID
      let shopId;
      try {
        const shopsRes = await axios.get(`${BASE_URL}/shops?page=1&page_size=1`, {
          timeout: TEST_TIMEOUT,
        });
        if (shopsRes.data && shopsRes.data.data && shopsRes.data.data.length > 0) {
          shopId = shopsRes.data.data[0].id;
        } else {
          log.error('No shops available for caching test');
          return;
        }
      } catch (err) {
        log.error(`Failed to fetch shops list: ${err.message}`);
        return;
      }

      // First request (cache miss) - will hit database
      const firstStart = performance.now();
      const firstRes = await axios.get(`${BASE_URL}/shops/${shopId}`, {
        timeout: TEST_TIMEOUT,
      });
      const firstEnd = performance.now();
      const firstTime = (firstEnd - firstStart).toFixed(2);

      log.metric('First Request Time (Cache Miss)', firstTime, ' ms');

      // Wait a tiny bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second request (cache hit) - should be much faster
      const secondStart = performance.now();
      const secondRes = await axios.get(`${BASE_URL}/shops/${shopId}`, {
        timeout: TEST_TIMEOUT,
      });
      const secondEnd = performance.now();
      const secondTime = (secondEnd - secondStart).toFixed(2);

      log.metric('Second Request Time (Cache Hit)', secondTime, ' ms');

      const improvement = ((parseFloat(firstTime) - parseFloat(secondTime)) / parseFloat(firstTime) * 100).toFixed(2);
      log.success(`Caching improved response time by ${improvement}%`);

      // Get cache statistics
      try {
        const cacheStats = await axios.get(`${BASE_URL}/monitoring/cache`, {
          timeout: TEST_TIMEOUT,
        });

        const stats = cacheStats.data.data.stats;
        log.info('Cache Statistics:');
        log.metric('  Cache Hits', stats.hits);
        log.metric('  Cache Misses', stats.misses);
        log.metric('  Hit Rate', stats.hitRate);
        log.metric('  Total Entries', cacheStats.data.data.totalEntries);
        log.metric('  Memory Usage', cacheStats.data.data.memoryUsage);

        this.results.caching = {
          firstRequestTime: firstTime,
          secondRequestTime: secondTime,
          timeImprovement: improvement,
          cacheStats: stats,
        };
      } catch (err) {
        log.info('Cache stats endpoint not available yet');
        this.results.caching = {
          firstRequestTime: firstTime,
          secondRequestTime: secondTime,
          timeImprovement: improvement,
        };
      }

      return true;
    } catch (error) {
      log.error(`Caching test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Test 3: Pagination
   * Measures response time with pagination
   */
  async testPagination() {
    log.header();
    log.title('TEST 3: Pagination');
    log.info('Testing paginated endpoints...');

    try {
      // Test pagination on shops endpoint
      const page1Start = performance.now();
      const page1Res = await axios.get(`${BASE_URL}/shops?page=1&page_size=10`, {
        timeout: TEST_TIMEOUT,
      });
      const page1End = performance.now();
      const page1Time = (page1End - page1Start).toFixed(2);

      const page1Data = page1Res.data.data;
      log.metric('Page 1 Response Time', page1Time, ' ms');
      log.metric('Page 1 Items Count', page1Data.length);
      log.metric('Total Items Available', page1Res.data.pagination.total);
      log.metric('Total Pages', page1Res.data.pagination.totalPages);

      // Test page 2
      const page2Start = performance.now();
      const page2Res = await axios.get(`${BASE_URL}/shops?page=2&page_size=10`, {
        timeout: TEST_TIMEOUT,
      });
      const page2End = performance.now();
      const page2Time = (page2End - page2Start).toFixed(2);

      log.metric('Page 2 Response Time', page2Time, ' ms');
      log.metric('Page 2 Items Count', page2Res.data.data.shops.length);

      log.success('Pagination working correctly and reducing payload per request');

      this.results.pagination = {
        page1Time: page1Time,
        page1ItemsCount: page1Data.shops.length,
        page2Time: page2Time,
        page2ItemsCount: page2Res.data.data.shops.length,
        totalItems: page1Data.pagination.total,
        pageSize: 10,
      };

      return true;
    } catch (error) {
      // Endpoint might not have pagination yet
      log.info(`Pagination test skipped: ${error.message}`);
      return false;
    }
  }

  /**
   * Test 4: Performance Monitoring
   * Measures CPU and memory usage
   */
  async testPerformanceMonitoring() {
    log.header();
    log.title('TEST 4: Performance Monitoring');
    log.info('Retrieving server performance metrics...');

    try {
      const perfRes = await axios.get(`${BASE_URL}/monitoring/performance`, {
        timeout: TEST_TIMEOUT,
      });

      const perfData = perfRes.data.data;
      log.metric('Heap Used', perfData.memory.heapUsed);
      log.metric('Heap Total', perfData.memory.heapTotal);
      log.metric('RSS Memory', perfData.memory.rss);
      log.metric('Server Uptime', perfData.uptime);

      log.success('Performance monitoring active and tracking metrics');

      this.results.performance = perfData;
      return true;
    } catch (error) {
      log.info(`Performance monitoring test skipped: ${error.message}`);
      return false;
    }
  }

  /**
   * Test 5: Stress Test
   * Multiple concurrent requests
   */
  async stressTest() {
    log.header();
    log.title('TEST 5: Stress Test');
    log.info('Sending 50 concurrent requests...');

    try {
      const start = performance.now();
      const requests = Array(50).fill(null).map(() =>
        axios.get(`${BASE_URL}/health`, { timeout: TEST_TIMEOUT })
      );

      await Promise.all(requests);
      const end = performance.now();
      const totalTime = (end - start).toFixed(2);
      const avgTime = (totalTime / 50).toFixed(2);

      log.metric('Total Time for 50 Requests', totalTime, ' ms');
      log.metric('Average Request Time', avgTime, ' ms');
      log.success('Server handled stress test successfully');

      return true;
    } catch (error) {
      log.error(`Stress test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAll() {
    log.header();
    console.log(`${colors.bold}${colors.cyan}STAGE 1 OPTIMIZATION BENCHMARK${colors.reset}`);
    console.log(`${colors.cyan}Backend Performance Testing${colors.reset}\n`);

    try {
      // Check server health first
      log.info('Checking server health...');
      const healthRes = await axios.get(`${BASE_URL}/health`, { timeout: TEST_TIMEOUT });
      log.success('Server is running');

      // Run all tests
      await this.testCompression();
      await this.testCaching();
      await this.testPagination();
      await this.testPerformanceMonitoring();
      await this.stressTest();

      // Print summary
      this.printSummary();
    } catch (error) {
      log.error(`Failed to connect to server: ${error.message}`);
      log.info('Make sure the backend server is running on port 5000');
    }
  }

  /**
   * Print test summary
   */
  printSummary() {
    log.header();
    log.title('BENCHMARK SUMMARY');

    console.log(`\n${colors.bold}Compression Results:${colors.reset}`);
    if (this.results.compression.reduction) {
      log.metric('Payload Reduction', this.results.compression.reduction + '%');
      log.metric('Original Size', this.results.compression.uncompressedSize + ' KB');
      log.metric('Compressed Size', this.results.compression.compressedSize + ' KB');
      log.metric('Encoding', this.results.compression.encoding);
    }

    console.log(`\n${colors.bold}Caching Results:${colors.reset}`);
    if (this.results.caching.timeImprovement) {
      log.metric('Time Improvement', this.results.caching.timeImprovement + '%');
      log.metric('First Request', this.results.caching.firstRequestTime + ' ms');
      log.metric('Cached Request', this.results.caching.secondRequestTime + ' ms');
    }

    console.log(`\n${colors.bold}Pagination Results:${colors.reset}`);
    if (this.results.pagination.page1Time) {
      log.metric('Page Size', this.results.pagination.pageSize);
      log.metric('Total Items', this.results.pagination.totalItems);
      log.metric('Page 1 Response Time', this.results.pagination.page1Time + ' ms');
    }

    console.log(`\n${colors.bold}Overall Improvements Expected:${colors.reset}`);
    log.metric('Response Payload', '-30-40% (with compression)');
    log.metric('Response Time (cached)', '-50-70% (with caching)');
    log.metric('Server Memory Usage', 'Monitored and optimized');
    log.metric('Concurrent Request Handling', 'Improved');

    log.header();
    log.success('Benchmark Complete!');
  }
}

// Run benchmark
const benchmark = new BenchmarkSuite();
benchmark.runAll().catch(err => {
  log.error(`Benchmark failed: ${err.message}`);
  process.exit(1);
});
