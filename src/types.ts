export interface FluidAgentConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface SendPaymentParams {
  to: string;
  amount: string;
  chain?: string;
  token?: string;
}

export interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage?: string;
  chain?: string;
}

export interface AgentPayParams {
  toEmail: string;
  amount: string;
  token?: string;
  memo?: string;
}

export interface QuoteParams {
  fromToken: string;
  toToken: string;
  amount: string;
  chain?: string;
}

export interface PaymentResult {
  status: string;
  from: string;
  to: string;
  amount: string;
  chain?: string;
  token?: string;
  message: string;
}

export interface IdentityResult {
  email: string;
  walletAddress: string | null;
}

export interface AgentMeResult {
  email: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
}
