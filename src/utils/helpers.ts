import path from 'path';
import os from 'os';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    core.setFailed(message);
  }
}

export class Logger {
  static info(message: string) {
    core.info(message);
  }

  static warning(message: string) {
    core.warning(message);
  }

  static error(message: string) {
    core.error(message);
  }

  static debug(message: string) {
    core.debug(message);
  }

  static notice(message: string) {
    core.notice(message);
  }
}

export const getExecutablePath = async (useMock: boolean): Promise<string> => {
  // For mock/tests: use current working directory (this repo has the binaries)
  // For production: use the action directory (where dist/index.js is running from)
  const basePath = useMock ? process.cwd() : path.resolve(__dirname, '../..'); // Go up from dist/ to action root

  Logger.debug(`Using base path: ${basePath}`);

  const platform = os.platform();
  const arch = os.arch() === 'arm64' ? 'arm64' : 'x64';
  Logger.debug(`Platform detected: ${platform}, arch: ${arch}`);

  if (useMock) {
    // For mock/testing purposes
    switch (platform) {
      case 'win32': {
        // For .exe files, no special execution policy is typically needed
        // But ensure we can run executables in case of restrictive environments
        return path.join(
          basePath,
          'bin',
          'mock',
          'windows',
          'mockCli-windows-x64.exe'
        );
      }
      case 'darwin': {
        const mockCliPath = path.join(
          basePath,
          'bin',
          'mock',
          'mac',
          `mockCli-mac-${arch}`
        );
        await exec.exec('chmod', ['+x', mockCliPath]);
        return mockCliPath;
      }
      case 'linux': {
        const mockCliPath = path.join(
          basePath,
          'bin',
          'mock',
          'linux',
          `mockCli-linux-${arch}`
        );
        await exec.exec('chmod', ['+x', mockCliPath]);
        return mockCliPath;
      }
      default:
        throw new ActionError(`Unknown platform: ${platform}`);
    }
  }

  // Real Python CLI binaries
  switch (platform) {
    case 'win32': {
      // For .exe files, no special execution policy is typically needed
      // But ensure we can run executables in case of restrictive environments
      return path.join(
        basePath,
        'bin',
        'python',
        'windows',
        'play_console_cli-windows-x64.exe'
      );
    }
    case 'darwin': {
      const pythonCliPath = path.join(
        basePath,
        'bin',
        'python',
        'mac',
        `play_console_cli-mac-${arch}`
      );
      await exec.exec('chmod', ['+x', pythonCliPath]);
      return pythonCliPath;
    }
    case 'linux': {
      const pythonCliPath = path.join(
        basePath,
        'bin',
        'python',
        'linux',
        `play_console_cli-linux-${arch}`
      );
      await exec.exec('chmod', ['+x', pythonCliPath]);
      return pythonCliPath;
    }
    default:
      throw new ActionError(`Unknown platform: ${platform}`);
  }
};
