import { defineConfig } from "vitest/config";

/**
 * A package-wide test timeout, because the timeout is a property of THIS
 * PACKAGE'S TESTS rather than of any one of them.
 *
 * G-90 was filed when the copy census failed in CI on a timeout: it walks
 * the repository to DERIVE its own scope, which is the whole reason it
 * cannot go stale, and that walk costs about a second alone and far more
 * under contention. The fix raised the timeout ON THAT ONE TEST.
 *
 * That fixed the instance and not the class. This package holds SEVEN
 * repository-walking tests, across client-copy.test.ts and
 * frozen-records.test.ts, and exactly one carried the raise. Under a full
 * ten-package parallel run on 28 August, two of the other six failed
 * together: the census again and the frozen-records status walk.
 *
 * So the budget moves to the config, where it covers every walker in the
 * package including ones not written yet. A guard that fails for reasons
 * unrelated to what it guards trains the person watching to press the
 * button again, and a per-test raise leaves the next walker to rediscover
 * that on its own.
 *
 * 30 seconds is a proposal rather than a measurement: roughly thirty
 * times the observed solo cost, chosen so contention cannot reach it. A
 * walk that genuinely takes thirty seconds has a real problem and should
 * still fail.
 */
export default defineConfig({
  test: { testTimeout: 30_000 },
});
