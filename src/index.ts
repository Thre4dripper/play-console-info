import run from './main';
import { getExecutablePath } from './utils';
import { getArguments, getPackage, getServiceAccountJsonPath } from './inputs';

const executablePath = getExecutablePath();
const serviceAccountJson = getServiceAccountJsonPath();
const pkg = getPackage();

const args = [
  '--creds-path',
  serviceAccountJson,
  '--package',
  pkg,
  '--json',
  ...getArguments(),
];

run({ command: executablePath, args }).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
