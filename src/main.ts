import { ChildProcess, spawn } from 'child_process';

type runProps = {
  command: string;
  args: string[];
};

const run = async ({ command, args }: runProps) => {
  const promise = new Promise((resolve, reject) => {
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

  const result = await promise;
  console.log(result);
  return result;
};

export default run;
