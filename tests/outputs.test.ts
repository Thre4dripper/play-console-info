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

  it('sets outputs for all properties in ResultData', async () => {
    const testResult: ResultData = result as ResultData;

    await setOutputs(testResult);

    if ('tracks' in testResult) {
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'tracks',
        testResult.tracks
      );
    }
    if ('apks' in testResult) {
      expect(mockCore.setOutput).toHaveBeenCalledWith('apks', testResult.apks);
    }
    if ('bundles' in testResult) {
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'bundles',
        testResult.bundles
      );
    }
    if ('listings' in testResult) {
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'listings',
        testResult.listings
      );
    }
    if ('images' in testResult) {
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'images',
        testResult.images
      );
    }
    if ('inapps' in testResult) {
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'inapps',
        testResult.inapps
      );
    }
    if ('reviews' in testResult) {
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'reviews',
        testResult.reviews
      );
    }
    if ('voidedPurchases' in testResult) {
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'voidedPurchases',
        testResult.voided_purchases
      );
    }
    if ('testers' in testResult) {
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'testers',
        testResult.testers
      );
    }
    if ('appDetails' in testResult) {
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'appDetails',
        testResult.app_details
      );
    }
    if ('expansionFiles' in testResult) {
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'expansionFiles',
        testResult.expansion_files
      );
    }
  });

  it('does not set outputs for missing properties', async () => {
    const partialResult = {
      tracks: ['alpha'],
      apks: ['apk1', 'apk2'],
    } as unknown as Partial<ResultData>;

    await setOutputs(partialResult as ResultData);

    expect(mockCore.setOutput).toHaveBeenCalledWith(
      'tracks',
      partialResult.tracks
    );
    expect(mockCore.setOutput).toHaveBeenCalledWith('apks', partialResult.apks);
    expect(mockCore.setOutput).not.toHaveBeenCalledWith(
      'bundles',
      expect.anything()
    );
    expect(mockCore.setOutput).not.toHaveBeenCalledWith(
      'listings',
      expect.anything()
    );
    expect(mockCore.setOutput).not.toHaveBeenCalledWith(
      'images',
      expect.anything()
    );
    expect(mockCore.setOutput).not.toHaveBeenCalledWith(
      'inapps',
      expect.anything()
    );
    expect(mockCore.setOutput).not.toHaveBeenCalledWith(
      'reviews',
      expect.anything()
    );
    expect(mockCore.setOutput).not.toHaveBeenCalledWith(
      'voidedPurchases',
      expect.anything()
    );
    expect(mockCore.setOutput).not.toHaveBeenCalledWith(
      'testers',
      expect.anything()
    );
    expect(mockCore.setOutput).not.toHaveBeenCalledWith(
      'appDetails',
      expect.anything()
    );
    expect(mockCore.setOutput).not.toHaveBeenCalledWith(
      'expansionFiles',
      expect.anything()
    );
  });
});
