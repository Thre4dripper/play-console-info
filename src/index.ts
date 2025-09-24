import run from './main';
import {
  getCliArguments,
  getArtifactsInputs,
  getPackage,
  getServiceAccountJsonPath,
} from './utils/inputs';

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
