#!/usr/bin/env node
/**
 * npx fluid-wallet setup    — connect an existing wallet to an agent
 * npx fluid-wallet register — guide a new user through account creation
 * npx fluid-wallet status   — check if the agent is ready
 */

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const BASE_URL = process.env.FLUID_BASE_URL ?? "http://localhost:3000";
const command  = process.argv[2] ?? "setup";

// ── helpers ───────────────────────────────────────────────────────────────────

function ask(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans.trim()); }));
}

function hiddenInput(prompt: string): Promise<string> {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    (stdin as any).setRawMode?.(true);
    stdin.resume();
    let input = "";
    const onData = (buf: Buffer) => {
      const c = buf.toString();
      if (c === "\r" || c === "\n") {
        (stdin as any).setRawMode?.(false); stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input);
      } else if (c === "\u0003") { process.stdout.write("\n"); process.exit(0); }
      else if (c === "\u007f") { input = input.slice(0, -1); }
      else { input += c; }
    };
    stdin.on("data", onData);
  });
}

async function apiGet(path_: string, key?: string) {
  const headers: any = {};
  if (key) headers["X-Agent-Key"] = key;
  const r = await fetch(`${BASE_URL}${path_}`, { headers }).catch(() => null);
  if (!r) return { ok: false, data: { error: "Cannot reach server" } };
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

async function apiPost(path_: string, body: unknown, key?: string) {
  const headers: any = { "Content-Type": "application/json" };
  if (key) headers["X-Agent-Key"] = key;
  const r = await fetch(`${BASE_URL}${path_}`, {
    method: "POST", headers, body: JSON.stringify(body),
  }).catch(() => null);
  if (!r) return { ok: false, data: { error: "Cannot reach server" } };
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

function writeConfig(data: object) {
  const dir = path.join(process.cwd(), ".fluid");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "config.json"), JSON.stringify(data, null, 2), { mode: 0o600 });
}

function writeEnvKey(key: string) {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, "utf8");
    if (!existing.includes("FLUID_AGENT_KEY")) {
      fs.appendFileSync(envPath, `\nFLUID_AGENT_KEY=${key}\n`);
    }
  } else {
    fs.writeFileSync(envPath, `FLUID_AGENT_KEY=${key}\n`, { mode: 0o600 });
  }
}

// ── register command ──────────────────────────────────────────────────────────
// Guides a brand-new user through creating a Fluid Wallet account.
// Steps that MUST happen in the browser are clearly flagged.

async function runRegister() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║    Fluid Wallet — New Account Setup (Agent Guide)    ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  console.log("This wizard will guide you through creating a Fluid Wallet account.");
  console.log("Two steps require the browser — everything else is done here.\n");

  // Step 1 — browser
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 1 of 4 — Create your account (Browser Required)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("  1. Open this URL in your browser:");
  console.log(`     → ${BASE_URL}\n`);
  console.log("  2. Click 'Get Started' or 'Register'");
  console.log("  3. Enter your email and choose a strong password");
  console.log("  4. Your SEED PHRASE will appear — write down all 12 words");
  console.log("     ⚠️  This is shown ONCE. If you lose it, you lose your wallet.");
  console.log("  5. Confirm the seed phrase when asked");
  console.log("  6. Scan the Google Authenticator QR code with your phone");
  console.log("  7. Enter the 6-digit code from the app to confirm\n");

  await ask("Press ENTER once you have completed Step 1 in the browser…");

  // Step 2 — browser
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 2 of 4 — Create an Agentic Key (Browser Required)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("  After completing Step 1, your browser should show the");
  console.log("  Agentic Keys page automatically. If not, go to:");
  console.log(`     → ${BASE_URL}/agentic-keys\n`);
  console.log("  1. Click 'New Key'");
  console.log("  2. Name it (e.g. 'My AI Agent')");
  console.log("  3. Check all scopes: Read, Pay, Swap, Agent Pay");
  console.log("  4. Click 'Create Key'");
  console.log("  5. COPY the fwag_... key shown — it only appears ONCE\n");

  const agentKey = await ask("Paste your agent key (fwag_...): ");
  if (!agentKey.startsWith("fwag_")) {
    console.error("❌  Key must start with fwag_. Create it at: " + BASE_URL + "/agentic-keys");
    process.exit(1);
  }

  // Step 3 — terminal
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 3 of 4 — Verify your identity");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const email    = await ask("Email address: ");
  const password = await hiddenInput("Password: ");

  console.log("\n  Your seed phrase proves you own this wallet.");
  console.log("  It is NEVER stored — zeroed immediately after verification.\n");
  const seedPhrase = await hiddenInput("Seed phrase (12 words, space-separated): ");
  const words = seedPhrase.trim().split(/\s+/);
  if (words.length !== 12) {
    console.error(`❌  Need exactly 12 words (got ${words.length})`);
    process.exit(1);
  }

  console.log("\n⏳  Verifying credentials…");
  const { ok, data } = await apiPost("/api/auth/verify-seed", {
    email, password, seedPhrase: words.join(" "),
  });
  words.fill("xxxx");

  if (!ok) {
    console.error("❌  Verification failed:", (data as any).error);
    process.exit(1);
  }

  const { walletAddress, totpEnabled } = data as any;

  if (totpEnabled) {
    const code = await ask("Google Authenticator code: ");
    const { ok: ok2, data: d2 } = await apiPost("/api/auth/totp/validate", { email, code });
    if (!ok2) { console.error("❌  TOTP failed:", (d2 as any).error); process.exit(1); }
  }

  // Step 4 — validate key
  console.log("⏳  Validating agent key…");
  const { ok: keyOk, data: keyData } = await apiGet("/v1/agents/me", agentKey);
  if (!keyOk) {
    console.error("❌  Key rejected:", (keyData as any).error);
    process.exit(1);
  }

  writeConfig({
    email, walletAddress,
    keyPrefix: agentKey.slice(0, 16),
    keyName: (keyData as any).name,
    scopes: (keyData as any).scopes,
    setupAt: new Date().toISOString(),
    sessionId: crypto.randomBytes(16).toString("hex"),
  });
  writeEnvKey(agentKey);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 4 of 4 — Agent is ready ✅");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(`  Account  : ${email}`);
  console.log(`  Wallet   : ${walletAddress}`);
  console.log(`  Key name : ${(keyData as any).name}`);
  console.log(`  Scopes   : ${(keyData as any).scopes?.join(", ")}\n`);
  console.log("  Your agent can now run autonomously:");
  console.log("  → Check crypto prices");
  console.log("  → Send & receive payments");
  console.log("  → Execute token swaps via Fluid SOR");
  console.log("  → Trade on supported DEXs\n");
  console.log("  import { FluidAgent } from '@fluid-wallet/agentkit'");
  console.log("  const fluid = new FluidAgent({ apiKey: process.env.FLUID_AGENT_KEY })\n");
}

