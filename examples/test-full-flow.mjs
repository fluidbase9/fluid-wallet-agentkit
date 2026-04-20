/**
 * Full agent payment test — runs through every capability
 * including SOR swaps, direct sends, identity, prices, history.
 *
 * Usage:
 *   FLUID_AGENT_KEY=fwag_... node test-full-flow.mjs
 *
 * Or with a specific test:
 *   FLUID_AGENT_KEY=fwag_... node test-full-flow.mjs swap
 *   FLUID_AGENT_KEY=fwag_... node test-full-flow.mjs send
 *   FLUID_AGENT_KEY=fwag_... node test-full-flow.mjs prices
 */

const KEY  = process.env.FLUID_AGENT_KEY;
const BASE = process.env.FLUID_BASE_URL ?? "http://localhost:3000";
const RUN  = process.argv[2] ?? "all";

if (!KEY?.startsWith("fwag_")) {
  console.error("\n❌  Set FLUID_AGENT_KEY=fwag_... in your environment");
  console.error("    Create a key at: http://localhost:3000/agentic-keys\n");
  process.exit(1);
}

const H = { "X-Agent-Key": KEY, "Content-Type": "application/json" };

// ── helpers ───────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

async function test(label, fn) {
  process.stdout.write(`\n  ▸ ${label}… `);
  try {
    const result = await fn();
    console.log("✅");
    if (result) console.log("   ", JSON.stringify(result, null, 2).split("\n").join("\n    "));
    passed++;
    return result;
  } catch (err) {
    console.log("❌  " + err.message);
    failed++;
    return null;
  }
}

async function GET(path) {
  const r = await fetch(`${BASE}${path}`, { headers: H });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
  return d;
}

async function POST(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: "POST", headers: H, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
  return d;
}

async function GETpub(path) {
  const r = await fetch(`${BASE}${path}`);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
  return d;
}

// ── test suites ───────────────────────────────────────────────────────────────

async function testIdentity() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  IDENTITY & CONNECTION");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const me = await test("Who am I? (GET /v1/agents/me)", async () => {
    const d = await GET("/v1/agents/me");
    return { email: d.email, keyName: d.name, scopes: d.scopes };
  });

  await test("Resolve own email to wallet address", async () => {
    if (!me?.email) throw new Error("No email from /me");
    const d = await GET(`/v1/agents/identity/resolve?email=${encodeURIComponent(me.email)}`);
    return { walletAddress: d.walletAddress };
  });

  return me;
}

async function testPrices() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  CRYPTO PRICES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await test("Get BTC, ETH, USDC prices", async () => {
    const d = await GETpub("/api/prices/simple?ids=bitcoin,ethereum,usd-coin&vs_currencies=usd");
    return {
      BTC:  d.bitcoin?.usd  ? `$${d.bitcoin.usd.toLocaleString()}`  : "n/a",
      ETH:  d.ethereum?.usd ? `$${d.ethereum.usd.toLocaleString()}` : "n/a",
      USDC: d["usd-coin"]?.usd ?? "n/a",
    };
  });

  await test("Get trending coins", async () => {
    const d = await GETpub("/api/prices/trending");
    const coins = d.coins?.slice(0, 3).map(c => c.item?.name ?? c.name) ?? [];
    return { trending: coins };
  });

  await test("Get top 5 coins by market cap", async () => {
    const d = await GETpub("/api/prices/markets?vs_currency=usd&per_page=5");
    const list = Array.isArray(d) ? d : (d.data ?? []);
    return { top5: list.slice(0, 5).map(c => `${c.symbol?.toUpperCase()} $${c.current_price}`) };
  });
}

