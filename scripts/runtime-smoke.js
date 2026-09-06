const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const pkg = require('../package.json');

const port = 5100;
const base = `http://127.0.0.1:${port}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'minya-runtime-smoke-'));

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function waitForHealth() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return response.json();
    } catch (_) {}
    await sleep(150);
  }
  throw new Error('Production runtime did not become healthy');
}

(async () => {
  const child = spawn(process.execPath, ['scripts/start-server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      RAILWAY_ENVIRONMENT: '',
      MINYA_DATA_DIR: tmp,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });

  try {
    const health = await waitForHealth();
    if (!health?.ok) throw new Error('Health endpoint returned not ok');
    if (health.version !== pkg.version) {
      throw new Error(`Runtime version mismatch: expected ${pkg.version}, got ${health.version}`);
    }
    if (health.integrity !== 'ok') {
      throw new Error(`SQLite integrity check failed: ${health.integrity}`);
    }
    console.log(`Production runtime smoke passed: V${pkg.version} + SQLite integrity ok.`);
  } catch (error) {
    console.error(output);
    throw error;
  } finally {
    child.kill('SIGTERM');
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
