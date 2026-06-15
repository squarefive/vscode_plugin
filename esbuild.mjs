import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const extensionBuildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  target: 'node20'
};

if (watch) {
  const extensionContext = await esbuild.context(extensionBuildOptions);
  await extensionContext.watch();
  console.log('Watching extension bundle...');
} else {
  await esbuild.build(extensionBuildOptions);
}
