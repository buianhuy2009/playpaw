#!/usr/bin/env node
/**
 * PawPlay E2E Headless CLI Test Runner
 * Executes all 4 test tiers (Tiers 1-4) in Node.js with zero external dependencies.
 */

const path = require('path');

// 1. Setup mock DOM and Web API environment
const envMock = require('./harness/environment_mock.js');
const mockEnv = envMock.setupMockEnvironment(globalThis);

// 2. Load framework and harness utilities
const framework = require('./harness/test_framework.js');
const eventSim = require('./harness/event_simulator.js');
const adapter = require('./harness/contract_adapter.js');

// 3. Load all test suites into the default runner
require('./suites/tier1_features.js');
require('./suites/tier2_boundaries.js');
require('./suites/tier3_pairwise.js');
require('./suites/tier4_scenarios.js');

// ANSI escape codes for formatting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

async function main() {
  console.log(`\n${BOLD}${CYAN}🐾 PawPlay Biological-Calibrated E2E Test Suite${RESET}`);
  console.log(`${DIM}Running 4-Tier Test Matrix (Features, Boundaries, Pairwise, Scenarios)...${RESET}\n`);

  framework.defaultRunner.onSuiteStart = (suite) => {
    console.log(`${BOLD}▶ ${suite.name}${RESET}`);
  };

  framework.defaultRunner.onTestEnd = (suite, test) => {
    if (test.status === 'passed') {
      console.log(`  ${GREEN}✓${RESET} ${DIM}${test.name}${RESET} ${DIM}(${test.durationMs}ms)${RESET}`);
    } else {
      console.log(`  ${RED}✗ ${test.name}${RESET}`);
      if (test.error) {
        console.log(`    ${RED}${test.error.message}${RESET}`);
        if (test.error.stack) {
          console.log(`    ${DIM}${test.error.stack.split('\n').slice(1, 4).join('\n    ')}${RESET}`);
        }
      }
    }
  };

  const results = await framework.defaultRunner.run();

  console.log(`\n${BOLD}============================================================${RESET}`);
  console.log(`${BOLD}Test Execution Summary:${RESET}`);
  console.log(`  Total Tests : ${BOLD}${results.total}${RESET}`);
  console.log(`  Passed      : ${GREEN}${BOLD}${results.passed}${RESET}`);
  console.log(`  Failed      : ${results.failed > 0 ? RED : GREEN}${BOLD}${results.failed}${RESET}`);
  console.log(`  Duration    : ${CYAN}${results.durationMs}ms${RESET}`);
  console.log(`${BOLD}============================================================${RESET}\n`);

  if (results.failed > 0) {
    console.error(`${RED}${BOLD}FAILED: ${results.failed} tests failed.${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}PASSED: All ${results.total} test cases across Tiers 1–4 passed with 100% success! 🐾${RESET}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`${RED}Fatal runner error:${RESET}`, err);
  process.exit(1);
});
