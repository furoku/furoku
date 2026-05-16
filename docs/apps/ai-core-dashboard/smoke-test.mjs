import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const checks = [
  ['dashboard title', 'AI Core Dashboard'],
  ['cycle count', 'cycle'],
  ['theme', '毎日、100ドル稼ぐAIエージェントを構築する'],
  ['journal link', '/furoku/apps/three-question-journal/'],
  ['timer link', '/furoku/apps/focus-sprint-timer/'],
  ['verification command', 'pytest agi-core/tests -q'],
  ['planner evidence', 'high severity failed verification context'],
  ['daily loop', 'Observe'],
];
for (const [name, needle] of checks) {
  if (!html.includes(needle)) {
    console.error(`FAIL: ${name}`);
    process.exit(1);
  }
  console.log(`PASS: ${name}`);
}
console.log('Smoke test passed.');
