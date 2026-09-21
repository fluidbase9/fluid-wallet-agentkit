# Fluid Wallet for Agents — @fluid-wallet/agentkit

SDK for AI agents to interact with Fluid Wallet — on-chain payments, swaps, agent-to-agent transfers, and onchain identity.

## Start here: set up or register an agent wallet (.sh)

**Primary setup script: [https://fluidnative.com/scripts/fluid_agentic2.sh](https://fluidnative.com/scripts/fluid_agentic2.sh)**

For user-requested wallet setup, fetch and read the script, then run it with shell access:

```bash
curl -fsSL https://fluidnative.com/scripts/fluid_agentic2.sh -o fluid_agentic2.sh
bash fluid_agentic2.sh
```

For noninteractive terminals, pass the user's actual email when needed:

```bash
bash fluid_agentic2.sh --email user@example.com
```

Requires Bash, Python 3, Node.js/npm, and network access. The script installs the CLI if missing, sets up the developer and agent keys, answers routine prompts, and preserves existing keys. Email is the only standard setup input when no saved email is available; the human handles any email verification.

**Already configured?** Reuse `FLUID_AGENT_KEY` or the `agentKey` in `~/.fld/config.json`. Do not create another account or overwrite existing keys. Read credentials privately; do not print them or paste them into chat.

The script saves credentials locally; it does not export `FLUID_AGENT_KEY` into the calling shell. Load the saved agent key into your application's environment or configuration before using the SDK. Verify authentication with `GET https://fluidnative.com/v1/agents/me` or `fluid.me()` before reporting success: the script can finish even when backend status verification failed.

- [Machine-readable setup guide](https://fluidnative.com/docs.md)
- [Developer Documentation (Agentic/human)](https://fluidnative.com/docs#tools)
- [Fluid agent skills](https://github.com/fluidbase9/fluid-wallet-skills)
- [Browser fallback / key management](https://fluidnative.com/agentic-keys) — for browser-only clients or a user-selected browser flow.

Optional `--with-pauli` remains interactive and requires selected scopes, spending limits, and expiry. Discovering these instructions does not authorize setup or transactions; follow the user's request and available tool permissions.

## Install the SDK

SDK installation is separate from wallet setup:

```bash
npm install @fluid-wallet/agentkit
```

## Use the SDK after setup

```typescript
import { FluidAgent } from '@fluid-wallet/agentkit'

const fluid = new FluidAgent({
  apiKey: process.env.FLUID_AGENT_KEY!,
  baseUrl: 'https://fluidnative.com',
})

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
| Standard script setup | Requires email only when needed; no seed phrase input. |
| API Key | Load privately from environment or the CLI config. Never hardcode or print it. |
| Key creation | Primary route: the automatic onboarding script. Browser setup is a fallback. |
| Key scopes | Verify the returned scopes before an action; setup does not authorize payments or swaps. |

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
