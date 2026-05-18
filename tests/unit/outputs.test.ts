import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ResultData } from '../../src/types.js';
import result from '../../cli/mock/result.json' with { type: 'json' };

const { mockSetOutput, mockLoggerInfo, mockLoggerWarning } = vi.hoisted(() => ({
  mockSetOutput: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerWarning: vi.fn(),
}));

vi.mock('@actions/core', () => ({
  setOutput: mockSetOutput,
  setFailed: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  notice: vi.fn(),
}));

vi.mock('../../src/utils/helpers.js', () => ({
  Logger: {
    info: mockLoggerInfo,
    warning: mockLoggerWarning,
    error: vi.fn(),
    debug: vi.fn(),
    notice: vi.fn(),
  },
}));

import { setOutputs } from '../../src/utils/outputs.js';

describe('setOutputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('individual output properties', () => {
    it('sets tracks output when tracks property exists', async () => {
      const testResult = { tracks: ['alpha', 'beta'] } as unknown as ResultData;

      await setOutputs(testResult);

      expect(mockSetOutput).toHaveBeenCalledWith(
        'tracks',
        testResult.tracks
      );
      expect(mockSetOutput).toHaveBeenCalledTimes(1);
    });

    it('sets apks output when apks property exists', async () => {
      const testResult = { apks: ['apk1', 'apk2'] } as unknown as ResultData;

      await setOutputs(testResult);

      expect(mockSetOutput).toHaveBeenCalledWith('apks', testResult.apks);
      expect(mockSetOutput).toHaveBeenCalledTimes(1);
    });

    it('sets bundles output when bundles property exists', async () => {
      const testResult = { bundles: ['bundle1'] } as unknown as ResultData;

      await setOutputs(testResult);

      expect(mockSetOutput).toHaveBeenCalledWith(
        'bundles',
        testResult.bundles
      );
      expect(mockSetOutput).toHaveBeenCalledTimes(1);
    });

    it('sets listings output when listings property exists', async () => {
      const testResult = { listings: ['listing1'] } as unknown as ResultData;

      await setOutputs(testResult);

      expect(mockSetOutput).toHaveBeenCalledWith(
        'listings',
        testResult.listings
      );
      expect(mockSetOutput).toHaveBeenCalledTimes(1);
    });

    it('sets images output when images property exists', async () => {
      const testResult = { images: ['image1'] } as unknown as ResultData;

      await setOutputs(testResult);

      expect(mockSetOutput).toHaveBeenCalledWith(
        'images',
        testResult.images
      );
      expect(mockSetOutput).toHaveBeenCalledTimes(1);
    });

    it('sets inapps output when inapps property exists', async () => {
      const testResult = { inapps: ['inapp1'] } as unknown as ResultData;

      await setOutputs(testResult);

      expect(mockSetOutput).toHaveBeenCalledWith(
        'inapps',
        testResult.inapps
      );
      expect(mockSetOutput).toHaveBeenCalledTimes(1);
    });

    it('sets reviews output when reviews property exists', async () => {
      const testResult = { reviews: ['review1'] } as unknown as ResultData;

      await setOutputs(testResult);

      expect(mockSetOutput).toHaveBeenCalledWith(
        'reviews',
        testResult.reviews
      );
      expect(mockSetOutput).toHaveBeenCalledTimes(1);
    });

    it('sets voidedPurchases output when voided_purchases property exists', async () => {
      const testResult = {
        voided_purchases: ['purchase1'],
      } as unknown as ResultData;

      await setOutputs(testResult);

      expect(mockSetOutput).toHaveBeenCalledWith(
        'voidedPurchases',
        testResult.voided_purchases
      );
      expect(mockSetOutput).toHaveBeenCalledTimes(1);
    });

    it('sets testers output when testers property exists', async () => {
      const testResult = { testers: ['tester1'] } as unknown as ResultData;

      await setOutputs(testResult);

      expect(mockSetOutput).toHaveBeenCalledWith(
        'testers',
        testResult.testers
      );
      expect(mockSetOutput).toHaveBeenCalledTimes(1);
    });

    it('sets appDetails output when app_details property exists', async () => {
      const testResult = {
        app_details: { name: 'test' },
      } as unknown as ResultData;

      await setOutputs(testResult);

      expect(mockSetOutput).toHaveBeenCalledWith(
        'appDetails',
        testResult.app_details
      );
      expect(mockSetOutput).toHaveBeenCalledTimes(1);
    });

    it('sets expansionFiles output when expansion_files property exists', async () => {
      const testResult = {
        expansion_files: ['file1'],
      } as unknown as ResultData;

      await setOutputs(testResult);

      expect(mockSetOutput).toHaveBeenCalledWith(
        'expansionFiles',
        testResult.expansion_files
      );
      expect(mockSetOutput).toHaveBeenCalledTimes(1);
    });
  });

  describe('missing properties', () => {
    it('does not set any outputs when no properties exist', async () => {
      const emptyResult = {} as unknown as ResultData;

      await setOutputs(emptyResult);

      expect(mockSetOutput).not.toHaveBeenCalled();
    });
  });

  describe('complete result', () => {
    it('sets outputs for all properties in complete ResultData', async () => {
      const testResult: ResultData = result as ResultData;

      await setOutputs(testResult);

      const expectedCalls = Object.keys(testResult).length;
      expect(mockSetOutput).toHaveBeenCalledTimes(expectedCalls);
    });
  });
});
