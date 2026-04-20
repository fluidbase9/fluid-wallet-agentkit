import type { SendPaymentParams, SwapParams, AgentPayParams, QuoteParams, PaymentResult } from "./types";

export class PaymentSDK {
  constructor(private fetch: (path: string, init?: RequestInit) => Promise<Response>) {}

  async send(params: SendPaymentParams): Promise<PaymentResult> {
    const r = await this.fetch("/v1/agents/send", {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (!r.ok) throw new Error((await r.json()).error ?? "send failed");
    return r.json();
  }

  async swap(params: SwapParams): Promise<PaymentResult> {
    const r = await this.fetch("/v1/agents/swap", {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (!r.ok) throw new Error((await r.json()).error ?? "swap failed");
    return r.json();
  }

  async agentPay(params: AgentPayParams): Promise<PaymentResult> {
    const r = await this.fetch("/v1/agents/agent-pay", {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (!r.ok) throw new Error((await r.json()).error ?? "agent-pay failed");
    return r.json();
  }

  async quoteSwap(params: QuoteParams): Promise<unknown> {
    const r = await this.fetch("/v1/agents/quote-swap", {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (!r.ok) throw new Error((await r.json()).error ?? "quote failed");
    return r.json();
  }

  async estimateGas(params: Pick<SendPaymentParams, "to" | "amount" | "chain" | "token">): Promise<unknown> {
    const r = await this.fetch("/v1/agents/estimate-gas", {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (!r.ok) throw new Error((await r.json()).error ?? "estimate failed");
    return r.json();
  }
}
