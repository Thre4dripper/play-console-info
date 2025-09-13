import { ChildProcess, spawn } from 'child_process';
import { ResultData, runProps } from './types';
import { ActionError } from './utils';
import {
  setApks,
  setAppDetails,
  setBundles,
  setExpansionFiles,
  setImages,
  setInapps,
  setListings,
  setReviews,
  setTesters,
  setTracks,
  setVoidedPurchases,
} from './outputs';

const run = async ({ command, args }: runProps) => {
  const result = await getResult({ command, args });

  if (result == null) {
    throw new ActionError('No Result returned from Service Account');
  }
  // Set Outputs
  await Promise.all([
    setTracks(result),
    setApks(result),
    setBundles(result),
    setListings(result),
    setImages(result),
    setInapps(result),
    setReviews(result),
    setVoidedPurchases(result),
    setTesters(result),
    setAppDetails(result),
    setExpansionFiles(result),
  ]);
};

const getResult = async ({
  command,
  args,
}: runProps): Promise<ResultData | null> => {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(command, args, {
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
