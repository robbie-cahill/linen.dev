import * as esbuild from 'esbuild';
import { rimraf } from 'rimraf';
import { readdir } from 'fs/promises';
import { join } from 'path';

await rimraf('dist');
const source = 'src';

await esbuild.build({
  entryPoints: (await readdir(source, { withFileTypes: true }))
    .filter((v) => v.isFile())
    .map((v) => join(source, v.name)),
  bundle: true,
  outdir: 'dist',
  platform: 'node',
  target: 'node18',
  external: ['graphile-worker', '@linen/database', 'discord.js'],
  logLevel: 'info',
  minify: true,
});