// ── setup command (existing account) ─────────────────────────────────────────

async function runSetup() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║       Fluid Wallet — Agent Setup                 ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const email    = await ask("Email address: ");
  const password = await hiddenInput("Password: ");

  const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(`\n  Create your key at: ${BASE_URL}/agentic-keys\n`);
  const agentKey: string = await new Promise(r => rl2.question("Paste agent key (fwag_...): ", ans => { rl2.close(); r(ans.trim()); }));

  if (!agentKey.startsWith("fwag_")) {
    console.error("❌  Key must start with fwag_"); process.exit(1);
  }

  console.log("\n  Seed phrase is used ONLY to verify identity — never stored.\n");
  const seedPhrase = await hiddenInput("Seed phrase (12 words): ");
  const words = seedPhrase.trim().split(/\s+/);
  if (words.length !== 12) { console.error(`❌  Need 12 words (got ${words.length})`); process.exit(1); }

  console.log("\n⏳  Verifying…");
  const { ok, data } = await apiPost("/api/auth/verify-seed", { email, password, seedPhrase: words.join(" ") });
  words.fill("xxxx");
  if (!ok) { console.error("❌", (data as any).error); process.exit(1); }

  const { walletAddress, totpEnabled } = data as any;

  if (totpEnabled) {
    const code = await ask("Google Authenticator code: ");
    const { ok: ok2, data: d2 } = await apiPost("/api/auth/totp/validate", { email, code });
    if (!ok2) { console.error("❌  TOTP failed:", (d2 as any).error); process.exit(1); }
  }

  const { ok: keyOk, data: keyData } = await apiGet("/v1/agents/me", agentKey);
  if (!keyOk) { console.error("❌  Key rejected:", (keyData as any).error); process.exit(1); }

  writeConfig({
    email, walletAddress,
    keyPrefix: agentKey.slice(0, 16),
    keyName: (keyData as any).name,
    scopes: (keyData as any).scopes,
    setupAt: new Date().toISOString(),
    sessionId: crypto.randomBytes(16).toString("hex"),
  });
  writeEnvKey(agentKey);

  console.log("\n✅  Setup complete!");
  console.log(`    Account: ${email}  |  Wallet: ${walletAddress}\n`);
}

// ── status command ────────────────────────────────────────────────────────────

async function runStatus() {
  const key = process.env.FLUID_AGENT_KEY;
  const configPath = path.join(process.cwd(), ".fluid", "config.json");

  if (!fs.existsSync(configPath)) {
    console.log("\n❌  No .fluid/config.json found. Run: npx fluid-wallet setup\n");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  console.log("\n── Fluid Agent Status ────────────────────────");
  console.log(`  Email   : ${config.email}`);
  console.log(`  Wallet  : ${config.walletAddress}`);
  console.log(`  Key     : ${config.keyPrefix}…`);
  console.log(`  Scopes  : ${config.scopes?.join(", ")}`);
  console.log(`  Setup   : ${config.setupAt}`);

  if (key) {
    const { ok, data } = await apiGet("/v1/agents/me", key);
    console.log(`  API     : ${ok ? "✅ Connected" : "❌ " + (data as any).error}`);
  } else {
    console.log("  API     : ⚠️  FLUID_AGENT_KEY not set in environment");
  }
  console.log("───────────────────────────────────────────\n");
}

// ── entry ─────────────────────────────────────────────────────────────────────

const commands: Record<string, () => Promise<void>> = {
  register: runRegister,
  setup:    runSetup,
  status:   runStatus,
};

if (!commands[command]) {
  console.log("\nUsage:");
  console.log("  npx fluid-wallet register  — new user: guided account creation");
  console.log("  npx fluid-wallet setup     — existing user: connect agent to wallet");
  console.log("  npx fluid-wallet status    — check agent connection\n");
  process.exit(0);
}

commands[command]().catch(err => {
  console.error("\n❌  Error:", err.message ?? err);
  process.exit(1);
});
