import * as core from '@actions/core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getPackage,
  getServiceAccountJsonPath,
  getCliArguments,
  getArtifactsInputs,
} from '../../src/utils/inputs';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies
jest.mock('@actions/core');
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    access: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
  },
  constants: {
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },
}));
jest.mock('os');
jest.mock('path');

const mockCore = core as jest.Mocked<typeof core>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockOs = os as jest.Mocked<typeof os>;
const mockPath = path as jest.Mocked<typeof path>;

describe('inputs utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPackage', () => {
    it('should return package name when provided', () => {
      mockCore.getInput.mockReturnValue('com.example.app');
      expect(getPackage()).toBe('com.example.app');
    });

    it('should throw ActionError when package is not provided', () => {
      mockCore.getInput.mockReturnValue('');
      expect(() => getPackage()).toThrow("Input 'package' is required.");
    });
  });

  describe('getServiceAccountJsonPath', () => {
    it('should return service account json path when file exists', () => {
      mockCore.getInput.mockImplementation((name) =>
        name === 'serviceAccountJsonPath' ? '/path/to/service.json' : ''
      );
      mockFs.existsSync.mockReturnValue(true);
      expect(getServiceAccountJsonPath()).toBe('/path/to/service.json');
    });

    it('should create temp file when plain text is provided', () => {
      const mockTempPath = '/tmp/gplaycli-creds-123456.json';
      mockCore.getInput.mockImplementation((name) =>
        name === 'serviceAccountJsonPlainText'
          ? '{"type": "service_account"}'
          : ''
      );
      mockOs.tmpdir.mockReturnValue('/tmp');
      mockPath.join.mockReturnValue(mockTempPath);

      expect(getServiceAccountJsonPath()).toBe(mockTempPath);
    });

    it('should throw error when neither path nor plain text is provided', () => {
      mockCore.getInput.mockReturnValue('');
      expect(() => getServiceAccountJsonPath()).toThrow(
        "Either 'serviceAccountJsonPath' or 'serviceAccountJsonPlainText' input must be provided."
      );
    });

    it('should fallback to plain text when path does not exist', () => {
      const mockTempPath = '/tmp/gplaycli-creds-123456.json';
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'serviceAccountJsonPath') return '/nonexistent/path.json';
        if (name === 'serviceAccountJsonPlainText')
          return '{"type": "service_account"}';
        return '';
      });
      mockFs.existsSync.mockReturnValue(false);
      mockOs.tmpdir.mockReturnValue('/tmp');
      mockPath.join.mockReturnValue(mockTempPath);

      expect(getServiceAccountJsonPath()).toBe(mockTempPath);
    });
  });

  describe('getCliArguments', () => {
    it('should return correct arguments for boolean flags', () => {
      mockCore.getInput.mockImplementation((name) =>
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
      mockCore.getInput.mockImplementation((name) => {
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
      mockCore.getInput.mockImplementation((name) => {
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
      mockCore.getInput.mockReturnValue('');
      expect(() => getCliArguments()).toThrow(
        'At least one of the following inputs must be set:'
      );
    });

    it('should throw error for invalid values', () => {
      mockCore.getInput.mockImplementation((name) =>
        name === 'tracks' ? 'invalid-track' : ''
      );
      expect(() => getCliArguments()).toThrow('Invalid track: invalid-track');

      mockCore.getInput.mockImplementation((name) =>
        name === 'images' ? 'invalidImage' : ''
      );
      expect(() => getCliArguments()).toThrow(
        'Invalid image type: invalidImage'
      );

      mockCore.getInput.mockImplementation((name) =>
        name === 'testers' ? 'invalid-tester' : ''
      );
      expect(() => getCliArguments()).toThrow('Invalid tester: invalid-tester');
    });
  });

  describe('getArtifactsInputs', () => {
    beforeEach(() => {
      mockPath.join.mockReturnValue('/default/artifacts');
      mockFs.existsSync.mockReturnValue(false);
    });

    it('should return artifact inputs with defaults from action.yml', () => {
      // Mock the default values as they would be provided by GitHub Actions from action.yml
      mockCore.getInput.mockImplementation((name) => {
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
      mockCore.getInput.mockImplementation((name) => {
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
      mockCore.getInput.mockImplementation((name) =>
        name === 'outputsJsonPath' ? '/existing/path' : ''
      );
      mockFs.existsSync.mockReturnValue(true);
      getArtifactsInputs();
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should validate artifact inputs', () => {
      mockCore.getInput.mockImplementation((name) =>
        name === 'uploadOutputsArtifact' ? 'invalid' : ''
      );
      expect(() => getArtifactsInputs()).toThrow(
        "Input 'uploadOutputsArtifact' must be either 'true' or 'false'."
      );

      mockCore.getInput.mockImplementation((name) =>
        name === 'outputsArtifactRetentionDays' ? '0' : ''
      );
      expect(() => getArtifactsInputs()).toThrow(
        "Input 'outputsArtifactRetentionDays' must be a positive integer between 1 and 90."
      );

      mockCore.getInput.mockImplementation((name) =>
        name === 'outputsArtifactRetentionDays' ? '91' : ''
      );
      expect(() => getArtifactsInputs()).toThrow(
        "Input 'outputsArtifactRetentionDays' must be a positive integer between 1 and 90."
      );
    });

    it('should handle outputsJsonPath with whitespace', () => {
      mockCore.getInput.mockImplementation((name) =>
        name === 'outputsJsonPath' ? '  /path/with/spaces  ' : ''
      );
      getArtifactsInputs();
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/path/with/spaces', {
        recursive: true,
      });
    });
  });
});
