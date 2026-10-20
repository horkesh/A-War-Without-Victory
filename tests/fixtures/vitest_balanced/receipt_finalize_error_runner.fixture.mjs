import { VitestTestRunner } from 'vitest/runners';

const nativeFinalize = VitestTestRunner.prototype.onAfterRunSuite;
VitestTestRunner.prototype.onAfterRunSuite = async function failAfterNativeFinalization(suite) {
  await nativeFinalize.call(this, suite);
  throw new Error('deliberate native finalization failure');
};

export { default } from '../../../tools/test/vitest_receipt_runner.mjs';
