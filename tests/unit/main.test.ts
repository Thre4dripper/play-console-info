import { EventEmitter } from 'events';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import mockResult from '../../cli/mock/result.json' with { type: 'json' };
import type { spawn as SpawnType } from 'child_process';
import type { setOutputs as SetOutputsType } from '../../src/utils/outputs.js';
import type { createArtifact as CreateArtifactType } from '../../src/utils/artifacts.js';
import type { getExecutablePath as GetExecutablePathType } from '../../src/utils/helpers.js';

const {
  mockSpawnFn,
  mockSetOutputsFn,
  mockCreateArtifactFn,
  mockGetExecutablePathFn,
} = vi.hoisted(() => ({
  mockSpawnFn: vi.fn(),
  mockSetOutputsFn: vi.fn(),
  mockCreateArtifactFn: vi.fn(),
  mockGetExecutablePathFn: vi.fn(),
}));

vi.mock('child_process', () => ({
  spawn: mockSpawnFn,
}));

vi.mock('../../src/utils/outputs.js', () => ({
  setOutputs: mockSetOutputsFn,
}));

vi.mock('../../src/utils/artifacts.js', () => ({
  createArtifact: mockCreateArtifactFn,
}));

vi.mock('../../src/utils/helpers.js', () => ({
  ActionError: class ActionError extends Error {
    constructor(message: string) {
      super(message);
    }
  },
  getExecutablePath: mockGetExecutablePathFn,
  Logger: {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    notice: vi.fn(),
  },
}));

vi.mock('@actions/core', () => ({
  setFailed: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  notice: vi.fn(),
}));

import { default as run } from '../../src/main.js';
import { ActionError } from '../../src/utils/helpers.js';

// Typed aliases for better mock method inference
const mockSpawn = mockSpawnFn as unknown as ReturnType<typeof vi.fn> &
  typeof SpawnType;
const mockSetOutputs = mockSetOutputsFn as ReturnType<typeof vi.fn> & {
  mockResolvedValue: (v: unknown) => void;
};
const mockCreateArtifact = mockCreateArtifactFn as ReturnType<typeof vi.fn>;
const mockGetExecutablePath = mockGetExecutablePathFn as ReturnType<
  typeof vi.fn
>;

