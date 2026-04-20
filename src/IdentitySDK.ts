import type { IdentityResult } from "./types";

export class IdentitySDK {
  constructor(private fetch: (path: string, init?: RequestInit) => Promise<Response>) {}

  async resolve(email: string): Promise<IdentityResult> {
    const r = await this.fetch(`/v1/agents/identity/resolve?email=${encodeURIComponent(email)}`);
    if (!r.ok) throw new Error((await r.json()).error ?? "identity lookup failed");
    return r.json();
  }

  async history(limit = 20): Promise<unknown[]> {
    const r = await this.fetch(`/v1/agents/history?limit=${limit}`);
    if (!r.ok) throw new Error((await r.json()).error ?? "history fetch failed");
    const data = await r.json();
    return data.history ?? [];
  }
}
