import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import pkg from '../../package.json' with { type: 'json' };

// vi.hoisted() defines mock-function references BEFORE vi.mock() factories run,
// so the same vi.fn() instances are shared between factories and test assertions.
const {
  mockPlatform,
  mockArch,
  mockSetFailed,
  mockInfo,
  mockWarning,
  mockError,
  mockDebug,
  mockNotice,
  mockExecFn,
  mockFind,
  mockDownloadTool,
  mockCacheFile,
} = vi.hoisted(() => ({
  mockPlatform: vi.fn<() => NodeJS.Platform>(),
  mockArch: vi.fn<() => string>(),
  mockSetFailed: vi.fn(),
  mockInfo: vi.fn(),
  mockWarning: vi.fn(),
  mockError: vi.fn(),
  mockDebug: vi.fn(),
  mockNotice: vi.fn(),
  mockExecFn: vi.fn(),
  mockFind: vi.fn<() => string>(),
  mockDownloadTool: vi.fn<() => Promise<string>>(),
  mockCacheFile: vi.fn<() => Promise<string>>(),
}));

vi.mock('os', () => ({
  platform: mockPlatform,
  arch: mockArch,
  default: { platform: mockPlatform, arch: mockArch },
}));

vi.mock('@actions/core', () => ({
  setFailed: mockSetFailed,
  info: mockInfo,
  warning: mockWarning,
  error: mockError,
  debug: mockDebug,
  notice: mockNotice,
}));

vi.mock('@actions/exec', () => ({ exec: mockExecFn }));

vi.mock('@actions/tool-cache', () => ({
  find: mockFind,
  downloadTool: mockDownloadTool,
  cacheFile: mockCacheFile,
}));

import { ActionError, getExecutablePath, Logger } from '../../src/utils/helpers.js';

describe('ActionError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates error with message and calls core.setFailed', () => {
    const message = 'Test error message';
    const error = new ActionError(message);

    expect(error.message).toBe(message);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ActionError);
    expect(mockSetFailed).toHaveBeenCalledWith(message);
  });
});

