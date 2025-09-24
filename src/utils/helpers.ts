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
  // In GitHub Actions, GITHUB_ACTION_PATH points to the action's directory (where our binaries are)
  // For tests, use current working directory (this repo has the binaries)
  const basePath = useMock ? process.cwd() : process.env.GITHUB_ACTION_PATH!;

  console.log('env:', process.env.GITHUB_ACTION_PATH);

  Logger.debug(`Using base path: ${basePath}`);

  const platform = os.platform();
  Logger.debug(`Platform detected: ${platform}`);

  if (useMock) {
    // For mock/testing purposes
    switch (platform) {
      case 'win32': {
        // For .exe files, no special execution policy is typically needed
        // But ensure we can run executables in case of restrictive environments
        return path.join(basePath, 'bin', 'mock', 'windows', 'mockCli.exe');
      }
      case 'darwin':
      case 'linux': {
        const mockCliPath = path.join(
          basePath,
          'bin',
          'mock',
          'linux',
          'mockCli'
        );
        await exec.exec('chmod', ['+x', mockCliPath]);
        return path.join(basePath, 'bin', 'mock', 'linux', 'mockCli');
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
        'play_console_cli.exe'
      );
    }
    case 'darwin':
    case 'linux': {
      const pythonCliPath = path.join(
        basePath,
        'bin',
        'python',
        'linux',
        'play_console_cli'
      );
      await exec.exec('chmod', ['+x', pythonCliPath]);
      return path.join(basePath, 'bin', 'python', 'linux', 'play_console_cli');
    }
    default:
      throw new ActionError(`Unknown platform: ${platform}`);
  }
};
