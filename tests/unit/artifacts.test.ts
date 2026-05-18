import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { ResultData } from '../../src/types.js';
import mockResultData from '../../cli/mock/result.json' with { type: 'json' };

const {
  mockArtifactClient,
  mockWriteFileSync,
  mockJoin,
  mockLoggerInfo,
  mockLoggerWarning,
  mockLoggerError,
  mockLoggerDebug,
  mockLoggerNotice,
} = vi.hoisted(() => {
  const mockArtifactClient = {
    uploadArtifact: vi.fn(),
    deleteArtifact: vi.fn(),
  };
  return {
    mockArtifactClient,
    mockWriteFileSync: vi.fn(),
    mockJoin: vi.fn<(...args: string[]) => string>((...args: string[]) =>
      args.join('/')
    ),
    mockLoggerInfo: vi.fn(),
    mockLoggerWarning: vi.fn(),
    mockLoggerError: vi.fn(),
    mockLoggerDebug: vi.fn(),
    mockLoggerNotice: vi.fn(),
  };
});

vi.mock('@actions/artifact', () => ({
  // Must use a regular function (not arrow) — arrow functions are not constructable.
  DefaultArtifactClient: vi.fn(function () {
    return mockArtifactClient;
  }),
  ArtifactNotFoundError: class ArtifactNotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ArtifactNotFoundError';
    }
  },
}));

vi.mock('../../src/utils/helpers.js', () => ({
  Logger: {
    info: mockLoggerInfo,
    warning: mockLoggerWarning,
    error: mockLoggerError,
    debug: mockLoggerDebug,
    notice: mockLoggerNotice,
  },
}));

vi.mock('@actions/core', () => ({
  setOutput: vi.fn(),
  setFailed: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  notice: vi.fn(),
}));

vi.mock('fs', () => ({
  writeFileSync: mockWriteFileSync,
  promises: { access: vi.fn(), writeFile: vi.fn() },
  constants: { O_RDONLY: 0, F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 },
  default: {
    writeFileSync: mockWriteFileSync,
    promises: { access: vi.fn(), writeFile: vi.fn() },
    constants: { O_RDONLY: 0, F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 },
  },
}));

vi.mock('path', () => ({
  join: mockJoin,
  default: { join: mockJoin },
}));

import { createArtifact } from '../../src/utils/artifacts.js';
import { ArtifactNotFoundError } from '@actions/artifact';

const mockData = mockResultData as ResultData;

describe('artifacts utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJoin.mockImplementation((...args: string[]) => args.join('/'));
  });

  describe('createArtifact', () => {
    it('should skip when uploadOutputsArtifact is false', async () => {
      const args = {
        uploadOutputsArtifact: false,
        outputsArtifactName: 'test',
        outputsJsonPath: '/test',
        outputsArtifactRetentionDays: '30',
      };

      await createArtifact(args, mockData);

      expect(mockLoggerInfo).not.toHaveBeenCalled();
      expect(mockArtifactClient.uploadArtifact).not.toHaveBeenCalled();
    });

    it('should create and upload artifact successfully', async () => {
      const args = {
        uploadOutputsArtifact: true,
        outputsArtifactName: 'test-artifact',
        outputsJsonPath: '/test/path',
        outputsArtifactRetentionDays: '30',
      };

      await createArtifact(args, mockData);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Uploading artifact: test-artifact'
      );
      expect(mockJoin).toHaveBeenCalledWith('/test/path', 'test-artifact');
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/test/path/test-artifact',
        JSON.stringify(mockData, null, 2),
        { encoding: 'utf8' }
      );
      expect(mockArtifactClient.uploadArtifact).toHaveBeenCalledWith(
        'test-artifact',
        ['/test/path/test-artifact'],
        '/test/path',
        { retentionDays: 30, compressionLevel: 0 }
      );
    });

    it('should handle ArtifactNotFoundError during deletion', async () => {
      const args = {
        uploadOutputsArtifact: true,
        outputsArtifactName: 'test',
        outputsJsonPath: '/test',
        outputsArtifactRetentionDays: '30',
      };
      mockArtifactClient.deleteArtifact.mockRejectedValue(
        new ArtifactNotFoundError('Not found')
      );

      await createArtifact(args, mockData);

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        "Skipping deletion of 'test', it does not exist"
      );
      expect(mockArtifactClient.uploadArtifact).toHaveBeenCalled();
    });

    it('should handle other errors during deletion', async () => {
      const args = {
        uploadOutputsArtifact: true,
        outputsArtifactName: 'test',
        outputsJsonPath: '/test',
        outputsArtifactRetentionDays: '30',
      };
      mockArtifactClient.deleteArtifact.mockRejectedValue(
        new Error('Other error')
      );

      await createArtifact(args, mockData);

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Unable to delete artifact: Other error'
      );
      expect(mockArtifactClient.uploadArtifact).toHaveBeenCalled();
    });
  });
});