async function testSOR() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SOR — SMART ORDER ROUTING");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  let quote;

  quote = await test("Quote: swap 0.01 ETH → USDC", async () => {
    const d = await POST("/v1/agents/quote-swap", {
      fromToken: "ETH", toToken: "USDC", amount: "0.01", chain: "base"
    });
    return { quote: d };
  });

  await test("Quote: swap 10 USDC → ETH", async () => {
    const d = await POST("/v1/agents/quote-swap", {
      fromToken: "USDC", toToken: "ETH", amount: "10", chain: "base"
    });
    return { quote: d };
  });

  await test("Quote: swap 5 USDC → USDT (stable swap)", async () => {
    const d = await POST("/v1/agents/quote-swap", {
      fromToken: "USDC", toToken: "USDT", amount: "5", chain: "base"
    });
    return { quote: d };
  });

  // Execute swap — comment this out if you don't want to spend real funds
  if (process.env.EXECUTE_REAL_SWAP === "true") {
    await test("⚡ EXECUTE real swap: 0.001 ETH → USDC (SOR)", async () => {
      const d = await POST("/v1/agents/swap", {
        fromToken: "ETH", toToken: "USDC", amount: "0.001", slippage: "1.0"
      });
      return {
        status: d.status,
        txHash: d.txHash,
        explorerUrl: d.explorerUrl,
      };
    });
  } else {
    console.log("\n  ⚠️  Swap execution skipped (set EXECUTE_REAL_SWAP=true to run real swap)");
  }
}

async function testSend() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SEND / PAYMENTS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await test("Gas estimate for 1 USDC send", async () => {
    const d = await POST("/v1/agents/estimate-gas", {
      to: "0x0000000000000000000000000000000000000001",
      amount: "1", token: "USDC", chain: "base"
    });
    return { estimatedGasUsd: d.estimatedGasUsd };
  });

  // Execute send — comment out if you don't want to spend real funds
  if (process.env.EXECUTE_REAL_SEND === "true" && process.env.SEND_TO_ADDRESS) {
    await test(`⚡ EXECUTE real send: 0.01 USDC → ${process.env.SEND_TO_ADDRESS}`, async () => {
      const d = await POST("/v1/agents/send", {
        to: process.env.SEND_TO_ADDRESS,
        amount: "0.01",
        token: "USDC",
        chain: "base",
      });
      return { status: d.status, txHash: d.txHash, explorerUrl: d.explorerUrl };
    });
  } else {
    console.log("\n  ⚠️  Send execution skipped");
    console.log("      To test real send: EXECUTE_REAL_SEND=true SEND_TO_ADDRESS=0x... node test-full-flow.mjs send");
  }
}

async function testHistory() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  TRANSACTION HISTORY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  await test("Get last 5 transactions", async () => {
    const d = await GET("/v1/agents/history?limit=5");
    const rows = d.history ?? [];
    if (rows.length === 0) return { history: "no transactions yet" };
    return {
      count: rows.length,
      latest: rows[0],
    };
  });
}

async function testAgentPay(me) {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  AGENT-TO-AGENT PAYMENT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (process.env.EXECUTE_AGENT_PAY === "true" && process.env.PAY_TO_EMAIL) {
    await test(`⚡ EXECUTE agent pay: 0.01 USDC → ${process.env.PAY_TO_EMAIL}`, async () => {
      const d = await POST("/v1/agents/agent-pay", {
        toEmail: process.env.PAY_TO_EMAIL,
        amount: "0.01",
        token: "USDC",
        memo: "test agent payment",
      });
      return { status: d.status, txHash: d.txHash };
    });
  } else {
    console.log("\n  ⚠️  Agent pay skipped");
    console.log("      To test: EXECUTE_AGENT_PAY=true PAY_TO_EMAIL=other@email.com node test-full-flow.mjs");
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

console.log("\n╔═══════════════════════════════════════════════════╗");
console.log("║    Fluid Wallet AgentKit — Full Payment Test      ║");
console.log(`║    Server: ${BASE.padEnd(38)}║`);
console.log(`║    Key:    ${KEY.slice(0, 20)}…${"".padEnd(17)}║`);
console.log("╚═══════════════════════════════════════════════════╝");

const me = await testIdentity();

if (RUN === "all" || RUN === "prices")  await testPrices();
if (RUN === "all" || RUN === "swap")    await testSOR();
if (RUN === "all" || RUN === "send")    await testSend();
if (RUN === "all" || RUN === "history") await testHistory();
if (RUN === "all" || RUN === "agentpay") await testAgentPay(me);

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) console.log("  All tests passed ✅");
else              console.log("  Some tests failed ❌ — check output above");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
