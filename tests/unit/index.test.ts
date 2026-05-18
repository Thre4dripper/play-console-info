import { vi, describe, it, expect, beforeEach } from 'vitest';

// vi.hoisted() ensures these mock functions are initialised before vi.mock() factories run.
const {
  mockRun,
  mockGetServiceAccountJsonPath,
  mockGetPackage,
  mockGetCliArguments,
  mockGetArtifactsInputs,
} = vi.hoisted(() => ({
  mockRun: vi.fn(),
  mockGetServiceAccountJsonPath: vi.fn(),
  mockGetPackage: vi.fn(),
  mockGetCliArguments: vi.fn(),
  mockGetArtifactsInputs: vi.fn(),
}));

vi.mock('../../src/main.js', () => ({
  default: mockRun,
}));

vi.mock('../../src/utils/helpers.js', () => ({
  getExecutablePath: vi.fn(),
}));

vi.mock('../../src/utils/inputs.js', () => ({
  getServiceAccountJsonPath: mockGetServiceAccountJsonPath,
  getPackage: mockGetPackage,
  getCliArguments: mockGetCliArguments,
  getArtifactsInputs: mockGetArtifactsInputs,
}));

vi.mock('@actions/core', () => ({
  setFailed: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  notice: vi.fn(),
}));

describe('index', () => {
  beforeEach(() => {
    // Clear call history; then reset the module cache so each test
    // gets a fresh evaluation of index.ts (which runs its top-level code).
    vi.clearAllMocks();
    vi.resetModules();

    mockRun.mockImplementation(() => Promise.resolve());
    mockGetServiceAccountJsonPath.mockReturnValue('/path/to/creds.json');
    mockGetPackage.mockReturnValue('com.example.app');
    mockGetCliArguments.mockReturnValue(['--extra-arg']);
    mockGetArtifactsInputs.mockReturnValue({
      uploadOutputsArtifact: false,
      outputsJsonPath: 'test-path',
      outputsArtifactName: 'test-artifact',
      outputsArtifactRetentionDays: '30',
    });
  });

  it('should import without throwing errors', async () => {
    await expect(import('../../src/index.js')).resolves.toBeDefined();
  });

  it('should call run and handle rejection', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalExitCode = process.exitCode;

    mockRun.mockImplementationOnce(() =>
      Promise.reject(new Error('Test error'))
    );

    await import('../../src/index.js');

    // Wait a tick for the unhandled-rejection catch branch to settle.
    await new Promise(process.nextTick);

    expect(mockRun).toHaveBeenCalledWith({
      cliArgs: [
        '--creds-path',
        '/path/to/creds.json',
        '--package',
        'com.example.app',
        '--json',
        '--extra-arg',
      ],
      artifactArgs: {
        uploadOutputsArtifact: false,
        outputsJsonPath: 'test-path',
        outputsArtifactName: 'test-artifact',
        outputsArtifactRetentionDays: '30',
      },
    });
    expect(consoleSpy).toHaveBeenCalledWith(new Error('Test error'));
    expect(process.exitCode).toBe(1);

    // Cleanup
    consoleSpy.mockRestore();
    process.exitCode = originalExitCode;
  });
});