describe('getExecutablePath', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project');
    mockExecFn.mockResolvedValue(0);
    mockArch.mockReturnValue('x64');
    mockFind.mockReturnValue('');
    process.env = {
      ...ORIGINAL_ENV,
      PLAY_CONSOLE_BIN_DIR: undefined,
      PLAY_CONSOLE_RELEASE_TAG: undefined,
    } as NodeJS.ProcessEnv;
    delete process.env.PLAY_CONSOLE_BIN_DIR;
    delete process.env.PLAY_CONSOLE_RELEASE_TAG;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = ORIGINAL_ENV;
  });

  describe('with useMock = true (Mock CLI, local resolution)', () => {
    it('returns correct x64 executable path for supported x64 platforms', async () => {
      mockArch.mockReturnValue('x64');
      const platforms = [
        [
          'win32',
          path.join('bin', 'mock', 'windows', 'mockCli-windows-x64.exe'),
        ],
        ['linux', path.join('bin', 'mock', 'linux', 'mockCli-linux-x64')],
      ] as const;

      for (const [platform, expectedPath] of platforms) {
        mockPlatform.mockReturnValue(platform);
        const result = await getExecutablePath(true);
        expect(result).toBe(path.join('/test/project', expectedPath));
      }
    });

    it('returns correct arm64 executable path for linux and darwin', async () => {
      mockArch.mockReturnValue('arm64');
      const platforms = [
        ['darwin', path.join('bin', 'mock', 'mac', 'mockCli-mac-arm64')],
        ['linux', path.join('bin', 'mock', 'linux', 'mockCli-linux-arm64')],
      ] as const;

      for (const [platform, expectedPath] of platforms) {
        mockPlatform.mockReturnValue(platform);
        const result = await getExecutablePath(true);
        expect(result).toBe(path.join('/test/project', expectedPath));
      }
    });

    it('throws for macOS x64', async () => {
      mockPlatform.mockReturnValue('darwin');
      mockArch.mockReturnValue('x64');

      await expect(getExecutablePath(true)).rejects.toThrow(
        'macOS x64 is not supported — only arm64 binaries are published'
      );
      expect(mockSetFailed).toHaveBeenCalledWith(
        'macOS x64 is not supported — only arm64 binaries are published'
      );
    });

    it('windows always uses x64 suffix regardless of arch', async () => {
      mockPlatform.mockReturnValue('win32');
      mockArch.mockReturnValue('arm64');
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
        mockExecFn.mockClear();
        mockPlatform.mockReturnValue(platform);
        mockArch.mockReturnValue(arch);

        await getExecutablePath(true);

        expect(mockExecFn).toHaveBeenCalledWith('chmod', [
          '+x',
          expectedPath,
        ]);
      }

      mockExecFn.mockClear();
      mockPlatform.mockReturnValue('win32');
      await getExecutablePath(true);
      expect(mockExecFn).not.toHaveBeenCalled();
    });
  });

  describe('with useMock = false and PLAY_CONSOLE_BIN_DIR override', () => {
    beforeEach(() => {
      process.env.PLAY_CONSOLE_BIN_DIR = '/override/dir';
    });

    it('resolves binary from override directory and chmods on unix', async () => {
      mockPlatform.mockReturnValue('linux');
      mockArch.mockReturnValue('x64');

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
      expect(mockExecFn).toHaveBeenCalledWith('chmod', ['+x', result]);
      expect(mockDownloadTool).not.toHaveBeenCalled();
    });

    it('does not chmod on windows', async () => {
      mockPlatform.mockReturnValue('win32');
      mockArch.mockReturnValue('x64');

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
      expect(mockExecFn).not.toHaveBeenCalled();
    });
  });

  describe('with useMock = false (download from release)', () => {
    beforeEach(() => {
      process.env.PLAY_CONSOLE_RELEASE_TAG = 'v9.9.9';
    });

    it('returns cached binary path when tool-cache hits', async () => {
      mockPlatform.mockReturnValue('linux');
      mockArch.mockReturnValue('x64');
      mockFind.mockReturnValue('/runner/cache/python-cli-linux-x64/9.9.9');

      const result = await getExecutablePath(false);

      expect(mockFind).toHaveBeenCalledWith('python-cli-linux-x64', '9.9.9');
      expect(mockDownloadTool).not.toHaveBeenCalled();
      expect(result).toBe(
        path.join(
          '/runner/cache/python-cli-linux-x64/9.9.9',
          'play_console_cli-linux-x64'
        )
      );
      expect(mockExecFn).toHaveBeenCalledWith('chmod', ['+x', result]);
    });

    it('downloads, caches, and returns binary path on cache miss', async () => {
      mockPlatform.mockReturnValue('darwin');
      mockArch.mockReturnValue('arm64');
      mockFind.mockReturnValue('');
      mockDownloadTool.mockResolvedValue('/tmp/downloaded-file');
      mockCacheFile.mockResolvedValue(
        '/runner/cache/python-cli-mac-arm64/9.9.9'
      );

      const result = await getExecutablePath(false);

      expect(mockDownloadTool).toHaveBeenCalledWith(
        'https://github.com/Thre4dripper/play-console-info/releases/download/v9.9.9/play_console_cli-mac-arm64'
      );
      expect(mockCacheFile).toHaveBeenCalledWith(
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
      expect(mockExecFn).toHaveBeenCalledWith('chmod', ['+x', result]);
    });

    it('strips leading v from PLAY_CONSOLE_RELEASE_TAG override', async () => {
      process.env.PLAY_CONSOLE_RELEASE_TAG = 'v1.2.3';
      mockPlatform.mockReturnValue('linux');
      mockArch.mockReturnValue('x64');
      mockFind.mockReturnValue('');
      mockDownloadTool.mockResolvedValue('/tmp/downloaded');
      mockCacheFile.mockResolvedValue('/cache/dir');

      await getExecutablePath(false);

      expect(mockFind).toHaveBeenCalledWith('python-cli-linux-x64', '1.2.3');
      expect(mockDownloadTool).toHaveBeenCalledWith(
        expect.stringContaining('/releases/download/v1.2.3/')
      );
    });

    it('does not chmod on windows after download', async () => {
      mockPlatform.mockReturnValue('win32');
      mockArch.mockReturnValue('x64');
      mockFind.mockReturnValue('');
      mockDownloadTool.mockResolvedValue('/tmp/downloaded');
      mockCacheFile.mockResolvedValue('/cache/dir');

      await getExecutablePath(false);

      expect(mockExecFn).not.toHaveBeenCalled();
    });

    it('falls back to package.json version when no release tag override is set', async () => {
      delete process.env.PLAY_CONSOLE_RELEASE_TAG;
      mockPlatform.mockReturnValue('linux');
      mockArch.mockReturnValue('x64');
      mockFind.mockReturnValue('');
      mockDownloadTool.mockResolvedValue('/tmp/downloaded');
      mockCacheFile.mockResolvedValue('/cache/dir');

      const pkgVersion = pkg.version;

      await getExecutablePath(false);

      expect(mockFind).toHaveBeenCalledWith(
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
      mockPlatform.mockReturnValue(platform as NodeJS.Platform);

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
    vi.spyOn(process, 'cwd').mockReturnValue('/custom/path');
    mockPlatform.mockReturnValue('linux');
    mockArch.mockReturnValue('x64');

    const result = await getExecutablePath(true);
    expect(result).toBe(
      path.join('/custom/path', 'bin', 'mock', 'linux', 'mockCli-linux-x64')
    );
  });
});

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls all core logging methods correctly', () => {
    const testMessage = 'test message';

    Logger.info(testMessage);
    Logger.warning(testMessage);
    Logger.error(testMessage);
    Logger.debug(testMessage);
    Logger.notice(testMessage);

    expect(mockInfo).toHaveBeenCalledWith(testMessage);
    expect(mockWarning).toHaveBeenCalledWith(testMessage);
    expect(mockError).toHaveBeenCalledWith(testMessage);
    expect(mockDebug).toHaveBeenCalledWith(testMessage);
    expect(mockNotice).toHaveBeenCalledWith(testMessage);
  });

  it('handles different message types', () => {
    Logger.info('');
    Logger.error('Special chars: !@#$%^&*()');
    Logger.debug('Multi\nline\nmessage');

    expect(mockInfo).toHaveBeenCalledWith('');
    expect(mockError).toHaveBeenCalledWith('Special chars: !@#$%^&*()');
    expect(mockDebug).toHaveBeenCalledWith('Multi\nline\nmessage');
  });
});
