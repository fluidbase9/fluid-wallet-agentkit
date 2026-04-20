import { PaymentSDK } from "./PaymentSDK";
import { IdentitySDK } from "./IdentitySDK";
import type { FluidAgentConfig, AgentMeResult } from "./types";

const DEFAULT_BASE_URL = "https://app.fluidwallet.io";

export class FluidAgent {
  readonly payments: PaymentSDK;
  readonly identity: IdentitySDK;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: FluidAgentConfig) {
    if (!config.apiKey || !config.apiKey.startsWith("fwag_")) {
      throw new Error(
        "Invalid agent key. Keys must start with fwag_. " +
        "Create one at app.fluidwallet.io → Settings → Agentic Keys."
      );
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");

    const fetcher = this._fetch.bind(this);
    this.payments = new PaymentSDK(fetcher);
    this.identity = new IdentitySDK(fetcher);
  }

  private async _fetch(path: string, init?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Agent-Key": this.apiKey,
      ...((init?.headers as Record<string, string>) ?? {}),
    };
    return fetch(url, { ...init, headers });
  }

  async me(): Promise<AgentMeResult> {
    const r = await this._fetch("/v1/agents/me");
    if (!r.ok) throw new Error((await r.json()).error ?? "auth failed");
    return r.json();
  }
}
