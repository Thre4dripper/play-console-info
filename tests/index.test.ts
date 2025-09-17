import { describe, it, expect, jest } from '@jest/globals';

// Mock all dependencies 
jest.mock('../src/main', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => Promise.resolve())
}));
jest.mock('../src/utils/helpers', () => ({
  getExecutablePath: jest.fn().mockReturnValue('/path/to/cli')
}));
jest.mock('../src/utils/inputs', () => ({
  getServiceAccountJsonPath: jest.fn().mockReturnValue('/path/to/creds.json'),
  getPackage: jest.fn().mockReturnValue('com.example.app'),
  getCliArguments: jest.fn().mockReturnValue(['--extra-arg']),
  getArtifactsInputs: jest.fn().mockReturnValue({ uploadOutputsArtifact: false }),
}));

describe('index', () => {
  it('should import without throwing errors', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../src/index');
    }).not.toThrow();
  });
});