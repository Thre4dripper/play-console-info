import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
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
  arch: jest.fn(),
}));

jest.mock('@actions/exec', () => ({
  exec: jest.fn(),
}));

jest.mock('@actions/tool-cache', () => ({
  find: jest.fn(),
  downloadTool: jest.fn(),
  cacheFile: jest.fn(),
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
const mockTc = jest.mocked(tc);

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
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process, 'cwd').mockReturnValue('/test/project');
    mockExec.exec.mockResolvedValue(0);
    mockOs.arch.mockReturnValue('x64');
    process.env = {
      ...ORIGINAL_ENV,
      PLAY_CONSOLE_BIN_DIR: undefined,
      PLAY_CONSOLE_RELEASE_TAG: undefined,
    } as NodeJS.ProcessEnv;
    delete process.env.PLAY_CONSOLE_BIN_DIR;
    delete process.env.PLAY_CONSOLE_RELEASE_TAG;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = ORIGINAL_ENV;
  });

  describe('with useMock = true (Mock CLI, local resolution)', () => {
      it('returns correct x64 executable path for supported x64 platforms', async () => {
      mockOs.arch.mockReturnValue('x64');
      const platforms = [
        [
          'win32',
          path.join('bin', 'mock', 'windows', 'mockCli-windows-x64.exe'),
        ],
        ['linux', path.join('bin', 'mock', 'linux', 'mockCli-linux-x64')],
      ] as const;

      for (const [platform, expectedPath] of platforms) {
        mockOs.platform.mockReturnValue(platform);
        const result = await getExecutablePath(true);
        expect(result).toBe(path.join('/test/project', expectedPath));
      }
    });

    it('returns correct arm64 executable path for linux and darwin', async () => {
      mockOs.arch.mockReturnValue('arm64');
      const platforms = [
        ['darwin', path.join('bin', 'mock', 'mac', 'mockCli-mac-arm64')],
        ['linux', path.join('bin', 'mock', 'linux', 'mockCli-linux-arm64')],
      ] as const;

      for (const [platform, expectedPath] of platforms) {
        mockOs.platform.mockReturnValue(platform);
        const result = await getExecutablePath(true);
        expect(result).toBe(path.join('/test/project', expectedPath));
      }
    });

    it('throws for macOS x64', async () => {
      mockOs.platform.mockReturnValue('darwin');
      mockOs.arch.mockReturnValue('x64');

      await expect(getExecutablePath(true)).rejects.toThrow(
        'macOS x64 is not supported — only arm64 binaries are published'
      );
      expect(mockCore.setFailed).toHaveBeenCalledWith(
        'macOS x64 is not supported — only arm64 binaries are published'
      );
    });

    it('windows always uses x64 suffix regardless of arch', async () => {
      mockOs.platform.mockReturnValue('win32');
      mockOs.arch.mockReturnValue('arm64');
      const result = await getExecutablePath(true);
      expect(result).toBe(
        path.join(
          '/test/project',
          'bin',
          'mock',
          'windows',
          'mockCli-windows-x64.exe'
        )
      );
    });

    it('calls chmod for linux and darwin platforms only', async () => {
      const platformPaths = [
        [
          'darwin',
          'arm64',
          path.join('/test/project', 'bin', 'mock', 'mac', 'mockCli-mac-arm64'),
        ],
        [
          'linux',
          'x64',
          path.join(
            '/test/project',
            'bin',
            'mock',
            'linux',
            'mockCli-linux-x64'
          ),
        ],
      ] as const;

      for (const [platform, arch, expectedPath] of platformPaths) {
        mockExec.exec.mockClear();
        mockOs.platform.mockReturnValue(platform);
        mockOs.arch.mockReturnValue(arch);

        await getExecutablePath(true);

        expect(mockExec.exec).toHaveBeenCalledWith('chmod', [
          '+x',
          expectedPath,
        ]);
      }

      mockExec.exec.mockClear();
      mockOs.platform.mockReturnValue('win32');
      await getExecutablePath(true);
      expect(mockExec.exec).not.toHaveBeenCalled();
    });
  });

  describe('with useMock = false and PLAY_CONSOLE_BIN_DIR override', () => {
    beforeEach(() => {
      process.env.PLAY_CONSOLE_BIN_DIR = '/override/dir';
    });

    it('resolves binary from override directory and chmods on unix', async () => {
      mockOs.platform.mockReturnValue('linux');
      mockOs.arch.mockReturnValue('x64');

      const result = await getExecutablePath(false);

      expect(result).toBe(
        path.join(
          '/override/dir',
          'bin',
          'python',
          'linux',
          'play_console_cli-linux-x64'
        )
      );
      expect(mockExec.exec).toHaveBeenCalledWith('chmod', ['+x', result]);
      expect(mockTc.downloadTool).not.toHaveBeenCalled();
    });

    it('does not chmod on windows', async () => {
      mockOs.platform.mockReturnValue('win32');
      mockOs.arch.mockReturnValue('x64');

      const result = await getExecutablePath(false);

      expect(result).toBe(
        path.join(
          '/override/dir',
          'bin',
          'python',
          'windows',
          'play_console_cli-windows-x64.exe'
        )
      );
      expect(mockExec.exec).not.toHaveBeenCalled();
    });
  });

  describe('with useMock = false (download from release)', () => {
    beforeEach(() => {
      process.env.PLAY_CONSOLE_RELEASE_TAG = 'v9.9.9';
    });

    it('returns cached binary path when tool-cache hits', async () => {
      mockOs.platform.mockReturnValue('linux');
      mockOs.arch.mockReturnValue('x64');
      mockTc.find.mockReturnValue('/runner/cache/python-cli-linux-x64/9.9.9');

      const result = await getExecutablePath(false);

      expect(mockTc.find).toHaveBeenCalledWith('python-cli-linux-x64', '9.9.9');
      expect(mockTc.downloadTool).not.toHaveBeenCalled();
      expect(result).toBe(
        path.join(
          '/runner/cache/python-cli-linux-x64/9.9.9',
          'play_console_cli-linux-x64'
        )
      );
      expect(mockExec.exec).toHaveBeenCalledWith('chmod', ['+x', result]);
    });

    it('downloads, caches, and returns binary path on cache miss', async () => {
      mockOs.platform.mockReturnValue('darwin');
      mockOs.arch.mockReturnValue('arm64');
      mockTc.find.mockReturnValue('');
      mockTc.downloadTool.mockResolvedValue('/tmp/downloaded-file');
      mockTc.cacheFile.mockResolvedValue(
        '/runner/cache/python-cli-mac-arm64/9.9.9'
      );

      const result = await getExecutablePath(false);

      expect(mockTc.downloadTool).toHaveBeenCalledWith(
        'https://github.com/Thre4dripper/play-console-info/releases/download/v9.9.9/play_console_cli-mac-arm64'
      );
      expect(mockTc.cacheFile).toHaveBeenCalledWith(
        '/tmp/downloaded-file',
        'play_console_cli-mac-arm64',
        'python-cli-mac-arm64',
        '9.9.9'
      );
      expect(result).toBe(
        path.join(
          '/runner/cache/python-cli-mac-arm64/9.9.9',
          'play_console_cli-mac-arm64'
        )
      );
      expect(mockExec.exec).toHaveBeenCalledWith('chmod', ['+x', result]);
    });

    it('strips leading v from PLAY_CONSOLE_RELEASE_TAG override', async () => {
      process.env.PLAY_CONSOLE_RELEASE_TAG = 'v1.2.3';
      mockOs.platform.mockReturnValue('linux');
      mockOs.arch.mockReturnValue('x64');
      mockTc.find.mockReturnValue('');
      mockTc.downloadTool.mockResolvedValue('/tmp/downloaded');
      mockTc.cacheFile.mockResolvedValue('/cache/dir');

      await getExecutablePath(false);

      expect(mockTc.find).toHaveBeenCalledWith('python-cli-linux-x64', '1.2.3');
      expect(mockTc.downloadTool).toHaveBeenCalledWith(
        expect.stringContaining('/releases/download/v1.2.3/')
      );
    });

    it('does not chmod on windows after download', async () => {
      mockOs.platform.mockReturnValue('win32');
      mockOs.arch.mockReturnValue('x64');
      mockTc.find.mockReturnValue('');
      mockTc.downloadTool.mockResolvedValue('/tmp/downloaded');
      mockTc.cacheFile.mockResolvedValue('/cache/dir');

      await getExecutablePath(false);

      expect(mockExec.exec).not.toHaveBeenCalled();
    });

    it('falls back to package.json version when no release tag override is set', async () => {
      delete process.env.PLAY_CONSOLE_RELEASE_TAG;
      mockOs.platform.mockReturnValue('linux');
      mockOs.arch.mockReturnValue('x64');
      mockTc.find.mockReturnValue('');
      mockTc.downloadTool.mockResolvedValue('/tmp/downloaded');
      mockTc.cacheFile.mockResolvedValue('/cache/dir');

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pkgVersion = (require('../../package.json') as { version: string })
        .version;

      await getExecutablePath(false);

      expect(mockTc.find).toHaveBeenCalledWith(
        'python-cli-linux-x64',
        pkgVersion
      );
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

      await expect(getExecutablePath(true)).rejects.toThrow(ActionError);
      await expect(getExecutablePath(true)).rejects.toThrow(
        `Unknown platform: ${platform}`
      );

      await expect(getExecutablePath(false)).rejects.toThrow(ActionError);
      await expect(getExecutablePath(false)).rejects.toThrow(
        `Unknown platform: ${platform}`
      );
    }
  });

  it('uses current working directory in path construction (mock CLI)', async () => {
    jest.spyOn(process, 'cwd').mockReturnValue('/custom/path');
    mockOs.platform.mockReturnValue('linux');
    mockOs.arch.mockReturnValue('x64');

    const result = await getExecutablePath(true);
    expect(result).toBe(
      path.join('/custom/path', 'bin', 'mock', 'linux', 'mockCli-linux-x64')
    );
  });
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls all core logging methods correctly', () => {
    const testMessage = 'test message';

    Logger.info(testMessage);
    Logger.warning(testMessage);
    Logger.error(testMessage);
    Logger.debug(testMessage);
    Logger.notice(testMessage);

    expect(mockCore.info).toHaveBeenCalledWith(testMessage);
    expect(mockCore.warning).toHaveBeenCalledWith(testMessage);
    expect(mockCore.error).toHaveBeenCalledWith(testMessage);
    expect(mockCore.debug).toHaveBeenCalledWith(testMessage);
    expect(mockCore.notice).toHaveBeenCalledWith(testMessage);
  });

  it('handles different message types', () => {
    Logger.info('');
    Logger.error('Special chars: !@#$%^&*()');
    Logger.debug('Multi\nline\nmessage');

    expect(mockCore.info).toHaveBeenCalledWith('');
    expect(mockCore.error).toHaveBeenCalledWith('Special chars: !@#$%^&*()');
    expect(mockCore.debug).toHaveBeenCalledWith('Multi\nline\nmessage');
  });
});
