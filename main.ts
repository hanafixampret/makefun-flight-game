// Ridge Runner — Alpine Air Rally: the hand-in program.
// Node 22, standard library only. It copies the playable game and the
// screenshots into the output directory and writes the dossier that the
// kit's library builds from them, byte for byte as the scorer rebuilds it.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const rootDir = new URL('.', import.meta.url).pathname;

mkdirSync(outDir, { recursive: true });
cpSync(join(rootDir, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(rootDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
// Fail loudly instead of handing in a half-copied game.
if (!existsSync(join(outDir, 'game', 'index.html'))) {
  throw new Error('hand-in failed: game/index.html did not copy to the output');
}
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Ridge Runner handed in: game/ + ${dossier.length} byte dossier.json in ${outDir}`);
