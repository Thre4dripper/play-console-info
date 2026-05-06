import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, afterAll } from '@jest/globals';

/**
 * These tests spawn cli/mock/mockCli.js via Node.js (not the compiled binary).
 * Running under c8, the child process inherits NODE_V8_COVERAGE and writes its
 * own V8 coverage data, allowing c8 to report coverage of mockCli.js source.
 */
describe('mockCli (JS source)', () => {
  const mockCliPath = path.join(__dirname, '..', 'cli', 'mock', 'mockCli.js');
  const mockCredsPath = path.join(
    __dirname,
    '..',
    'cli',
    'mock',
    'test-creds.json'
  );

  const runCli = (
    args: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [mockCliPath, ...args]);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code || 0 });
      });

      child.on('error', (error) => {
        resolve({ stdout, stderr: error.message, exitCode: 1 });
      });
    });
  };

  // Command line argument validation tests
  describe('command line validation', () => {
    it('displays help when no arguments provided', async () => {
      const result = await runCli([]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('required option');
    });

    it('displays version information', async () => {
      const result = await runCli(['--version']);

      expect(result.stdout).toContain('1.0.0');
      expect(result.exitCode).toBe(0);
    });

    it('fails when package name is missing', async () => {
      const result = await runCli(['-c', mockCredsPath, '--all']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('required option');
    });

    it('fails when credentials path is missing', async () => {
      const result = await runCli(['-p', 'com.example.app', '--all']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('required option');
    });
  });

  // Resource selection tests
  describe('resource selection', () => {
    it('fails when no resources are selected', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('[ERROR] No resources selected');
    });

    it('fetches all resources with --all flag', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '--all',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[PROGRESS] Fetching tracks...');
      expect(result.stderr).toContain('[PROGRESS] Fetching apks...');
      expect(result.stderr).toContain('[INFO] Completed successfully!');
    });

    it('handles individual resource flags correctly', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-a',
        '-b',
        '-l',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[PROGRESS] Fetching apks...');
      expect(result.stderr).toContain('[PROGRESS] Fetching bundles...');
      expect(result.stderr).toContain('[PROGRESS] Fetching listings...');
    });

    it('fetches inapps with --inapps flag', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-I',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[PROGRESS] Fetching in-app products...');
    });

    it('fetches voided purchases with --voided-purchases flag', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-v',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[PROGRESS] Fetching voided purchases');
    });

    it('fetches app details with --app-details flag', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-d',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[PROGRESS] Fetching app details...');
    });

    it('fetches expansion files with --expansion-files flag', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-e',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[PROGRESS] Fetching expansion files...');
    });

    it('falls back to empty object for missing resource keys in result.json', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mockCli-test-'));
      fs.mkdirSync(path.join(tmpDir, 'cli', 'mock'), { recursive: true });
      // Write a result.json with no data for any resource
      fs.writeFileSync(
        path.join(tmpDir, 'cli', 'mock', 'result.json'),
        JSON.stringify({})
      );
      const runCliFrom = (
        cwd: string,
        args: string[]
      ): Promise<{ stdout: string; stderr: string; exitCode: number }> =>
        new Promise((resolve) => {
          const child = spawn(process.execPath, [mockCliPath, ...args], { cwd });
          let stdout = '';
          let stderr = '';
          child.stdout.on('data', (d) => (stdout += d.toString()));
          child.stderr.on('data', (d) => (stderr += d.toString()));
          child.on('close', (code) => resolve({ stdout, stderr, exitCode: code || 0 }));
          child.on('error', (error) => resolve({ stdout, stderr: error.message, exitCode: 1 }));
        });

      const result = await runCliFrom(tmpDir, [
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-a',
        '-b',
        '-l',
        '-I',
        '-r',
        '-v',
        '-d',
        '-e',
      ]);
      fs.rmSync(tmpDir, { recursive: true });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[INFO] Completed successfully!');
    });
  });

  // Track validation tests
  describe('track validation', () => {
    it('fetches specific tracks when tracks option provided', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-t',
        'production,beta',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[PROGRESS] Fetching tracks...');
    });

    it('fetches all tracks when tracks set to all', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-t',
        'all',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[PROGRESS] Fetching tracks...');
    });

    it('handles case insensitive track names', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-t',
        'PRODUCTION,BETA',
      ]);

      expect(result.exitCode).toBe(0);
    });

    it('fails with invalid track names', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-t',
        'invalid',
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid track names');
    });

    it('treats empty tracks value as no resource selection', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-t',
        '',
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('[ERROR] No resources selected');
    });

    it('fails with invalid comma placement in tracks', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-t',
        ',production,',
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('invalid comma placement');
    });

    it('fails with double commas in tracks', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-t',
        'production,,beta',
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('invalid comma placement');
    });
  });

  // Image validation tests
  describe('image validation', () => {
    it('fetches specific images when images option provided', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-i',
        'icon,featureGraphic',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[PROGRESS] Fetching images...');
    });

    it('fetches all images when images set to all', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-i',
        'all',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[PROGRESS] Fetching images...');
    });

    it('fails with invalid image types', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-i',
        'invalid',
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid image types');
    });
  });

  // Tester validation tests
  describe('tester validation', () => {
    it('fetches specific testers when testers option provided', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-T',
        'beta,alpha',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[PROGRESS] Fetching testers...');
    });

    it('fetches all testers when testers set to all', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-T',
        'all',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('[PROGRESS] Fetching testers...');
    });

    it('fails with invalid tester track names', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-T',
        'invalid',
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid tester track names');
    });
  });

  // Reviews parameter validation tests
  describe('reviews parameter validation', () => {
    it('accepts valid reviews pages parameter', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-r',
        '-P',
        '5',
      ]);

      expect(result.exitCode).toBe(0);
    });

    it('fails with invalid reviews pages parameter', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-r',
        '-P',
        'invalid',
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('must be a positive integer');
    });

    it('accepts valid reviews page size parameter', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-r',
        '-S',
        '50',
      ]);

      expect(result.exitCode).toBe(0);
    });

    it('fails with invalid reviews page size parameter', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-r',
        '-S',
        '0',
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('must be a positive integer');
    });

    it('sets default values for optional parameters', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '-r',
      ]);

      expect(result.exitCode).toBe(0);
    });
  });

  // Output format tests
  describe('output format', () => {
    it('outputs JSON when json flag provided', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '--all',
        '--json',
      ]);

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    it('outputs tree format by default', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '--all',
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('●'); // Tree format uses bullet points
    });
  });

  // Error handling tests
  describe('error handling', () => {
    it('handles process spawn errors gracefully', async () => {
      const result = await runCli(['--invalid-option']);

      expect(result.exitCode).toBe(1);
    });

    it('handles unexpected errors gracefully', async () => {
      // Test with malformed JSON in credentials to trigger error handling
      fs.writeFileSync(mockCredsPath, 'invalid json');
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '--all',
      ]);

      expect(result.exitCode).toBe(0); // CLI doesn't validate JSON content, just existence
    });

    afterAll(() => {
      // Restore the valid JSON credentials file
      fs.writeFileSync(mockCredsPath, JSON.stringify({}));
    });
  });

  // Data file error tests
  describe('data file errors', () => {
    const runCliFrom = (
      cwd: string,
      args: string[]
    ): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
      return new Promise((resolve) => {
        const child = spawn(process.execPath, [mockCliPath, ...args], { cwd });
        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          resolve({ stdout, stderr, exitCode: code || 0 });
        });

        child.on('error', (error) => {
          resolve({ stdout, stderr: error.message, exitCode: 1 });
        });
      });
    };

    const setupTempCwd = (resultContent: string): string => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mockCli-test-'));
      fs.mkdirSync(path.join(tmpDir, 'cli', 'mock'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, 'cli', 'mock', 'result.json'),
        resultContent
      );
      return tmpDir;
    };

    it('fails when credentials file does not exist', async () => {
      const result = await runCli([
        '-p',
        'com.example.app',
        '-c',
        '/tmp/nonexistent-creds-xyz-mockCliTest.json',
        '--all',
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('[ERROR] Credentials file not found');
    });

    it('fails when result.json does not exist', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mockCli-test-'));
      const result = await runCliFrom(tmpDir, [
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '--all',
      ]);
      fs.rmSync(tmpDir, { recursive: true });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('[ERROR] result.json not found');
    });

    it('fails when result.json is empty', async () => {
      const tmpDir = setupTempCwd('');
      const result = await runCliFrom(tmpDir, [
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '--all',
      ]);
      fs.rmSync(tmpDir, { recursive: true });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('[ERROR] result.json is empty');
    });

    it('fails when result.json contains invalid JSON', async () => {
      const tmpDir = setupTempCwd('{ invalid json }');
      const result = await runCliFrom(tmpDir, [
        '-p',
        'com.example.app',
        '-c',
        mockCredsPath,
        '--all',
      ]);
      fs.rmSync(tmpDir, { recursive: true });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('[ERROR] Failed to parse result.json');
    });
  });
});
