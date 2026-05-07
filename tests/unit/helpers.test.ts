import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  ActionError,
  getExecutablePath,
  Logger,
} from '../../src/utils/helpers';

jest.mock('os', () => ({
  platform: jest.fn(),
}));

jest.mock('@actions/exec', () => ({
  exec: jest.fn(),
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
const mockExec = jest.mocked(exec);

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
    mockExec.exec.mockResolvedValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('with useMock = false (Python CLI)', () => {
    it('returns correct executable path for all platforms', async () => {
      // useMock=false resolves basePath via __dirname (not cwd), so check suffix only
      const platforms = [
        [
          'win32',
          path.join('bin', 'python', 'windows', 'play_console_cli-windows.exe'),
        ],
        ['darwin', path.join('bin', 'python', 'mac', 'play_console_cli-mac')],
        [
          'linux',
          path.join('bin', 'python', 'linux', 'play_console_cli-linux'),
        ],
      ] as const;

      for (const [platform, expectedSuffix] of platforms) {
        mockOs.platform.mockReturnValue(platform);
        const result = await getExecutablePath(false);
        expect(result).toContain(expectedSuffix);
      }
    });

    it('calls chmod for linux and darwin platforms', async () => {
      // darwin→mac, linux→linux; basePath is __dirname-based so check suffix
      const platformPaths = [
        ['darwin', path.join('bin', 'python', 'mac', 'play_console_cli-mac')],
        [
          'linux',
          path.join('bin', 'python', 'linux', 'play_console_cli-linux'),
        ],
      ] as const;

      for (const [platform, expectedSuffix] of platformPaths) {
        mockExec.exec.mockClear();
        mockOs.platform.mockReturnValue(platform);

        await getExecutablePath(false);

        expect(mockExec.exec).toHaveBeenCalledWith('chmod', [
          '+x',
          expect.stringContaining(expectedSuffix),
        ]);
      }
    });

    it('does not call chmod for windows platform', async () => {
      mockOs.platform.mockReturnValue('win32');

      await getExecutablePath(false);

      expect(mockExec.exec).not.toHaveBeenCalled();
    });
  });

  describe('with useMock = true (Mock CLI)', () => {
    it('returns correct executable path for all platforms', async () => {
      // useMock=true uses process.cwd() so exact path matching works
      const platforms = [
        ['win32', path.join('bin', 'mock', 'windows', 'mockCli-windows.exe')],
        ['darwin', path.join('bin', 'mock', 'mac', 'mockCli-mac')],
        ['linux', path.join('bin', 'mock', 'linux', 'mockCli-linux')],
      ] as const;

      for (const [platform, expectedPath] of platforms) {
        mockOs.platform.mockReturnValue(platform);
        const result = await getExecutablePath(true);
        expect(result).toBe(path.join('/test/project', expectedPath));
      }
    });

    it('calls chmod for linux and darwin platforms', async () => {
      // darwin→mac, linux→linux; cwd is mocked so exact path works
      const platformPaths = [
        [
          'darwin',
          path.join('/test/project', 'bin', 'mock', 'mac', 'mockCli-mac'),
        ],
        [
          'linux',
          path.join('/test/project', 'bin', 'mock', 'linux', 'mockCli-linux'),
        ],
      ] as const;

      for (const [platform, expectedPath] of platformPaths) {
        mockExec.exec.mockClear();
        mockOs.platform.mockReturnValue(platform);

        await getExecutablePath(true);

        expect(mockExec.exec).toHaveBeenCalledWith('chmod', [
          '+x',
          expectedPath,
        ]);
      }
    });
  });

  it('throws ActionError for unsupported platforms', async () => {
    const unsupportedPlatforms = [
      'freebsd',
      'aix',
      'sunos',
      'unknown',
    ] as const;

    for (const platform of unsupportedPlatforms) {
      mockOs.platform.mockReturnValue(platform as NodeJS.Platform);

      // Cover the default branch in the mock CLI switch (useMock=true)
      await expect(getExecutablePath(true)).rejects.toThrow(ActionError);
      await expect(getExecutablePath(true)).rejects.toThrow(
        `Unknown platform: ${platform}`
      );

      // Cover the default branch in the Python CLI switch (useMock=false)
      await expect(getExecutablePath(false)).rejects.toThrow(ActionError);
      await expect(getExecutablePath(false)).rejects.toThrow(
        `Unknown platform: ${platform}`
      );
    }
  });

  it('uses current working directory in path construction', async () => {
    // useMock=true uses process.cwd(); useMock=false uses __dirname (not mockable)
    jest.spyOn(process, 'cwd').mockReturnValue('/custom/path');
    mockOs.platform.mockReturnValue('linux');

    const result = await getExecutablePath(true);
    expect(result).toBe(
      path.join('/custom/path', 'bin', 'mock', 'linux', 'mockCli-linux')
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
