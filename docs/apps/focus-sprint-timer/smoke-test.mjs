import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const checks = [
  ['アプリ名がある', /Focus Sprint Timer/],
  ['開始ボタンがある', /id="startPause"/],
  ['スキップボタンがある', /id="skip"/],
  ['リセットボタンがある', /id="reset"/],
  ['集中時間入力がある', /id="focusMinutes"/],
  ['休憩時間入力がある', /id="breakMinutes"/],
  ['メモ入力がある', /id="memo"/],
  ['履歴表示がある', /id="history"/],
  ['localStorage保存がある', /localStorage\.setItem/],
  ['1秒ごとのタイマー処理がある', /setInterval\(tick, 1000\)/],
  ['完了スプリント数を増やす', /state\.done \+= 1/],
  ['HTMLエスケープ処理がある', /escapeHtml/]
];

let failed = 0;
for (const [label, pattern] of checks) {
  if (pattern.test(html)) {
    console.log(`PASS: ${label}`);
  } else {
    failed++;
    console.error(`FAIL: ${label}`);
  }
}

if (failed) {
  throw new Error(`${failed} smoke checks failed`);
}
console.log('Smoke test passed.');
