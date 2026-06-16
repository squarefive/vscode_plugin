import { runTests } from '@vscode/test-electron';
import path from 'node:path';

async function runExtensionTests(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '..', '..');
  const extensionTestsPath = path.resolve(__dirname, 'suite', 'index');

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [extensionDevelopmentPath]
  });
}

runExtensionTests().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
