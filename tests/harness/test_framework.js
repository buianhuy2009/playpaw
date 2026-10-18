/**
 * PawPlay Zero-Dependency Test Framework
 * Lightweight async BDD test runner and assertion library
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PawPlayTestFramework = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class AssertionError extends Error {
    constructor(message, actual, expected) {
      super(message);
      this.name = 'AssertionError';
      this.actual = actual;
      this.expected = expected;
    }
  }

  function formatValue(v) {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return `"${v}"`;
    if (typeof v === 'function') return `[Function ${v.name || 'anonymous'}]`;
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v);
      } catch (e) {
        return Object.prototype.toString.call(v);
      }
    }
    return String(v);
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;

    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  function expect(actual) {
    return {
      toBe(expected) {
        if (actual !== expected) {
          throw new AssertionError(
            `Expected ${formatValue(actual)} to be strictly equal to ${formatValue(expected)}`,
            actual,
            expected
          );
        }
        return this;
      },
      notToBe(expected) {
        if (actual === expected) {
          throw new AssertionError(
            `Expected ${formatValue(actual)} not to be strictly equal to ${formatValue(expected)}`,
            actual,
            expected
          );
        }
        return this;
      },
      toEqual(expected) {
        if (!deepEqual(actual, expected)) {
          throw new AssertionError(
            `Expected ${formatValue(actual)} to deeply equal ${formatValue(expected)}`,
            actual,
            expected
          );
        }
        return this;
      },
      toBeCloseTo(expected, delta = 0.001) {
        if (typeof actual !== 'number' || typeof expected !== 'number') {
          throw new AssertionError(`Expected numbers for toBeCloseTo, received ${typeof actual} and ${typeof expected}`);
        }
        if (Math.abs(actual - expected) > delta) {
          throw new AssertionError(
            `Expected ${actual} to be close to ${expected} (delta: ${delta}), diff: ${Math.abs(actual - expected)}`,
            actual,
            expected
          );
        }
        return this;
      },
      toBeGreaterThan(expected) {
        if (!(actual > expected)) {
          throw new AssertionError(
            `Expected ${formatValue(actual)} to be greater than ${formatValue(expected)}`,
            actual,
            expected
          );
        }
        return this;
      },
      toBeGreaterThanOrEqual(expected) {
        if (!(actual >= expected)) {
          throw new AssertionError(
            `Expected ${formatValue(actual)} to be greater than or equal to ${formatValue(expected)}`,
            actual,
            expected
          );
        }
        return this;
      },
      toBeLessThan(expected) {
        if (!(actual < expected)) {
          throw new AssertionError(
            `Expected ${formatValue(actual)} to be less than ${formatValue(expected)}`,
            actual,
            expected
          );
        }
        return this;
      },
      toBeLessThanOrEqual(expected) {
        if (!(actual <= expected)) {
          throw new AssertionError(
            `Expected ${formatValue(actual)} to be less than or equal to ${formatValue(expected)}`,
            actual,
            expected
          );
        }
        return this;
      },
      toBeBetween(min, max) {
        if (actual < min || actual > max) {
          throw new AssertionError(
            `Expected ${formatValue(actual)} to be between ${min} and ${max}`,
            actual,
            { min, max }
          );
        }
        return this;
      },
      toBeTruthy() {
        if (!actual) {
          throw new AssertionError(`Expected ${formatValue(actual)} to be truthy`, actual, true);
        }
        return this;
      },
      toBeFalsy() {
        if (actual) {
          throw new AssertionError(`Expected ${formatValue(actual)} to be falsy`, actual, false);
        }
        return this;
      },
      toBeNull() {
        if (actual !== null) {
          throw new AssertionError(`Expected ${formatValue(actual)} to be null`, actual, null);
        }
        return this;
      },
      toBeUndefined() {
        if (actual !== undefined) {
          throw new AssertionError(`Expected ${formatValue(actual)} to be undefined`, actual, undefined);
        }
        return this;
      },
      toBeDefined() {
        if (actual === undefined) {
          throw new AssertionError(`Expected value to be defined`, actual, 'defined');
        }
        return this;
      },
      toContain(item) {
        if (Array.isArray(actual) || typeof actual === 'string') {
          if (!actual.includes(item)) {
            throw new AssertionError(
              `Expected ${formatValue(actual)} to contain ${formatValue(item)}`,
              actual,
              item
            );
          }
        } else if (actual instanceof Set || actual instanceof Map) {
          if (!actual.has(item)) {
            throw new AssertionError(
              `Expected Set/Map to contain key ${formatValue(item)}`,
              actual,
              item
            );
          }
        } else {
          throw new AssertionError(`Cannot check toContain on ${typeof actual}`);
        }
        return this;
      },
      get not() {
        return {
          toThrow(expectedError) {
            if (typeof actual !== 'function') {
              throw new AssertionError(`Expected a function to test toThrow, got ${typeof actual}`);
            }
            let threw = false;
            let thrownError = null;
            try {
              actual();
            } catch (err) {
              threw = true;
              thrownError = err;
            }
            if (threw) {
              throw new AssertionError(
                `Expected function not to throw, but it threw error: "${thrownError.message}"`,
                thrownError,
                null
              );
            }
            return this;
          },
          toBe(expected) {
            if (actual === expected) {
              throw new AssertionError(
                `Expected ${formatValue(actual)} not to be strictly equal to ${formatValue(expected)}`,
                actual,
                expected
              );
            }
            return this;
          },
          toEqual(expected) {
            if (deepEqual(actual, expected)) {
              throw new AssertionError(
                `Expected ${formatValue(actual)} not to deeply equal ${formatValue(expected)}`,
                actual,
                expected
              );
            }
            return this;
          }
        };
      },
      toThrow(expectedError) {
        if (typeof actual !== 'function') {
          throw new AssertionError(`Expected a function to test toThrow, got ${typeof actual}`);
        }
        let threw = false;
        let thrownError = null;
        try {
          actual();
        } catch (err) {
          threw = true;
          thrownError = err;
        }
        if (!threw) {
          throw new AssertionError(`Expected function to throw an error, but it returned normally.`);
        }
        if (expectedError) {
          if (typeof expectedError === 'string') {
            if (!thrownError.message.includes(expectedError)) {
              throw new AssertionError(
                `Expected thrown error message to include "${expectedError}", got "${thrownError.message}"`
              );
            }
          } else if (expectedError instanceof RegExp) {
            if (!expectedError.test(thrownError.message)) {
              throw new AssertionError(
                `Expected thrown error message to match ${expectedError}, got "${thrownError.message}"`
              );
            }
          }
        }
        return this;
      }
    };
  }

  class TestSuite {
    constructor(name) {
      this.name = name;
      this.tests = [];
      this.beforeEachHooks = [];
      this.afterEachHooks = [];
    }

    addTest(name, fn) {
      this.tests.push({ name, fn, status: 'pending', error: null, durationMs: 0 });
    }

    addBeforeEach(fn) {
      this.beforeEachHooks.push(fn);
    }

    addAfterEach(fn) {
      this.afterEachHooks.push(fn);
    }
  }

  class TestRunner {
    constructor() {
      this.suites = [];
      this.currentSuite = null;
      this.onTestStart = null;
      this.onTestEnd = null;
      this.onSuiteStart = null;
      this.onSuiteEnd = null;
    }

    describe(name, fn) {
      const suite = new TestSuite(name);
      this.suites.push(suite);
      const prevSuite = this.currentSuite;
      this.currentSuite = suite;
      try {
        fn();
      } finally {
        this.currentSuite = prevSuite;
      }
    }

    it(name, fn) {
      if (!this.currentSuite) {
        this.describe('Default Suite', () => {
          this.currentSuite.addTest(name, fn);
        });
      } else {
        this.currentSuite.addTest(name, fn);
      }
    }

    beforeEach(fn) {
      if (this.currentSuite) {
        this.currentSuite.addBeforeEach(fn);
      }
    }

    afterEach(fn) {
      if (this.currentSuite) {
        this.currentSuite.addAfterEach(fn);
      }
    }

    async run() {
      const results = {
        total: 0,
        passed: 0,
        failed: 0,
        durationMs: 0,
        suites: []
      };

      const runnerStart = Date.now();

      for (const suite of this.suites) {
        const suiteResult = {
          name: suite.name,
          tests: [],
          passed: 0,
          failed: 0,
          durationMs: 0
        };
        const suiteStart = Date.now();
        if (this.onSuiteStart) this.onSuiteStart(suite);

        for (const test of suite.tests) {
          results.total++;
          if (this.onTestStart) this.onTestStart(suite, test);
          const testStart = Date.now();

          try {
            for (const hook of suite.beforeEachHooks) {
              await hook();
            }

            await test.fn();
            test.status = 'passed';
            suiteResult.passed++;
            results.passed++;
          } catch (err) {
            test.status = 'failed';
            test.error = err;
            suiteResult.failed++;
            results.failed++;
          } finally {
            for (const hook of suite.afterEachHooks) {
              try {
                await hook();
              } catch (hookErr) {
                console.error('Error in afterEach hook:', hookErr);
              }
            }
          }

          test.durationMs = Date.now() - testStart;
          suiteResult.tests.push({
            name: test.name,
            status: test.status,
            durationMs: test.durationMs,
            error: test.error ? { message: test.error.message, stack: test.error.stack } : null
          });

          if (this.onTestEnd) this.onTestEnd(suite, test);
        }

        suiteResult.durationMs = Date.now() - suiteStart;
        results.suites.push(suiteResult);
        if (this.onSuiteEnd) this.onSuiteEnd(suite, suiteResult);
      }

      results.durationMs = Date.now() - runnerStart;
      return results;
    }
  }

  const defaultRunner = new TestRunner();

  return {
    TestRunner,
    defaultRunner,
    expect,
    describe: defaultRunner.describe.bind(defaultRunner),
    it: defaultRunner.it.bind(defaultRunner),
    beforeEach: defaultRunner.beforeEach.bind(defaultRunner),
    afterEach: defaultRunner.afterEach.bind(defaultRunner)
  };
});
