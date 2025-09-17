import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock all dependencies
const mockRun = jest.fn();

jest.mock('../src/main', () => ({
  __esModule: true,
  default: mockRun,
}));
jest.mock('../src/utils/helpers', () => ({
  getExecutablePath: jest.fn().mockReturnValue('/path/to/cli'),
}));
jest.mock('../src/utils/inputs', () => ({
  getServiceAccountJsonPath: jest.fn().mockReturnValue('/path/to/creds.json'),
  getPackage: jest.fn().mockReturnValue('com.example.app'),
  getCliArguments: jest.fn().mockReturnValue(['--extra-arg']),
  getArtifactsInputs: jest
    .fn()
    .mockReturnValue({ 
      uploadOutputsArtifact: false,
      outputsJsonPath: 'test-path',
      outputsArtifactName: 'test-artifact',
      outputsArtifactRetentionDays: '30'
    }),
}));
jest.mock('@actions/core', () => ({
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  notice: jest.fn()
}));

describe('index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRun.mockImplementation(() => Promise.resolve());
  });

  it('should import without throwing errors', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../src/index');
    }).not.toThrow();
  });

  it('should call run and handle rejection', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const originalExitCode = process.exitCode;
    
    mockRun.mockImplementationOnce(() => Promise.reject(new Error('Test error')));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/index');

    // Wait a tick for the promise to reject
    await new Promise(process.nextTick);

    expect(mockRun).toHaveBeenCalledWith({
      command: '/path/to/cli',
      cliArgs: ['--creds-path', '/path/to/creds.json', '--package', 'com.example.app', '--json', '--extra-arg'],
      artifactArgs: {
        uploadOutputsArtifact: false,
        outputsJsonPath: 'test-path',
        outputsArtifactName: 'test-artifact',
        outputsArtifactRetentionDays: '30'
      }
    });
    expect(consoleSpy).toHaveBeenCalledWith(new Error('Test error'));
    expect(process.exitCode).toBe(1);

    // Cleanup
    consoleSpy.mockRestore();
    process.exitCode = originalExitCode;
  });
});