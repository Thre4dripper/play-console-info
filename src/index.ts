import run from './main.js';
import {
  getCliArguments,
  getArtifactsInputs,
  getPackage,
  getServiceAccountJsonPath,
} from './utils/inputs.js';

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

run({ cliArgs, artifactArgs }).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
