import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import run from '../src/main';
import { setOutputs } from '../src/utils/outputs';
import { createArtifact } from '../src/utils/artifacts';
import { ActionError } from '../src/utils/helpers';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
jest.mock('child_process');
jest.mock('../src/utils/outputs');
jest.mock('../src/utils/artifacts');
jest.mock('@actions/core', () => ({
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  notice: jest.fn()
}));

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockSetOutputs = setOutputs as jest.MockedFunction<typeof setOutputs>;
const mockCreateArtifact = createArtifact as jest.MockedFunction<typeof createArtifact>;

describe('main.ts', () => {
  let mockChildProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChildProcess = new EventEmitter();
    mockChildProcess.stdout = new EventEmitter();
    mockChildProcess.stderr = new EventEmitter();
    mockChildProcess.stdout.setEncoding = jest.fn();
    mockChildProcess.stderr.setEncoding = jest.fn();

    mockSpawn.mockReturnValue(mockChildProcess);
    mockSetOutputs.mockResolvedValue(undefined);
    mockCreateArtifact.mockResolvedValue(undefined);
  });

  describe('run function', () => {
    const mockRunProps = {
      command: 'test-command',
      cliArgs: ['--arg1', 'value1'],
      artifactArgs: {
        uploadOutputsArtifact: true,
        outputsJsonPath: 'test-path',
        outputsArtifactName: 'test-artifact',
        outputsArtifactRetentionDays: '30'
      }
    };

    it('should execute successfully with valid JSON output', async () => {
      const mockResult = {
        tracks: { kind: 'androidpublisher#tracksListResponse', tracks: [] },
        apks: { kind: 'androidpublisher#apksListResponse' },
        bundles: { kind: 'androidpublisher#bundlesListResponse', bundles: [] },
        listings: { kind: 'androidpublisher#listingsListResponse', listings: [] },
        images: { icon: { images: [] }, featureGraphic: { images: [] }, tvBanner: {}, phoneScreenshots: { images: [] }, sevenInchScreenshots: {}, tenInchScreenshots: {}, tvScreenshots: {}, wearScreenshots: {} },
        inapps: { kind: 'androidpublisher#inappsListResponse', tokenPagination: { previousPageToken: '' } },
        reviews: { count: 0, reviews: [] },
        voided_purchases: { count: 0, voidedPurchases: [] },
        testers: { internal: {}, alpha: {}, beta: {}, production: { googleGroups: [] } },
        app_details: { defaultLanguage: 'en-US', contactEmail: 'test@example.com' },
        expansion_files: { apks: {} }
      };
      const jsonOutput = JSON.stringify(mockResult);

      const runPromise = run(mockRunProps);

      // Simulate stdout data
      mockChildProcess.stdout.emit('data', jsonOutput);

      // Simulate successful exit
      mockChildProcess.emit('exit', 0);

      await runPromise;

      expect(mockSpawn).toHaveBeenCalledWith('test-command', ['--arg1', 'value1'], {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env }
      });
      expect(mockSetOutputs).toHaveBeenCalledWith(mockResult);
      expect(mockCreateArtifact).toHaveBeenCalledWith(mockRunProps.artifactArgs, mockResult);
    });

    it('should throw ActionError when getResult returns null', async () => {
      const runPromise = run(mockRunProps);

      // Simulate exit with no output (empty jsonBuffer)
      mockChildProcess.emit('exit', 0);

      await expect(runPromise).rejects.toThrow(ActionError);
      await expect(runPromise).rejects.toThrow('No Result returned from Service Account');
    });

    it('should handle process exit with non-zero code', async () => {
      const runPromise = run(mockRunProps);

      mockChildProcess.emit('exit', 1);

      await expect(runPromise).rejects.toThrow('Process exited with code 1');
    });

    it('should handle JSON parsing errors', async () => {
      const runPromise = run(mockRunProps);

      // Simulate invalid JSON output
      mockChildProcess.stdout.emit('data', 'invalid-json');
      mockChildProcess.emit('exit', 0);

      await expect(runPromise).rejects.toThrow('Failed to parse JSON output:');
    });

    it('should handle child process errors', async () => {
      const testError = new Error('Process spawn error');
      const runPromise = run(mockRunProps);

      mockChildProcess.emit('error', testError);

      await expect(runPromise).rejects.toThrow(testError);
    });

    it('should handle chunked JSON data correctly', async () => {
      const mockResult = {
        tracks: { kind: 'androidpublisher#tracksListResponse', tracks: [] },
        apks: { kind: 'androidpublisher#apksListResponse' },
        bundles: { kind: 'androidpublisher#bundlesListResponse', bundles: [] },
        listings: { kind: 'androidpublisher#listingsListResponse', listings: [] },
        images: { icon: { images: [] }, featureGraphic: { images: [] }, tvBanner: {}, phoneScreenshots: { images: [] }, sevenInchScreenshots: {}, tenInchScreenshots: {}, tvScreenshots: {}, wearScreenshots: {} },
        inapps: { kind: 'androidpublisher#inappsListResponse', tokenPagination: { previousPageToken: '' } },
        reviews: { count: 0, reviews: [] },
        voided_purchases: { count: 0, voidedPurchases: [] },
        testers: { internal: {}, alpha: {}, beta: {}, production: { googleGroups: [] } },
        app_details: { defaultLanguage: 'en-US', contactEmail: 'test@example.com' },
        expansion_files: { apks: {} }
      };
      const jsonOutput = JSON.stringify(mockResult);
      const chunk1 = jsonOutput.slice(0, 5);
      const chunk2 = jsonOutput.slice(5);

      const runPromise = run(mockRunProps);

      // Simulate chunked data
      mockChildProcess.stdout.emit('data', chunk1);
      mockChildProcess.stdout.emit('data', chunk2);
      mockChildProcess.emit('exit', 0);

      await runPromise;

      expect(mockSetOutputs).toHaveBeenCalledWith(mockResult);
      expect(mockCreateArtifact).toHaveBeenCalledWith(mockRunProps.artifactArgs, mockResult);
    });

    it('should stream stderr data to stdout', async () => {
      const originalWrite = process.stdout.write;
      const mockWrite = jest.fn();
      process.stdout.write = mockWrite as any;

      const runPromise = run(mockRunProps);
      const stderrData = 'Error message';

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

      // Simulate whitespace-only output
      mockChildProcess.stdout.emit('data', '   \n  \t  ');
      mockChildProcess.emit('exit', 0);

      await expect(runPromise).rejects.toThrow('No Result returned from Service Account');
    });

    it('should pass environment variables to child process', async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, TEST_VAR: 'test-value' };

      const runPromise = run(mockRunProps);
      mockChildProcess.emit('exit', 0);

      try {
        await runPromise;
      } catch {
        // Expected to fail due to no stdout data
      }

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({ TEST_VAR: 'test-value' })
        })
      );

      process.env = originalEnv;
    });
  });
});