import { ActionError } from '../src/utils/helpers';
import * as core from '@actions/core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getPackage,
  getServiceAccountJsonPath,
  getCliArguments,
  getArtifactsInputs,
} from '../src/utils/inputs';
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

      const result = getPackage();

      expect(result).toBe('com.example.app');
      expect(mockCore.getInput).toHaveBeenCalledWith('package');
    });

    it('should throw ActionError when package is not provided', () => {
      mockCore.getInput.mockReturnValue('');

      expect(() => getPackage()).toThrow(ActionError);
      expect(() => getPackage()).toThrow("Input 'package' is required.");
    });
  });

  describe('getServiceAccountJsonPath', () => {
    it('should return service account json path when file exists', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'serviceAccountJsonPath') return '/path/to/service.json';
        return '';
      });
      mockFs.existsSync.mockReturnValue(true);

      const result = getServiceAccountJsonPath();

      expect(result).toBe('/path/to/service.json');
      expect(mockFs.existsSync).toHaveBeenCalledWith('/path/to/service.json');
    });

    it('should create temp file when plain text is provided', () => {
      const mockJsonContent = '{"type": "service_account"}';
      const mockTempPath = '/tmp/gplaycli-creds-123456.json';

      mockCore.getInput.mockImplementation((name) => {
        if (name === 'serviceAccountJsonPath') return '';
        if (name === 'serviceAccountJsonPlainText') return mockJsonContent;
        return '';
      });
      mockOs.tmpdir.mockReturnValue('/tmp');
      mockPath.join.mockReturnValue(mockTempPath);

      const result = getServiceAccountJsonPath();

      expect(result).toBe(mockTempPath);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        mockTempPath,
        mockJsonContent
      );
    });

    it('should throw error when neither path nor plain text is provided', () => {
      mockCore.getInput.mockReturnValue('');

      expect(() => getServiceAccountJsonPath()).toThrow(ActionError);
      expect(() => getServiceAccountJsonPath()).toThrow(
        "Either 'serviceAccountJsonPath' or 'serviceAccountJsonPlainText' input must be provided."
      );
    });

    it('should fallback to plain text when path does not exist', () => {
      const mockJsonContent = '{"type": "service_account"}';
      const mockTempPath = '/tmp/gplaycli-creds-123456.json';

      mockCore.getInput.mockImplementation((name) => {
        if (name === 'serviceAccountJsonPath') return '/nonexistent/path.json';
        if (name === 'serviceAccountJsonPlainText') return mockJsonContent;
        return '';
      });
      mockFs.existsSync.mockReturnValue(false);
      mockOs.tmpdir.mockReturnValue('/tmp');
      mockPath.join.mockReturnValue(mockTempPath);

      const result = getServiceAccountJsonPath();

      expect(result).toBe(mockTempPath);
    });
  });

  describe('getCliArguments', () => {
    it('should return correct arguments for all boolean flags', () => {
      mockCore.getInput.mockImplementation((name) => {
        const inputs: Record<string, string> = {
          apks: 'true',
          bundles: 'true',
          listings: 'true',
          inapps: 'true',
          reviews: 'true',
          voidedPurchases: 'true',
          appDetails: 'true',
          expansionFiles: 'true',
        };
        return inputs[name] || '';
      });

      const result = getCliArguments();

      expect(result).toEqual([
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

    it('should return correct arguments for tracks', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'tracks') return 'production,beta';
        return '';
      });

      const result = getCliArguments();

      expect(result).toEqual(['--tracks', 'production,beta']);
    });

    it('should return correct arguments for images with language', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'images') return 'icon,featureGraphic';
        if (name === 'imagesLanguage') return 'en-US,fr-FR';
        return '';
      });

      const result = getCliArguments();

      expect(result).toEqual([
        '--images',
        'icon,featureGraphic',
        '--images-language',
        'en-US,fr-FR',
      ]);
    });

    it('should return correct arguments for reviews with options', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'reviews') return 'true';
        if (name === 'reviewsPages') return '5';
        if (name === 'reviewsPageSize') return '50';
        return '';
      });

      const result = getCliArguments();

      expect(result).toEqual([
        '--reviews',
        '--reviews-pages',
        '5',
        '--reviews-page-size',
        '50',
      ]);
    });

    it('should return correct arguments for testers', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'testers') return 'internal,alpha';
        return '';
      });

      const result = getCliArguments();

      expect(result).toEqual(['--testers', 'internal,alpha']);
    });

    it('should return correct arguments for all flag', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'all') return 'true';
        return '';
      });

      const result = getCliArguments();

      expect(result).toEqual(['--all']);
    });

    it('should throw error when no inputs are provided', () => {
      mockCore.getInput.mockReturnValue('');

      expect(() => getCliArguments()).toThrow(ActionError);
      expect(() => getCliArguments()).toThrow(
        'At least one of the following inputs must be set:'
      );
    });

    it('should throw error for invalid track', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'tracks') return 'invalid-track';
        return '';
      });

      expect(() => getCliArguments()).toThrow(ActionError);
      expect(() => getCliArguments()).toThrow('Invalid track: invalid-track');
    });

    it('should throw error for invalid image type', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'images') return 'invalidImage';
        return '';
      });

      expect(() => getCliArguments()).toThrow(ActionError);
      expect(() => getCliArguments()).toThrow(
        'Invalid image type: invalidImage'
      );
    });

    it('should throw error for invalid tester', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'testers') return 'invalid-tester';
        return '';
      });

      expect(() => getCliArguments()).toThrow(ActionError);
      expect(() => getCliArguments()).toThrow('Invalid tester: invalid-tester');
    });

    it('should handle multiple valid tracks', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'tracks') return 'production, beta, alpha';
        return '';
      });

      const result = getCliArguments();

      expect(result).toEqual(['--tracks', 'production, beta, alpha']);
    });

    it('should handle multiple valid image types', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'images') return 'icon, featureGraphic, all';
        return '';
      });

      const result = getCliArguments();

      expect(result).toEqual(['--images', 'icon, featureGraphic, all']);
    });

    it('should handle multiple valid testers', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'testers') return 'internal, alpha, production';
        return '';
      });

      const result = getCliArguments();

      expect(result).toEqual(['--testers', 'internal, alpha, production']);
    });
  });

  describe('getArtifactsInputs', () => {
    beforeEach(() => {
      mockPath.join.mockReturnValue('/default/artifacts');
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});
    });

    it('should return artifact inputs with defaults', () => {
      mockCore.getInput.mockReturnValue('');

      const result = getArtifactsInputs();

      expect(result).toEqual({
        uploadOutputsArtifact: false,
        outputsJsonPath: '/default/artifacts',
        outputsArtifactName: '',
        outputsArtifactRetentionDays: '',
      });
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/default/artifacts', {
        recursive: true,
      });
    });

    it('should create custom outputs path when provided', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'outputsJsonPath') return '/custom/path';
        return '';
      });
      mockFs.existsSync.mockReturnValue(false);

      const result = getArtifactsInputs();

      expect(result.outputsJsonPath).toBe('/custom/path');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/custom/path', {
        recursive: true,
      });
    });

    it('should not create directory if it already exists', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'outputsJsonPath') return '/existing/path';
        return '';
      });
      mockFs.existsSync.mockReturnValue(true);

      getArtifactsInputs();

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should parse uploadOutputsArtifact as boolean', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'uploadOutputsArtifact') return 'true';
        if (name === 'outputsJsonPath') return '/test/path';
        return '';
      });

      const result = getArtifactsInputs();

      expect(result.uploadOutputsArtifact).toBe(true);
    });

    it('should return all artifact inputs when provided', () => {
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

      expect(result).toEqual({
        uploadOutputsArtifact: true,
        outputsJsonPath: '/custom/path',
        outputsArtifactName: 'custom-artifacts',
        outputsArtifactRetentionDays: '30',
      });
    });

    it('should throw error for invalid uploadOutputsArtifact value', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'uploadOutputsArtifact') return 'invalid';
        return '';
      });

      expect(() => getArtifactsInputs()).toThrow(ActionError);
      expect(() => getArtifactsInputs()).toThrow(
        "Input 'uploadOutputsArtifact' must be either 'true' or 'false'."
      );
    });

    it('should throw error for invalid retention days - NaN', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'outputsArtifactRetentionDays') return 'invalid';
        return '';
      });

      expect(() => getArtifactsInputs()).toThrow(ActionError);
      expect(() => getArtifactsInputs()).toThrow(
        "Input 'outputsArtifactRetentionDays' must be a positive integer between 1 and 90."
      );
    });

    it('should throw error for retention days less than 1', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'outputsArtifactRetentionDays') return '0';
        return '';
      });

      expect(() => getArtifactsInputs()).toThrow(ActionError);
    });

    it('should throw error for retention days greater than 90', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'outputsArtifactRetentionDays') return '91';
        return '';
      });

      expect(() => getArtifactsInputs()).toThrow(ActionError);
    });

    it('should accept valid retention days', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'outputsArtifactRetentionDays') return '45';
        return '';
      });

      expect(() => getArtifactsInputs()).not.toThrow();
    });

    it('should handle outputsJsonPath with whitespace', () => {
      mockCore.getInput.mockImplementation((name) => {
        if (name === 'outputsJsonPath') return '  /path/with/spaces  ';
        return '';
      });
      mockFs.existsSync.mockReturnValue(false);

      getArtifactsInputs();

      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/path/with/spaces', {
        recursive: true,
      });
    });
  });
});
