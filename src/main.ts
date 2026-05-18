import { ChildProcess, spawn } from 'child_process';
import { GetResultProps, ResultData, RunProps } from './types.js';
import { ActionError, getExecutablePath, Logger } from './utils/helpers.js';
import { setOutputs } from './utils/outputs.js';
import { createArtifact } from './utils/artifacts.js';

const run = async ({ cliArgs, artifactArgs }: RunProps) => {
  Logger.info('🚀 Starting Play Console Info Action');

  Logger.info('📍 Resolving executable path...');
  const command = await getExecutablePath(process.env.NODE_ENV === 'mock');
  Logger.debug(`Using executable: ${command}`);

  Logger.info('📊 Fetching Play Console data...');
  const result = await getResult({ command, cliArgs });

  if (result == null) {
    throw new ActionError('No Result returned from Service Account');
  }

  Logger.info('✅ Play Console data retrieved successfully');
  await setOutputs(result);

  await createArtifact(artifactArgs, result);

  Logger.info('🎉 Play Console Info Action completed successfully');
};

const getResult = async ({
  command,
  cliArgs,
}: GetResultProps): Promise<ResultData | null> => {
  return new Promise((resolve, reject) => {
    Logger.debug(`Executing command: ${command} ${cliArgs.join(' ')}`);

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
        Logger.debug('CLI process completed successfully');
        if (jsonBuffer.trim()) {
          try {
            Logger.debug('Parsing JSON response...');
            const parsed = JSON.parse(jsonBuffer);
            resolve(parsed);
          } catch (e) {
            Logger.error(`Failed to parse JSON output: ${e}`);
            reject(new Error(`Failed to parse JSON output: ${e}`));
          }
        } else {
          Logger.warning('No JSON output received from CLI');
          resolve(null);
        }
      } else {
        Logger.error(`CLI process exited with code ${code}`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
};

export default run;
