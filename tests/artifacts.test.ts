import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Simple mocks
const mockArtifactClient: any = {
  uploadArtifact: jest.fn(),
  deleteArtifact: jest.fn(),
};

jest.mock('@actions/core');
jest.mock('@actions/artifact', () => ({
  DefaultArtifactClient: jest.fn(() => mockArtifactClient),
  ArtifactNotFoundError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ArtifactNotFoundError';
    }
  }
}));
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  promises: {
    access: jest.fn(),
    writeFile: jest.fn(),
  },
  constants: {
    O_RDONLY: 0,
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  }
}));
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

import * as core from '@actions/core';
import { ArtifactNotFoundError } from '@actions/artifact';
import fs from 'fs';
import path from 'path';
import { createArtifact } from '../src/utils/artifacts';
import { ResultData } from '../src/types';
import mockResultData from './mocks/result.json';

const mockCore = core as jest.Mocked<typeof core>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

// Use the existing mock data
const mockData = mockResultData as ResultData;

describe('artifacts utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.join.mockImplementation((...args) => args.join('/'));
  });

  describe('createArtifact', () => {
    it('should skip when uploadOutputsArtifact is false', async () => {
      const args = { uploadOutputsArtifact: false, outputsArtifactName: 'test', outputsJsonPath: '/test', outputsArtifactRetentionDays: '30' };

      await createArtifact(args, mockData);

      expect(mockCore.info).not.toHaveBeenCalled();
      expect(mockArtifactClient.uploadArtifact).not.toHaveBeenCalled();
    });

    it('should create and upload artifact successfully', async () => {
      const args = { uploadOutputsArtifact: true, outputsArtifactName: 'test-artifact', outputsJsonPath: '/test/path', outputsArtifactRetentionDays: '30' };

      await createArtifact(args, mockData);

      expect(mockCore.info).toHaveBeenCalledWith('Uploading artifact: test-artifact');
      expect(mockPath.join).toHaveBeenCalledWith('/test/path', 'test-artifact');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith('/test/path/test-artifact', JSON.stringify(mockData, null, 2), { encoding: 'utf8' });
      expect(mockArtifactClient.uploadArtifact).toHaveBeenCalledWith('test-artifact', ['/test/path/test-artifact'], '/test/path', { retentionDays: 30, compressionLevel: 0 });
    });

    it('should handle ArtifactNotFoundError during deletion', async () => {
      const args = { uploadOutputsArtifact: true, outputsArtifactName: 'test', outputsJsonPath: '/test', outputsArtifactRetentionDays: '30' };
      mockArtifactClient.deleteArtifact.mockRejectedValue(new ArtifactNotFoundError('Not found'));

      await createArtifact(args, mockData);

      expect(mockCore.debug).toHaveBeenCalledWith("Skipping deletion of 'test', it does not exist");
      expect(mockArtifactClient.uploadArtifact).toHaveBeenCalled();
    });

    it('should handle other errors during deletion', async () => {
      const args = { uploadOutputsArtifact: true, outputsArtifactName: 'test', outputsJsonPath: '/test', outputsArtifactRetentionDays: '30' };
      mockArtifactClient.deleteArtifact.mockRejectedValue(new Error('Other error'));

      await createArtifact(args, mockData);

      expect(mockCore.debug).toHaveBeenCalledWith('Unable to delete artifact: Other error');
      expect(mockArtifactClient.uploadArtifact).toHaveBeenCalled();
    });
  });
});