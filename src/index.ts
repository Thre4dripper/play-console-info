import run from './main';
import { getExecutablePath } from './utils/helpers';
import {
  getCliArguments,
  getArtifactsInputs,
  getPackage,
  getServiceAccountJsonPath,
} from './utils/inputs';

const executablePath = getExecutablePath();
const serviceAccountJson = getServiceAccountJsonPath();
const pkg = getPackage();

const cliArgs = [
  '--creds-path',
  serviceAccountJson,
  '--package',
  pkg,
  '--json',
  ...getCliArguments(),
];

const artifactArgs = getArtifactsInputs();

run({ command: executablePath, cliArgs, artifactArgs }).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
