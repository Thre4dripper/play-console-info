import { vi, describe, it, expect, beforeEach } from 'vitest';

const {
  mockGetInput,
  mockExistsSync,
  mockWriteFileSync,
  mockMkdirSync,
  mockTmpdir,
  mockJoin,
} = vi.hoisted(() => ({
  mockGetInput: vi.fn<(name: string, options?: object) => string>(),
  mockExistsSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockTmpdir: vi.fn(),
  mockJoin: vi.fn<(...args: string[]) => string>(),
}));

vi.mock('@actions/core', () => ({
  getInput: mockGetInput,
  setFailed: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  notice: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  promises: { access: vi.fn(), writeFile: vi.fn(), readFile: vi.fn() },
  constants: {
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },
  default: {
    existsSync: mockExistsSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    promises: { access: vi.fn(), writeFile: vi.fn(), readFile: vi.fn() },
    constants: {
      O_RDONLY: 0,
      O_WRONLY: 1,
      O_RDWR: 2,
      F_OK: 0,
      R_OK: 4,
      W_OK: 2,
      X_OK: 1,
    },
  },
}));

vi.mock('os', () => ({
  tmpdir: mockTmpdir,
  default: { tmpdir: mockTmpdir },
}));

vi.mock('path', () => ({
  join: mockJoin,
  default: { join: mockJoin },
}));

import {
  getPackage,
  getServiceAccountJsonPath,
  getCliArguments,
  getArtifactsInputs,
} from '../../src/utils/inputs.js';

