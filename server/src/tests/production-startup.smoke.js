require("dotenv").config();

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

const PORT = 5108;
const ORIGIN = "https://madlenianum-test.example";
const API = `http://localhost:${PORT}/api`;
let child;

const waitForReady = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${API}/ready`);
      if (response.ok) return;
    } catch {
      // The production process is still connecting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Production startup smoke server did not become ready.");
};

const stopChild = async () => {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const stopped = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await Promise.race([
    stopped,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Graceful shutdown timed out.")), 8000)),
  ]);
};

const run = async () => {
  assert.ok(process.env.MONGO_URI, "MONGO_URI is required.");
  child = spawn(process.execPath, ["src/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(PORT),
      CLIENT_URLS: ORIGIN,
      CLIENT_URL: ORIGIN,
      JWT_SECRET: "phase7-production-startup-secret-value-2026",
      EMAIL_TRANSPORT: "json",
      ORDER_EXPIRY_INTERVAL_MS: "3600000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  await waitForReady();

  const health = await fetch(`${API}/health`, { headers: { Origin: ORIGIN } });
  const ready = await fetch(`${API}/ready`, { headers: { Origin: ORIGIN } });
  const rejected = await fetch(`${API}/health`, {
    headers: { Origin: "https://untrusted.example" },
  });
  assert.equal(health.status, 200);
  assert.equal(ready.status, 200);
  assert.equal(rejected.status, 403);
  assert.equal(health.headers.get("x-powered-by"), null);
  assert.ok(health.headers.get("x-content-type-options"));

  await stopChild();
  assert.ok(
    child.exitCode === 0 || child.signalCode === "SIGTERM",
    stderr || "Production process exited unsuccessfully."
  );
  console.log("Production startup, readiness, security headers, CORS, and graceful shutdown checks passed.");
};

run()
  .catch(async (error) => {
    console.error(error);
    try { await stopChild(); } catch (shutdownError) { console.error(shutdownError); }
    process.exitCode = 1;
  });
