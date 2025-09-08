import path from 'path';
import fs from 'fs';

const mock = async () => {
  const file1 = fs.createReadStream(
    path.join(process.cwd(), 'tests', 'result.txt')
  );

  const file2 = fs.createReadStream(
    path.join(process.cwd(), 'tests', 'result.json')
  );

  const chunkLimit = 1;
  let linesCount = 0;

  for await (const chunk of file1) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    for (let i = 0; i < buffer.length; i += chunkLimit) {
      const limitedChunk = buffer.slice(i, i + chunkLimit);

      process.stderr.write(limitedChunk);
      // await new Promise((resolve) => setTimeout(resolve, 0)); // Simulate delay

      if (limitedChunk.toString() === '\n') linesCount++;

      // after 25 lines, switch to stdout
      if (linesCount === 25) {
        for await (const chunk of file2) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          for (let i = 0; i < buffer.length; i += chunkLimit) {
            const limitedChunk = buffer.slice(i, i + chunkLimit);
            process.stdout.write(limitedChunk);
            // await new Promise((resolve) => setTimeout(resolve, 0)); // Simulate delay
          }
        }
      }
    }
  }

  file1.close();
  file2.close();
};

mock().then((r) => r);
