import { ChildProcess, spawn } from 'child_process';
import { GetResultProps, ResultData, RunProps } from './types';
import { ActionError } from './utils/helpers';
import { setOutputs } from './utils/outputs';
import { createArtifact } from './utils/artifacts';

const run = async ({ command, cliArgs, artifactArgs }: RunProps) => {
  const result = await getResult({ command, cliArgs });

  if (result == null) {
    throw new ActionError('No Result returned from Service Account');
  }
  // Set Outputs
  await setOutputs(result);

  // Create Artifacts
  await createArtifact(artifactArgs, result);
};

const getResult = async ({
  command,
  cliArgs,
}: GetResultProps): Promise<ResultData | null> => {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(command, cliArgs, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
      },
    });

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');

    let jsonBuffer = '';

    // Capture JSON output from stdout (do not stream it)
    child.stdout?.on('data', (chunk) => {
      jsonBuffer += chunk.toString();
    });

    // Stream logs/errors directly to this process stderr
    child.stderr?.on('data', (chunk) => process.stdout.write(chunk));

    child.on('error', reject);

    child.on('exit', (code) => {
      if (code === 0) {
        if (jsonBuffer.trim()) {
          try {
            const parsed = JSON.parse(jsonBuffer);
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Failed to parse JSON output: ${e}`));
          }
        } else {
          resolve(null);
        }
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
};

export default run;