describe('main.ts', () => {
  let mockChildProcess: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChildProcess = new EventEmitter();
    mockChildProcess.stdout = new EventEmitter();
    mockChildProcess.stderr = new EventEmitter();
    mockChildProcess.stdout.setEncoding = vi.fn();
    mockChildProcess.stderr.setEncoding = vi.fn();

    mockSpawnFn.mockReturnValue(mockChildProcess);
    mockSetOutputsFn.mockResolvedValue(undefined);
    mockCreateArtifactFn.mockResolvedValue(undefined);
    mockGetExecutablePathFn.mockResolvedValue('test-command');
  });

  describe('run function', () => {
    const mockRunProps = {
      cliArgs: ['--arg1', 'value1'],
      artifactArgs: {
        uploadOutputsArtifact: true,
        outputsJsonPath: 'test-path',
        outputsArtifactName: 'test-artifact',
        outputsArtifactRetentionDays: '30',
      },
    };

    it('should execute successfully with valid JSON output', async () => {
      const jsonOutput = JSON.stringify(mockResult);

      const runPromise = run(mockRunProps);

      // Wait for getExecutablePath to be called
      await new Promise(setImmediate);

      // Simulate stdout data
      mockChildProcess.stdout.emit('data', jsonOutput);

      // Simulate successful exit
      mockChildProcess.emit('exit', 0);

      await runPromise;

      expect(mockSpawnFn).toHaveBeenCalledWith(
        'test-command',
        ['--arg1', 'value1'],
        {
          stdio: ['inherit', 'pipe', 'pipe'],
          env: { ...process.env },
        }
      );
      expect(mockSetOutputsFn).toHaveBeenCalledWith(mockResult);
      expect(mockCreateArtifactFn).toHaveBeenCalledWith(
        mockRunProps.artifactArgs,
        mockResult
      );
    });

    it('should throw ActionError when getResult returns null', async () => {
      const runPromise = run(mockRunProps);

      // Wait for getExecutablePath to be called
      await new Promise(setImmediate);

      // Simulate exit with no output (empty jsonBuffer)
      mockChildProcess.emit('exit', 0);

      await expect(runPromise).rejects.toThrow(ActionError);
      await expect(runPromise).rejects.toThrow(
        'No Result returned from Service Account'
      );
    });

    it('should handle process exit with non-zero code', async () => {
      const runPromise = run(mockRunProps);

      // Wait for getExecutablePath to be called
      await new Promise(setImmediate);

      mockChildProcess.emit('exit', 1);

      await expect(runPromise).rejects.toThrow('Process exited with code 1');
    });

    it('should handle JSON parsing errors', async () => {
      const runPromise = run(mockRunProps);

      // Wait for getExecutablePath to be called
      await new Promise(setImmediate);

      // Simulate invalid JSON output
      mockChildProcess.stdout.emit('data', 'invalid-json');
      mockChildProcess.emit('exit', 0);

      await expect(runPromise).rejects.toThrow('Failed to parse JSON output:');
    });

    it('should handle child process errors', async () => {
      const testError = new Error('Process spawn error');
      const runPromise = run(mockRunProps);

      await new Promise(setImmediate);
      mockChildProcess.emit('error', testError);

      await expect(runPromise).rejects.toThrow(testError);
    });

    it('should handle chunked JSON data correctly', async () => {
      const jsonOutput = JSON.stringify(mockResult);
      const chunk1 = jsonOutput.slice(0, 5);
      const chunk2 = jsonOutput.slice(5);

      const runPromise = run(mockRunProps);

      await new Promise(setImmediate);
      // Simulate chunked data
      mockChildProcess.stdout.emit('data', chunk1);
      mockChildProcess.stdout.emit('data', chunk2);
      mockChildProcess.emit('exit', 0);

      await runPromise;

      expect(mockSetOutputsFn).toHaveBeenCalledWith(mockResult);
      expect(mockCreateArtifactFn).toHaveBeenCalledWith(
        mockRunProps.artifactArgs,
        mockResult
      );
    });

    it('should stream stderr data to stdout', async () => {
      const originalWrite = process.stdout.write;
      const mockWrite = vi.fn();
      process.stdout.write = mockWrite as any;

      const runPromise = run(mockRunProps);
      const stderrData = 'Error message';

      await new Promise(setImmediate);
      // Simulate stderr data
      mockChildProcess.stderr.emit('data', stderrData);
      mockChildProcess.emit('exit', 0);

      try {
        await runPromise;
      } catch {
        // Expected to fail due to no stdout data
      }

      expect(mockWrite).toHaveBeenCalledWith(stderrData);
      process.stdout.write = originalWrite;
    });

    it('should set encoding on stdout and stderr', async () => {
      const runPromise = run(mockRunProps);

      await new Promise(setImmediate);
      mockChildProcess.emit('exit', 0);

      try {
        await runPromise;
      } catch {
        // Expected to fail due to no stdout data
      }

      expect(mockChildProcess.stdout.setEncoding).toHaveBeenCalledWith('utf8');
      expect(mockChildProcess.stderr.setEncoding).toHaveBeenCalledWith('utf8');
    });

    it('should handle empty JSON buffer after trimming', async () => {
      const runPromise = run(mockRunProps);

      await new Promise(setImmediate);
      // Simulate whitespace-only output
      mockChildProcess.stdout.emit('data', '   \n  \t  ');
      mockChildProcess.emit('exit', 0);

      await expect(runPromise).rejects.toThrow(
        'No Result returned from Service Account'
      );
    });

    it('should pass environment variables to child process', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, TEST_VAR: 'test-value' };

      const runPromise = run(mockRunProps);

      await new Promise(setImmediate);
      mockChildProcess.emit('exit', 0);

      try {
        await runPromise;
      } catch {
        // Expected to fail due to no stdout data
      }

      expect(mockSpawnFn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({ TEST_VAR: 'test-value' }),
        })
      );

      process.env = originalEnv;
    });
  });
});
