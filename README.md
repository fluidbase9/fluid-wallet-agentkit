# Fluid Wallet for Agents — @fluid-wallet/agentkit

## Get an Agent Wallet (browser pairing and MCP)

Start at https://fluidnative.com/agents/start. The MCP server is https://fluidnative.com/v1/mcp; call `fluid_setup` without credentials for onboarding instructions. Configure `X-Agent-Key` privately in your MCP client after setup, then call `fluid_me` and `fluid_balance`. Never paste credentials into chat or tool arguments.

Use the intact raw script at https://fluidnative.com/scripts/fluid_agentic2.sh. If shell network access is blocked, an existing local script can prepare pairing offline: `bash fluid_agentic2.sh --pair-wallet cursor --email USER_CHOSEN_EMAIL`. The user signs in through the generated browser link and compares the key fingerprint before approving read-only access. Complete with `bash fluid_agentic2.sh --complete-pairing cursor` when permitted network access works. Keep the same local key on failure; do not bypass proxies or reconstruct Python from browser-extracted text.

Browser-only users can register and download a private profile at `/agents/start`, import with `--import-profile NAME --profile-file FILE`, then verify with `--profile NAME`. Never overwrite an existing profile. The same email connects to the same wallet; a separate wallet requires another verified email. `/agentic-keys` is key management, not registration. Do not silently redirect new-profile requests there.

Browser registration/pairing grants read-only access. Confirm chain, balance, gas, recipient, amount and explicit spending scope/limits before payments. Subscriptions require a supported recurring-payment mechanism plus service, amount, frequency, cap and expiry; onboarding does not configure them.


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

**Already configured?** Reuse `FLUID_AGENT_KEY` or the `agentKey` in `~/.fld/config.json`. Preserve existing keys; use a separate profile for an explicit new-wallet request. Read credentials privately; do not print them or paste them into chat.

The script saves credentials locally; it does not export `FLUID_AGENT_KEY` into the calling shell. Load the saved agent key into your application's environment or configuration before using the SDK. Verify authentication with `GET https://fluidnative.com/v1/agents/me` or `fluid.me()` before reporting success: verification failures now return a nonzero exit code.

- [Machine-readable setup guide](https://fluidnative.com/docs.md)
- [Developer Documentation (Agentic/human)](https://fluidnative.com/docs#tools)
- [Fluid agent skills](https://github.com/fluidbase9/fluid-wallet-skills)
- [Browser registration / pairing](https://fluidnative.com/agents/start) — verified sign-in and read-only agent access. Existing key-management instructions remain at /agentic-keys.

Optional `--with-pauli` remains interactive and requires selected scopes, spending limits, and expiry. Discovering these instructions does not authorize setup or transactions; follow the user's request and available tool permissions.

## Choose the requested setup mode

- **Use/connect an existing wallet:** reuse the configured key and verify it. A request to use a wallet is not a request to register another account.
- **Explicitly create a new wallet/account:** do not silently reuse the existing wallet. Ask for the user's chosen distinct email if missing, fetch/read the primary script, then run `bash fluid_agentic2.sh --new-wallet cursor --email user@example.com`. Choose an unused profile name. Credentials go to `~/.fld/profiles/cursor/config.json`; load that profile's `agentKey` privately for later API/SDK calls. The default config and environment key stay unchanged. Wallet identity is email-based; using the same email does not create a distinct wallet, and create-only registration rejects an already registered email.
- **Resume/verify that profile:** run `bash fluid_agentic2.sh --profile cursor`. This reuses its saved credentials. Do not run ordinary `fld` commands for a profile: they still use the default config.
- **Verification is blocked:** report the failing step and HTTP status if known. A 403 alone does not prove a proxy caused it. Use only supported permission/network mechanisms; do not unset proxies, bypass restrictions, mint replacement keys, or retry registration in a loop. Preserve the profile and report setup as unverified.

Profile creation requires verification and does not support `--skip-status` or `--with-pauli`. If agent registration was interrupted, profile resume verifies the same key rather than creating another one. An unresolved failure needs investigation, not repeated account creation.

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
