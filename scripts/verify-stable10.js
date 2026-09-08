const { spawnSync } = require('child_process');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status || 1);
}

run(process.execPath, ['scripts/stable10-regression-test.js']);
run(process.execPath, ['scripts/backup-validation-smoke.js']);
console.log('Stable 10 focused verification passed.');