describe('inputs utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPackage', () => {
    it('should return package name when provided', () => {
      mockGetInput.mockReturnValue('com.example.app');
      expect(getPackage()).toBe('com.example.app');
    });

    it('should throw ActionError when package is not provided', () => {
      mockGetInput.mockReturnValue('');
      expect(() => getPackage()).toThrow("Input 'package' is required.");
    });
  });

  describe('getServiceAccountJsonPath', () => {
    it('should return service account json path when file exists', () => {
      mockGetInput.mockImplementation((name) =>
        name === 'serviceAccountJsonPath' ? '/path/to/service.json' : ''
      );
      mockExistsSync.mockReturnValue(true);
      expect(getServiceAccountJsonPath()).toBe('/path/to/service.json');
    });

    it('should create temp file when plain text is provided', () => {
      const mockTempPath = '/tmp/gplaycli-creds-123456.json';
      mockGetInput.mockImplementation((name) =>
        name === 'serviceAccountJsonPlainText'
          ? '{"type": "service_account"}'
          : ''
      );
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin.mockReturnValue(mockTempPath);

      expect(getServiceAccountJsonPath()).toBe(mockTempPath);
    });

    it('should throw error when neither path nor plain text is provided', () => {
      mockGetInput.mockReturnValue('');
      expect(() => getServiceAccountJsonPath()).toThrow(
        "Either 'serviceAccountJsonPath' or 'serviceAccountJsonPlainText' input must be provided."
      );
    });

    it('should fallback to plain text when path does not exist', () => {
      const mockTempPath = '/tmp/gplaycli-creds-123456.json';
      mockGetInput.mockImplementation((name) => {
        if (name === 'serviceAccountJsonPath') return '/nonexistent/path.json';
        if (name === 'serviceAccountJsonPlainText')
          return '{"type": "service_account"}';
        return '';
      });
      mockExistsSync.mockReturnValue(false);
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin.mockReturnValue(mockTempPath);

      expect(getServiceAccountJsonPath()).toBe(mockTempPath);
    });
  });

  describe('getCliArguments', () => {
    it('should return correct arguments for boolean flags', () => {
      mockGetInput.mockImplementation((name) =>
        [
          'apks',
          'bundles',
          'listings',
          'inapps',
          'reviews',
          'voidedPurchases',
          'appDetails',
          'expansionFiles',
        ].includes(name)
          ? 'true'
          : ''
      );

      expect(getCliArguments()).toEqual([
        '--apks',
        '--bundles',
        '--listings',
        '--inapps',
        '--reviews',
        '--voided-purchases',
        '--app-details',
        '--expansion-files',
      ]);
    });

    it('should return correct arguments for value-based inputs', () => {
      mockGetInput.mockImplementation((name) => {
        const inputs: Record<string, string> = {
          tracks: 'production,beta',
          images: 'icon,featureGraphic',
          imagesLanguage: 'en-US,fr-FR',
          testers: 'internal,alpha',
          all: 'true',
        };
        return inputs[name] || '';
      });

      const result = getCliArguments();
      expect(result).toContain('--tracks');
      expect(result).toContain('--images');
      expect(result).toContain('--images-language');
      expect(result).toContain('--testers');
      expect(result).toContain('--all');
    });

    it('should return correct arguments for reviews with options', () => {
      mockGetInput.mockImplementation((name) => {
        const inputs: Record<string, string> = {
          reviews: 'true',
          reviewsPages: '5',
          reviewsPageSize: '50',
        };
        return inputs[name] || '';
      });

      expect(getCliArguments()).toEqual([
        '--reviews',
        '--reviews-pages',
        '5',
        '--reviews-page-size',
        '50',
      ]);
    });

    it('should throw error when no inputs are provided', () => {
      mockGetInput.mockReturnValue('');
      expect(() => getCliArguments()).toThrow(
        'At least one of the following inputs must be set:'
      );
    });

    it('should throw error for invalid values', () => {
      mockGetInput.mockImplementation((name) =>
        name === 'tracks' ? 'invalid-track' : ''
      );
      expect(() => getCliArguments()).toThrow('Invalid track: invalid-track');

      mockGetInput.mockImplementation((name) =>
        name === 'images' ? 'invalidImage' : ''
      );
      expect(() => getCliArguments()).toThrow(
        'Invalid image type: invalidImage'
      );

      mockGetInput.mockImplementation((name) =>
        name === 'testers' ? 'invalid-tester' : ''
      );
      expect(() => getCliArguments()).toThrow('Invalid tester: invalid-tester');
    });
  });

  describe('getArtifactsInputs', () => {
    beforeEach(() => {
      mockJoin.mockReturnValue('/default/artifacts');
      mockExistsSync.mockReturnValue(false);
    });

    it('should return artifact inputs with defaults from action.yml', () => {
      mockGetInput.mockImplementation((name) => {
        const defaults: Record<string, string> = {
          uploadOutputsArtifact: 'false',
          outputsJsonPath: 'artifacts/',
          outputsArtifactName: 'play-console-outputs',
          outputsArtifactRetentionDays: '1',
        };
        return defaults[name] || '';
      });

      const result = getArtifactsInputs();

      expect(result).toEqual({
        uploadOutputsArtifact: false,
        outputsJsonPath: 'artifacts/',
        outputsArtifactName: 'play-console-outputs.json',
        outputsArtifactRetentionDays: '1',
      });
    });

    it('should handle custom inputs and create directories', () => {
      mockGetInput.mockImplementation((name) => {
        const inputs: Record<string, string> = {
          uploadOutputsArtifact: 'true',
          outputsJsonPath: '/custom/path',
          outputsArtifactName: 'custom-artifacts',
          outputsArtifactRetentionDays: '30',
        };
        return inputs[name] || '';
      });

      const result = getArtifactsInputs();
      expect(result.uploadOutputsArtifact).toBe(true);
      expect(result.outputsJsonPath).toBe('/custom/path');
    });

    it('should not create directory if it exists', () => {
      mockGetInput.mockImplementation((name) =>
        name === 'outputsJsonPath' ? '/existing/path' : ''
      );
      mockExistsSync.mockReturnValue(true);
      getArtifactsInputs();
      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    it('should validate artifact inputs', () => {
      mockGetInput.mockImplementation((name) =>
        name === 'uploadOutputsArtifact' ? 'invalid' : ''
      );
      expect(() => getArtifactsInputs()).toThrow(
        "Input 'uploadOutputsArtifact' must be either 'true' or 'false'."
      );

      mockGetInput.mockImplementation((name) =>
        name === 'outputsArtifactRetentionDays' ? '0' : ''
      );
      expect(() => getArtifactsInputs()).toThrow(
        "Input 'outputsArtifactRetentionDays' must be a positive integer between 1 and 90."
      );

      mockGetInput.mockImplementation((name) =>
        name === 'outputsArtifactRetentionDays' ? '91' : ''
      );
      expect(() => getArtifactsInputs()).toThrow(
        "Input 'outputsArtifactRetentionDays' must be a positive integer between 1 and 90."
      );
    });

    it('should handle outputsJsonPath with whitespace', () => {
      mockGetInput.mockImplementation((name) =>
        name === 'outputsJsonPath' ? '  /path/with/spaces  ' : ''
      );
      getArtifactsInputs();
      expect(mockMkdirSync).toHaveBeenCalledWith('/path/with/spaces', {
        recursive: true,
      });
    });
  });
});
