import path from 'path';
import os from 'os';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';

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

// Repository slug used to construct release-asset download URLs.
// Override via env var for forks / testing.
const RELEASE_REPO =
  process.env.PLAY_CONSOLE_RELEASE_REPO ?? 'Thre4dripper/play-console-info';

type BinarySpec = {
  /** Tool-cache identifier (folder name under runner tool cache) */
  toolName: string;
  /** Filename of the binary as published in the GitHub Release */
  fileName: string;
  /** Subdirectory under bin/ used for local resolution (legacy / mock / dev) */
  localSubDir: string[];
  /** Whether the binary needs `chmod +x` after being placed on disk */
  needsChmod: boolean;
};

/**
 * Compute the binary specification (filename, tool-cache name, local fallback
 * path) for the current platform and architecture.
 */
const getBinarySpec = (useMock: boolean): BinarySpec => {
  const platform = os.platform();
  const arch = os.arch() === 'arm64' ? 'arm64' : 'x64';
  Logger.debug(`Platform detected: ${platform}, arch: ${arch}`);

  const kind = useMock ? 'mock' : 'python';
  const baseName = useMock ? 'mockCli' : 'play_console_cli';

  switch (platform) {
    case 'win32': {
      // Windows binaries are only published as x64.
      const fileName = `${baseName}-windows-x64.exe`;
      return {
        toolName: `${kind}-cli-windows-x64`,
        fileName,
        localSubDir: ['bin', kind, 'windows'],
        needsChmod: false,
      };
    }
    case 'darwin': {
      if (arch !== 'arm64') {
        throw new ActionError(
          'macOS x64 is not supported — only arm64 binaries are published'
        );
      }
      const fileName = `${baseName}-mac-arm64`;
      return {
        toolName: `${kind}-cli-mac-arm64`,
        fileName,
        localSubDir: ['bin', kind, 'mac'],
        needsChmod: true,
      };
    }
    case 'linux': {
      const fileName = `${baseName}-linux-${arch}`;
      return {
        toolName: `${kind}-cli-linux-${arch}`,
        fileName,
        localSubDir: ['bin', kind, 'linux'],
        needsChmod: true,
      };
    }
    default:
      throw new ActionError(`Unknown platform: ${platform}`);
  }
};

/**
 * Read the action's published version. The action ships its `package.json`
 * alongside `dist/`, so reading it at runtime tells us which release tag to
 * fetch binaries from. Set `PLAY_CONSOLE_RELEASE_TAG` to override (useful for
 * pinning a specific release during development).
 */
const getActionVersion = (): string => {
  const override = process.env.PLAY_CONSOLE_RELEASE_TAG;
  if (override) {
    return override.startsWith('v') ? override.slice(1) : override;
  }

  // dist/index.js is bundled at action root, so package.json sits one level up
  // from the bundled file's __dirname.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = require(path.resolve(__dirname, '../../package.json')) as {
    version: string;
  };
  return pkg.version;
};

/**
 * Download the binary for this platform from the corresponding GitHub Release
 * and cache it via @actions/tool-cache so subsequent runs reuse it.
 */
const downloadFromRelease = async (spec: BinarySpec): Promise<string> => {
  const version = getActionVersion();
  const tag = `v${version}`;

  // Reuse cached copy if present
  const cached = tc.find(spec.toolName, version);
  if (cached) {
    Logger.debug(`Using cached binary at ${cached}`);
    return path.join(cached, spec.fileName);
  }

  const url = `https://github.com/${RELEASE_REPO}/releases/download/${tag}/${spec.fileName}`;
  Logger.info(`⬇️  Downloading binary from ${url}`);

  const downloadedPath = await tc.downloadTool(url);
  const cachedDir = await tc.cacheFile(
    downloadedPath,
    spec.fileName,
    spec.toolName,
    version
  );

  return path.join(cachedDir, spec.fileName);
};

/**
 * Resolve the path of a binary that is expected to live on the local
 * filesystem (development mode, mock CLI tests, or an explicit override via
 * the `PLAY_CONSOLE_BIN_DIR` env var).
 */
const resolveLocalBinary = (spec: BinarySpec, baseDir: string): string => {
  return path.join(baseDir, ...spec.localSubDir, spec.fileName);
};

export const getExecutablePath = async (useMock: boolean): Promise<string> => {
  const spec = getBinarySpec(useMock);

  // Local binary resolution paths:
  //   - useMock=true             → mock CLI lives in this repo's bin/ (tests)
  //   - PLAY_CONSOLE_BIN_DIR set → explicit override (CI integration tests)
  // Otherwise we download the matching release asset on demand.
  const overrideDir = process.env.PLAY_CONSOLE_BIN_DIR;
  let binaryPath: string;

  if (useMock) {
    binaryPath = resolveLocalBinary(spec, process.cwd());
  } else if (overrideDir) {
    Logger.debug(`Using local binary override directory: ${overrideDir}`);
    binaryPath = resolveLocalBinary(spec, overrideDir);
  } else {
    binaryPath = await downloadFromRelease(spec);
  }

  if (spec.needsChmod) {
    await exec.exec('chmod', ['+x', binaryPath]);
  }

  return binaryPath;
};
