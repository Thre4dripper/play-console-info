import run from './main';
import {
  getArguments,
  getExecutablePath,
  getPackage,
  getServiceAccountJsonPath,
} from './utils';

const executablePath = getExecutablePath();
const serviceAccountJson = getServiceAccountJsonPath();
const pkg = getPackage();

const args = [
  '--creds-path',
  serviceAccountJson,
  '--package',
  pkg,
  '--json',
  ...getArguments()
];

run({ command: executablePath, args }).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
