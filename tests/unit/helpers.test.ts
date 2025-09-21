import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { ActionError, getExecutablePath, Logger } from '../../src/utils/helpers';

jest.mock('os', () => ({
  platform: jest.fn(),
}));

jest.mock('@actions/core', () => ({
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  notice: jest.fn(),
}));

const mockOs = jest.mocked(os);
const mockCore = jest.mocked(core);

describe('ActionError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates error with message and calls core.setFailed', () => {
    const message = 'Test error message';
    const error = new ActionError(message);

    expect(error.message).toBe(message);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ActionError);
    expect(mockCore.setFailed).toHaveBeenCalledWith(message);
  });
});

describe('getExecutablePath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process, 'cwd').mockReturnValue('/test/project');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns correct executable path for all platforms', () => {
    // Test supported platforms
    const platforms = [
      ['win32', 'play_console_cli.exe'],
      ['darwin', 'play_console_cli'],
      ['linux', 'play_console_cli'],
    ] as const;

    platforms.forEach(([platform, expectedFile]) => {
      mockOs.platform.mockReturnValue(platform);
      const result = getExecutablePath();
      expect(result).toBe(
        path.join('/test/project', 'cli', 'dist', expectedFile)
      );
    });
  });

  it('throws ActionError for unsupported platforms', () => {
    const unsupportedPlatforms = [
      'freebsd',
      'aix',
      'sunos',
      'unknown',
    ] as const;

    unsupportedPlatforms.forEach((platform) => {
      mockOs.platform.mockReturnValue(platform as NodeJS.Platform);

      expect(() => getExecutablePath()).toThrow(ActionError);
      expect(() => getExecutablePath()).toThrow(
        `Unknown platform: ${platform}`
      );
    });

    expect(mockCore.setFailed).toHaveBeenCalledTimes(
      unsupportedPlatforms.length * 2
    );
  });

  it('uses current working directory in path construction', () => {
    jest.spyOn(process, 'cwd').mockReturnValue('/custom/path');
    mockOs.platform.mockReturnValue('linux');

    const result = getExecutablePath();
    expect(result).toBe(
      path.join('/custom/path', 'cli', 'dist', 'play_console_cli')
    );
  });
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls all core logging methods correctly', () => {
    const testMessage = 'test message';

    // Test all Logger methods
    Logger.info(testMessage);
    Logger.warning(testMessage);
    Logger.error(testMessage);
    Logger.debug(testMessage);
    Logger.notice(testMessage);

    // Verify all core methods were called
    expect(mockCore.info).toHaveBeenCalledWith(testMessage);
    expect(mockCore.warning).toHaveBeenCalledWith(testMessage);
    expect(mockCore.error).toHaveBeenCalledWith(testMessage);
    expect(mockCore.debug).toHaveBeenCalledWith(testMessage);
    expect(mockCore.notice).toHaveBeenCalledWith(testMessage);
  });

  it('handles different message types', () => {
    // Test edge cases
    Logger.info('');
    Logger.error('Special chars: !@#$%^&*()');
    Logger.debug('Multi\nline\nmessage');

    expect(mockCore.info).toHaveBeenCalledWith('');
    expect(mockCore.error).toHaveBeenCalledWith('Special chars: !@#$%^&*()');
    expect(mockCore.debug).toHaveBeenCalledWith('Multi\nline\nmessage');
  });
});
