import path from 'path';
import os from 'os';
import * as core from '@actions/core';

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

export const getExecutablePath = (): string => {
  const basePath = path.join(process.cwd(), 'cli', 'dist');
  switch (os.platform()) {
    case 'win32':
      return path.join(basePath, 'play_console_cli.exe');
    case 'darwin':
    case 'linux':
      return path.join(basePath, 'play_console_cli');
    default:
      throw new ActionError(`Unknown platform: ${os.platform()}`);
  }
};