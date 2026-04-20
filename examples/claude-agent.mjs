/**
 * Example: Claude AI agent that uses Fluid Wallet
 *
 * Requirements:
 *   FLUID_AGENT_KEY=fwag_...   (from localhost:3000/agentic-keys)
 *   ANTHROPIC_API_KEY=sk-ant-... (from console.anthropic.com)
 *
 * Run: node claude-agent.mjs
 */

const FLUID_KEY = process.env.FLUID_AGENT_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const BASE = process.env.FLUID_BASE_URL ?? "http://localhost:3000";

if (!FLUID_KEY?.startsWith("fwag_")) {
  console.error("Set FLUID_AGENT_KEY=fwag_... in your environment");
  process.exit(1);
}

// ── Fluid Wallet tools Claude can call ───────────────────────────────────────

const TOOLS = [
  {
    name: "fluid_me",
    description: "Get the identity of this agent's Fluid Wallet (email, name, scopes).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "fluid_resolve_identity",
    description: "Resolve an email address to a blockchain wallet address.",
    input_schema: {
      type: "object",
      properties: { email: { type: "string", description: "Email to look up" } },
      required: ["email"],
    },
  },
  {
    name: "fluid_quote_swap",
    description: "Get a price quote for swapping one token to another via Fluid SOR.",
    input_schema: {
      type: "object",
      properties: {
        fromToken: { type: "string" },
        toToken:   { type: "string" },
        amount:    { type: "string" },
        chain:     { type: "string", default: "base" },
      },
      required: ["fromToken", "toToken", "amount"],
    },
  },
  {
    name: "fluid_send",
    description: "Send a crypto payment to a wallet address.",
    input_schema: {
      type: "object",
      properties: {
        to:     { type: "string", description: "Recipient wallet address" },
        amount: { type: "string" },
        token:  { type: "string", default: "USDC" },
        chain:  { type: "string", default: "base" },
      },
      required: ["to", "amount"],
    },
  },
  {
    name: "fluid_history",
    description: "Get this agent's recent transaction history.",
    input_schema: {
      type: "object",
      properties: { limit: { type: "integer", default: 10 } },
    },
  },
];

async function callFluid(toolName, input) {
  const h = { "X-Agent-Key": FLUID_KEY, "Content-Type": "application/json" };

  const routes = {
    fluid_me:               { method: "GET",  path: "/v1/agents/me" },
    fluid_resolve_identity: { method: "GET",  path: `/v1/agents/identity/resolve?email=${encodeURIComponent(input.email ?? "")}` },
    fluid_quote_swap:       { method: "POST", path: "/v1/agents/quote-swap" },
    fluid_send:             { method: "POST", path: "/v1/agents/send" },
    fluid_history:          { method: "GET",  path: `/v1/agents/history?limit=${input.limit ?? 10}` },
  };

  const route = routes[toolName];
  const opts  = { method: route.method, headers: h };
  if (route.method === "POST") opts.body = JSON.stringify(input);

  const r    = await fetch(`${BASE}${route.path}`, opts);
  const data = await r.json();
  return JSON.stringify(data, null, 2);
}

// ── Agentic loop ──────────────────────────────────────────────────────────────

async function runAgent(userMessage) {
  console.log(`\nUser: ${userMessage}\n`);

  const messages = [{ role: "user", content: userMessage }];

  while (true) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 1024,
        tools: TOOLS,
        system: "You are a financial agent with access to Fluid Wallet. Use the fluid_* tools to help the user. Always check your identity first with fluid_me.",
        messages,
      }),
    }).then(r => r.json());

    if (response.error) {
      console.error("Anthropic error:", response.error);
      break;
    }

    // Print text responses
    for (const block of response.content) {
      if (block.type === "text") console.log(`Agent: ${block.text}`);
    }

    if (response.stop_reason === "end_turn") break;

    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter(b => b.type === "tool_use");
      const toolResults = [];

      for (const toolUse of toolUses) {
        console.log(`\n[Calling ${toolUse.name}]`, JSON.stringify(toolUse.input));
        const result = await callFluid(toolUse.name, toolUse.input);
        console.log(`[Result]`, result);
        toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user",      content: toolResults });
    }
  }
}

// ── Run it ────────────────────────────────────────────────────────────────────

const task = process.argv[2] ?? "Who am I? Check my wallet identity and show my recent transactions.";
runAgent(task).catch(console.error);
