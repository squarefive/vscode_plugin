import Mocha from 'mocha';
import fs from 'node:fs';
import path from 'node:path';

export async function run(): Promise<void> {
  const mocha = new Mocha({
    color: true,
    ui: 'tdd'
  });

  const testsRoot = __dirname;
  const testFiles = fs
    .readdirSync(testsRoot)
    .filter((fileName) => fileName.endsWith('.test.js'));

  for (const testFile of testFiles) {
    mocha.addFile(path.resolve(testsRoot, testFile));
  }

  await new Promise<void>((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
