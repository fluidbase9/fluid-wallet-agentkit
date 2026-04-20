# @fluid-wallet/agentkit

SDK for AI agents to interact with Fluid Wallet — on-chain payments, SOR swaps, agent-to-agent transfers, and onchain identity.

## Quick Start

```bash
npm install @fluid-wallet/agentkit
```

### 1. Create an Agentic API Key (browser only)

Go to **app.fluidwallet.io → Settings → Agentic Keys** and create a named key.  
Copy the `fwag_...` key and add it to your agent's `.env`:

```
FLUID_AGENT_KEY=fwag_...
```

### 2. Run wallet setup (terminal)

```bash
npx fluid-wallet setup
```

You'll be prompted for email, password, and seed phrase (hidden input).  
Seed phrase is **never stored** — zeroed immediately after verification.

### 3. Use in your agent

```typescript
import { FluidAgent } from '@fluid-wallet/agentkit'

const fluid = new FluidAgent({ apiKey: process.env.FLUID_AGENT_KEY })

// Who am I?
const me = await fluid.me()

// Send payment
await fluid.payments.send({ to: '0x...', amount: '10', token: 'USDC', chain: 'base' })

// SOR swap
await fluid.payments.swap({ fromToken: 'ETH', toToken: 'USDC', amount: '0.1' })

// Agent-to-agent payment
await fluid.payments.agentPay({ toEmail: 'other-agent@example.com', amount: '5', token: 'USDC' })

// Identity lookup
const identity = await fluid.identity.resolve('friend@example.com')
console.log(identity.walletAddress)

// Transaction history
const history = await fluid.identity.history(20)
```

## Security

| Concern | Handling |
|---|---|
| Seed phrase | Never stored. Zeroed immediately after verification. |
| API Key | Store in `.env` only. Never hardcode. |
| Key creation | Browser-only. Cannot be created via CLI or API. |
| Key scopes | `read`, `pay`, `swap`, `agentpay` — set at creation time. |

## API Routes

All agent routes require `X-Agent-Key: fwag_...` header.

| Method | Path | Scope | Description |
|---|---|---|---|
| GET | `/v1/agents/me` | any | Agent identity |
| GET | `/v1/agents/identity/resolve?email=` | any | Resolve wallet address |
| GET | `/v1/agents/history` | read | Transaction history |
| POST | `/v1/agents/quote-swap` | read | Price quote |
| POST | `/v1/agents/estimate-gas` | read | Gas estimate |
| POST | `/v1/agents/send` | pay | On-chain send |
| POST | `/v1/agents/swap` | swap | SOR swap |
| POST | `/v1/agents/agent-pay` | agentpay | Agent-to-agent payment |
