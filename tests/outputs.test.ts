import { setOutputs } from '../src/utils/outputs';
import { ResultData } from '../src/types';
import * as core from '@actions/core';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import result from './mocks/result.json';

// Mock the core module
jest.mock('@actions/core');

describe('setOutputs', () => {
  const mockCore = jest.mocked(core);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('individual output properties', () => {
    it('sets tracks output when tracks property exists', async () => {
      const testResult = { tracks: ['alpha', 'beta'] } as ResultData;

      await setOutputs(testResult);

      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'tracks',
        testResult.tracks
      );
      expect(mockCore.setOutput).toHaveBeenCalledTimes(1);
    });

    it('sets apks output when apks property exists', async () => {
      const testResult = { apks: ['apk1', 'apk2'] } as ResultData;

      await setOutputs(testResult);

      expect(mockCore.setOutput).toHaveBeenCalledWith('apks', testResult.apks);
      expect(mockCore.setOutput).toHaveBeenCalledTimes(1);
    });

    it('sets bundles output when bundles property exists', async () => {
      const testResult = { bundles: ['bundle1'] } as ResultData;

      await setOutputs(testResult);

      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'bundles',
        testResult.bundles
      );
      expect(mockCore.setOutput).toHaveBeenCalledTimes(1);
    });

    it('sets listings output when listings property exists', async () => {
      const testResult = { listings: ['listing1'] } as ResultData;

      await setOutputs(testResult);

      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'listings',
        testResult.listings
      );
      expect(mockCore.setOutput).toHaveBeenCalledTimes(1);
    });

    it('sets images output when images property exists', async () => {
      const testResult = { images: ['image1'] } as ResultData;

      await setOutputs(testResult);

      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'images',
        testResult.images
      );
      expect(mockCore.setOutput).toHaveBeenCalledTimes(1);
    });

    it('sets inapps output when inapps property exists', async () => {
      const testResult = { inapps: ['inapp1'] } as ResultData;

      await setOutputs(testResult);

      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'inapps',
        testResult.inapps
      );
      expect(mockCore.setOutput).toHaveBeenCalledTimes(1);
    });

    it('sets reviews output when reviews property exists', async () => {
      const testResult = { reviews: ['review1'] } as ResultData;

      await setOutputs(testResult);

      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'reviews',
        testResult.reviews
      );
      expect(mockCore.setOutput).toHaveBeenCalledTimes(1);
    });

    it('sets voidedPurchases output when voided_purchases property exists', async () => {
      const testResult = { voided_purchases: ['purchase1'] } as ResultData;

      await setOutputs(testResult);

      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'voidedPurchases',
        testResult.voided_purchases
      );
      expect(mockCore.setOutput).toHaveBeenCalledTimes(1);
    });

    it('sets testers output when testers property exists', async () => {
      const testResult = { testers: ['tester1'] } as ResultData;

      await setOutputs(testResult);

      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'testers',
        testResult.testers
      );
      expect(mockCore.setOutput).toHaveBeenCalledTimes(1);
    });

    it('sets appDetails output when app_details property exists', async () => {
      const testResult = { app_details: { name: 'test' } } as ResultData;

      await setOutputs(testResult);

      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'appDetails',
        testResult.app_details
      );
      expect(mockCore.setOutput).toHaveBeenCalledTimes(1);
    });

    it('sets expansionFiles output when expansion_files property exists', async () => {
      const testResult = { expansion_files: ['file1'] } as ResultData;

      await setOutputs(testResult);

      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'expansionFiles',
        testResult.expansion_files
      );
      expect(mockCore.setOutput).toHaveBeenCalledTimes(1);
    });
  });

  describe('missing properties', () => {
    it('does not set any outputs when no properties exist', async () => {
      const emptyResult = {} as ResultData;

      await setOutputs(emptyResult);

      expect(mockCore.setOutput).not.toHaveBeenCalled();
    });
  });

  describe('complete result', () => {
    it('sets outputs for all properties in complete ResultData', async () => {
      const testResult: ResultData = result as ResultData;

      await setOutputs(testResult);

      // Count expected calls based on properties in testResult
      const expectedCalls = Object.keys(testResult).length;
      expect(mockCore.setOutput).toHaveBeenCalledTimes(expectedCalls);
    });
  });
});
