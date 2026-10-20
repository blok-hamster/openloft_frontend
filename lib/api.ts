import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
// Exported for callers that need the API's ORIGIN (not /api), such as the
// proxied agent UI, whose iframe points at the backend's /agent-ui mount.
export { API_BASE_URL };

// The instance is exported so ad-hoc endpoints (the terminal token mint, and
// any caller issuing a raw request) reuse the JWT interceptor and the 401
// redirect instead of standing up a second client.
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});
export { api };

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('loft_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle session expiration (401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear local storage and redirect to login if we get an unauthorized error
      if (typeof window !== 'undefined') {
        localStorage.removeItem('loft_token');
        localStorage.removeItem('loft_user');
        // Do not redirect if we are already on the login page to avoid loops
        if (!window.location.pathname.startsWith('/auth/login')) {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// --- Entity Interfaces ---

export interface IAgent {
  _id: string;
  tenantId: string;
  agentId: string;
  name?: string;
  // Required, not optional: an optional field let the harness render as
  // "OpenClaw" whenever the value was missing, which is how a serialization
  // fault upstream presented as a wrong-harness bug rather than a data bug.
  agentType: HarnessType;
  status: 'provisioning' | 'starting' | 'running' | 'stopped' | 'failed';
  containerId?: string;
  llmProvider: string;
  activeSkills: string[];
  activePlugins: string[];
  pluginConfigs?: Record<string, any>;
  // Not returned by the API. `select:false` on the schema and stripped by
  // agentPublicJson, so this is always undefined here. Anything needing a
  // credential must call getAgentCredentials(agentId) — reading this field is
  // what produced `?token=undefined` in the WebUI link and an unusable
  // Hermes basic-auth password.
  webhookPath: string;
  resourceLimits: { memoryMB: number; vCPU: number; };
  mcpServers?: string[];
  llmKeyType?: 'platform' | 'custom';
  createdAt: string;
  updatedAt: string;
}

export interface ITenant {
  _id: string;
  tenantId: string;
  name: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  billing: { tokenUsage: number; computeMinutes: number; };
  vaultNamespace: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAuditLog {
  _id: string;
  tenantId: string;
  agentId: string;
  actionType: string;
  toolUsed?: string;
  status: string;
  commandContext: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ILobby {
  _id: string;
  lobbyId: string;
  tenantId: string;
  name: string;
  agentIds: string[] | IAgent[];
  drivePrefix: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface IUserContext {
  email: string;
  role: string;
  tenantId: string;
}

export interface ICreateCheckoutSessionRequest {
  type: 'subscription' | 'topup';
  tier?: 'pro' | 'enterprise';
  amount?: number;
  couponCode?: string;
}

export interface ICreatePortalSessionRequest {
  tenantId: string;
}

export interface IUserProfile {
  _id: string;
  email: string;
  role: string;
  tenantId: string;
  createdAt: string;
}

export interface IUpdateAccountRequest {
  password?: string;
  companyName?: string;
}

// --- Request / Response Interfaces ---

// Auth
export interface IRegisterRequest { email: string; password: string; companyName: string; }
export interface IVerifyEmailRequest { email: string; code: string; }
export interface ILoginRequest { email: string; password: string; }
export interface IGoogleLoginRequest { credential?: string; access_token?: string; client_id?: string; }
export interface IAuthResponse { token: string; user: IUserContext; }
export interface IRegisterResponse { message: string; email: string; }

// Tenants
export interface ICreateTenantRequest { name: string; }

// Agents

/** Mirrors the Agent.agentType enum in backend/src/models/Agent.ts. */
export type HarnessType = 'openclaw' | 'hermes' | 'opencode' | 'claude-code' | 'codex';

export interface IDeployAgentRequest {
  tenantId: string;
  name: string;
  description?: string;
  // Mirrors Agent.agentType. The registry in the backend is the authority on
  // which of these can actually be provisioned.
  agentType?: HarnessType;
  llmProvider: string;
  model?: string;
  secrets?: Record<string, string>;
  usePlatformCredits?: boolean;
  saveToSecretManager?: boolean;
}
export interface ISendMessageRequest { message: string; }
export interface IAgentChatResponse { success: boolean; message: string; }
export interface IApprovalRequest { approved: boolean; }
export interface IUpdateFileRequest { filename: string; content: string; }

// Admin
export interface IFleetHealthResponse {
    totalAgents: number;
    statusCounts: { running: number; stopped: number; failed: number; provisioning: number; };
}
export interface IAdminActionResponse { message: string; }

// Registry
export interface IUploadSkillResponse { message: string; skill: string; }


// ==========================================
// API CLIENT WRAPPERS
// ==========================================


// --- Auth Endpoints ---

export const register = async (data: IRegisterRequest): Promise<IRegisterResponse> => {
  const { data: res } = await api.post<IRegisterResponse>('/auth/register', data);
  return res;
};

export const verifyEmail = async (data: IVerifyEmailRequest): Promise<IAuthResponse> => {
  const { data: res } = await api.post<IAuthResponse>('/auth/verify', data);
  return res;
};

export const resendOTP = async (email: string): Promise<{message: string}> => {
  const { data: res } = await api.post<{message: string}>('/auth/resend-otp', { email });
  return res;
};

export const login = async (data: ILoginRequest): Promise<IAuthResponse> => {
  const { data: res } = await api.post<IAuthResponse>('/auth/login', data);
  return res;
};

export const googleLogin = async (data: IGoogleLoginRequest): Promise<IAuthResponse> => {
  const { data: res } = await api.post<IAuthResponse>('/auth/google', data);
  return res;
};

export const logout = async (): Promise<{message: string}> => {
  const { data } = await api.post<{message: string}>('/auth/logout');
  return data;
};

// --- User Endpoints ---

export const getUserProfile = async (): Promise<IUserProfile> => {
  const { data } = await api.get<IUserProfile>('/user');
  return data;
};

export const updateAccount = async (payload: IUpdateAccountRequest): Promise<{message: string}> => {
  const { data } = await api.put<{message: string}>('/user', payload);
  return data;
};

// --- Tenant Endpoints ---

export const createTenant = async (data: ICreateTenantRequest): Promise<ITenant & { token?: string }> => {
  // The response carries a re-issued JWT with the new tenantId attached. The
  // token the caller already holds was minted before this tenant existed and
  // carries no tenantId, so every tenant-scoped route rejects it with "Your
  // account is not attached to a tenant" until it is replaced.
  const { data: res } = await api.post<ITenant & { token?: string }>('/tenants', data);
  return res;
};

export const getTenant = async (tenantId: string): Promise<ITenant> => {
  const { data } = await api.get<ITenant>(`/tenants/${tenantId}`);
  return data;
};

export const updateSecrets = async (tenantId: string, secrets: Record<string, string>): Promise<{message: string}> => {
  const { data } = await api.post<{message: string}>(`/tenants/${tenantId}/secrets`, { secrets });
  return data;
};

export const getTenantSecretsInfo = async (tenantId: string): Promise<string[]> => {
  const { data } = await api.get<{ availableProviders: string[] }>(`/tenants/${tenantId}/secrets/status`);
  return data.availableProviders;
};

// --- Agent Endpoints ---

export const fetchAgents = async (tenantId: string): Promise<IAgent[]> => {
  const { data } = await api.get<IAgent[]>('/agents', { params: { tenantId } });
  return data;
};

export const deployAgent = async (payload: IDeployAgentRequest): Promise<IAgent> => {
  const { data } = await api.post<IAgent>('/agents/provision', payload);
  return data;
};

/**
 * A harness the backend can provision.
 *
 * `selectable` reflects `AGENT_HARNESSES`, so the picker can grey out a harness
 * the operator has not switched on while still rendering it. The capability flags
 * are what the UI is allowed to branch on — never the `type` string, which is how
 * the old code ended up with a two-value ternary in ten files.
 */
export interface IHarness {
  type: string;
  selectable: boolean;
  /** Serves HTTP on its subdomain, so it gets the WebUI link. */
  servesHttp: boolean;
  /** stdio-only, so the terminal is its surface. */
  needsTerminal: boolean;
}

export const getHarnesses = async (): Promise<IHarness[]> => {
  const { data } = await api.get<{ harnesses: IHarness[] }>('/agents/harnesses');
  return data.harnesses;
};

export const getAvailableProviders = async (): Promise<string[]> => {
  const { data } = await api.get<{ available: string[] }>('/agents/providers');
  return data.available;
};

export const toggleSkill = async (agentId: string, skillId: string, active: boolean): Promise<IAgent> => {
  const { data } = await api.post<IAgent>(`/agents/${agentId}/toggle-skill`, { skillId, active });
  return data;
};

export const togglePlugin = async (agentId: string, pluginId: string, active: boolean): Promise<IAgent> => {
  const { data } = await api.post<IAgent>(`/agents/${agentId}/toggle-plugin`, { pluginId, active });
  return data;
};

// --- Billing Endpoints ---

export const createCheckoutSession = async (tenantId: string, payload: ICreateCheckoutSessionRequest): Promise<{ url: string }> => {
  const { data } = await api.post<{ url: string }>(`/billing/checkout/${tenantId}`, payload);
  return data;
};

export const createPortalSession = async (tenantId: string): Promise<{ url: string }> => {
  const { data } = await api.post<{ url: string }>(`/billing/portal/${tenantId}`);
  return data;
};

export const approveAction = async (logId: string, approved: boolean): Promise<IAuditLog> => {
  const { data } = await api.post<IAuditLog>(`/agents/audit/${logId}/approve`, { approved });
  return data;
};

export interface MemoryFile {
  filename: string;
  content: string;
}

export const fetchAgentMemory = async (agentId: string): Promise<MemoryFile[]> => {
  const { data } = await api.get<{files: MemoryFile[]}>(`/agents/${agentId}/memory`);
  return data.files;
};

// ─── Drive API ────────────────────────────────────────────────────────────────

export interface DriveFile {
  name: string;
  size: number;
  lastModified: string;
}

export const listDriveFiles = async (agentId: string): Promise<DriveFile[]> => {
  const { data } = await api.get<{files: DriveFile[]}>(`/agents/${agentId}/drive`);
  return data.files;
};

export const uploadDriveFile = async (agentId: string, file: File): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);
  await api.post(`/agents/${agentId}/drive`, formData, {
    headers: {
      'Content-Type': undefined
    }
  });
};

export const getDriveDownloadUrl = async (agentId: string, filename: string): Promise<string> => {
  const { data } = await api.get<{url: string}>(`/agents/${agentId}/drive/${encodeURIComponent(filename)}`);
  return data.url;
};

export const deleteDriveFile = async (agentId: string, filename: string): Promise<void> => {
  await api.delete(`/agents/${agentId}/drive/${encodeURIComponent(filename)}`);
};

export const stopAgent = async (agentId: string): Promise<IAgent> => {
  const { data } = await api.post<IAgent>(`/agents/${agentId}/stop`);
  return data;
};

export const startAgent = async (agentId: string): Promise<IAgent> => {
  const { data } = await api.post<IAgent>(`/agents/${agentId}/start`);
  return data;
};

export const pauseAgent = async (agentId: string): Promise<IAgent> => {
  const { data } = await api.post<IAgent>(`/agents/${agentId}/pause`);
  return data;
};

export const resumeAgent = async (agentId: string): Promise<IAgent> => {
  const { data } = await api.post<IAgent>(`/agents/${agentId}/resume`);
  return data;
};

export const restartAgent = async (agentId: string): Promise<IAgent> => {
  const { data } = await api.post<IAgent>(`/agents/${agentId}/restart`);
  return data;
};

export const deleteAgent = async (agentId: string): Promise<{message: string}> => {
  const { data } = await api.delete<{message: string}>(`/agents/${agentId}`);
  return data;
};

export const fetchAgentLogs = async (agentId: string): Promise<string> => {
  const { data } = await api.get<{ logs: string }>(`/agents/${agentId}/logs`);
  return data.logs;
};

export const approveAgentDevice = async (agentId: string, requestId?: string): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.post<{ success: boolean; message: string }>(`/agents/${agentId}/device/approve`, { requestId });
  return data;
};

export const fetchAgentConfig = async (agentId: string): Promise<Record<string, unknown>> => {
  const { data } = await api.get<{ config: Record<string, unknown> }>(`/agents/${agentId}/config`);
  return data.config;
};

/**
 * Credentials to reach the caller's own agent.
 *
 * `IAgent.gatewayToken` does not exist on a list or detail response — it is
 * `select:false` and stripped by the backend, and must stay that way. Two harness
 * features need a credential anyway, so they fetch one here on demand.
 */
export interface IAgentCredentials {
  agentType: HarnessType;
  harness: HarnessType;
  // Present for hermes only.
  dashboard?: { auth: 'basic'; username: string; password: string; loginPath: string };
  // Present for openclaw (a query token, which a frame can carry) and for
  // opencode (HTTP Basic, which a frame cannot — see AgentChatPanel).
  // `bootstrapUrl` (openclaw only, requested with `?bootstrap=1`): a one-time
  // owner-pairing URL, container-local origin; callers must rewrite the origin
  // before navigation. Null/absent when minting failed — fall back to `token`.
  webUi?:
    | { auth: 'query'; token: string; bootstrapUrl?: string | null }
    | { auth: 'basic'; username: string; password: string };
  api: { auth: 'bearer'; token: string } | { auth: 'basic'; username: string; password: string };
}

/**
 * `opts.bootstrap` asks the backend to mint a one-time owner-bootstrap URL
 * (`webUi.bootstrapUrl`, openclaw only). It costs ~20s inside the agent
 * container, so only the Web UI button passes it; the chat panel and details
 * modal must not.
 */
export const getAgentCredentials = async (
  agentId: string,
  opts?: { bootstrap?: boolean },
): Promise<IAgentCredentials> => {
  const { data } = await api.get<IAgentCredentials>(
    `/agents/${agentId}/credentials${opts?.bootstrap ? '?bootstrap=1' : ''}`,
  );
  return data;
};

export const updateAgentConfig = async (agentId: string, config: Record<string, unknown>): Promise<void> => {
  await api.put(`/agents/${agentId}/config`, { config });
};

export const saveAgentSecret = async (agentId: string, keyName: string, value: string): Promise<void> => {
  await api.post(`/agents/${agentId}/secret`, { keyName, value });
};

/* Custom billing key: validate-and-save. Auth flows through the shared
   axios instance (the AuthContext default header) — the callers used to
   re-read localStorage and build raw axios calls beside it. */
export const saveCustomKey = async (
  agentId: string,
  provider: string,
  apiKey: string,
): Promise<{ valid: boolean; error?: string }> => {
  const { data } = await api.post<{ valid: boolean; error?: string }>(
    `/agents/${agentId}/custom-key`,
    { provider, apiKey },
  );
  return data;
};

export interface IAgentChannels {
  channels: Record<string, { enabled?: boolean }>;
}

export const getAgentChannels = async (agentId: string): Promise<IAgentChannels> => {
  const { data } = await api.get<IAgentChannels>(`/agents/${agentId}/channels`);
  return data;
};

export const approveAgentChannel = async (
  agentId: string,
  channel: string,
  code: string,
): Promise<{ message?: string }> => {
  const { data } = await api.post<{ message?: string }>(`/agents/${agentId}/channels/approve`, {
    channel,
    code,
  });
  return data;
};

/* Partial save: only the listed channels are written, so a client that
   cannot read stored tokens can never erase one it did not touch. */
export const saveAgentChannels = async (
  agentId: string,
  channels: Record<string, unknown>,
): Promise<void> => {
  await api.post(`/agents/${agentId}/channels`, { channels });
};

export const switchAgentKeyType = async (agentId: string, keyType: 'platform' | 'custom'): Promise<{message: string, agent: IAgent}> => {
  const { data } = await api.post<{message: string, agent: IAgent}>(`/agents/${agentId}/switch-key-type`, { keyType });
  return data;
};

export const getAgentFiles = async (agentId: string): Promise<string[]> => {
  const { data } = await api.get<string[]>(`/agents/${agentId}/files`);
  return data;
};

export const getAgentFile = async (agentId: string, filename: string): Promise<{content: string}> => {
  const { data } = await api.get<{content: string}>(`/agents/${agentId}/files/single`, {
      params: { filename }
  });
  return data;
};

export const updateAgentFile = async (agentId: string, filename: string, content: string): Promise<{message: string}> => {
  const { data } = await api.put<{message: string}>(`/agents/${agentId}/files`, { filename, content });
  return data;
};

export const getMetrics = async (agentId: string): Promise<unknown> => {
  const { data } = await api.get<unknown>(`/agents/${agentId}/metrics`);
  return data;
};

export const getUsage = async (agentId: string, days: number = 7): Promise<{
    daily: any[];
    summary: {
        totalInputTokens: number;
        totalOutputTokens: number;
        totalCost: number;
        totalRequests: number;
    }
}> => {
    const { data } = await api.get(`/agents/${agentId}/usage`, { params: { days } });
    return data;
};

export const getAuditLogs = async (agentId: string, actionType?: string, status?: string): Promise<IAuditLog[]> => {
  const { data } = await api.get<IAuditLog[]>(`/agents/${agentId}/audit`, {
      params: { actionType, status }
  });
  return data;
};

export const sendMessageToAgent = async (agentId: string, message: string): Promise<IAgentChatResponse> => {
  const { data } = await api.post<IAgentChatResponse>(`/agents/${agentId}/chat`, { message });
  return data;
};

export const getAgentCard = async (agentId: string): Promise<unknown> => {
  const { data } = await api.get<unknown>(`/agents/${agentId}/card`);
  return data;
};

export interface IBillingSummary {
    creditBalance: number;
    creditCap?: number;
    subscriptionTier: string;
    subscriptionStatus?: string;
    pauseReason?: string;
    billingPeriodEnd?: string;
    burnRate: number;
    estimatedDaysRemaining: number | null;
    llmKeyType: string;
    stripeCustomerId: boolean;
    stripeSubscriptionId: boolean;
}

export const getBilling = async (tenantId: string): Promise<IBillingSummary> => {
    const { data } = await api.get<IBillingSummary>(`/tenants/${tenantId}/billing`);
    return data;
};

export const updateSubscription = async (tenantId: string, tier: string): Promise<any> => {
    const { data } = await api.put(`/tenants/${tenantId}/subscription`, { tier });
    return data;
};

// --- Admin Fleet Endpoints ---

export const restartFleet = async (): Promise<IAdminActionResponse> => {
  const { data } = await api.post<IAdminActionResponse>('/admin/fleet/restart');
  return data;
};

export const syncPolicy = async (): Promise<IAdminActionResponse> => {
  const { data } = await api.post<IAdminActionResponse>('/admin/fleet/sync-policy');
  return data;
};

export const getFleetHealth = async (): Promise<IFleetHealthResponse> => {
  const { data } = await api.get<IFleetHealthResponse>('/admin/fleet/health');
  return data;
};

export const getTenants = async (): Promise<ITenant[]> => {
  const { data } = await api.get<ITenant[]>('/admin/tenants');
  return data;
};

export const scaleOutCluster = async (): Promise<IAdminActionResponse> => {
  const { data } = await api.post<IAdminActionResponse>('/admin/cluster/scale-out');
  return data;
};

export const scaleInCluster = async (): Promise<IAdminActionResponse> => {
  const { data } = await api.post<IAdminActionResponse>('/admin/cluster/scale-in');
  return data;
};

// --- Admin Agent Management ---

export const adminGetAllAgents = async (): Promise<IAgent[]> => {
  const { data } = await api.get<IAgent[]>('/admin/agents');
  return data;
};

export const adminStopAgent = async (agentId: string): Promise<IAdminActionResponse> => {
  const { data } = await api.post<IAdminActionResponse>(`/admin/agents/${agentId}/stop`);
  return data;
};

export const adminRestartAgent = async (agentId: string): Promise<IAdminActionResponse> => {
  const { data } = await api.post<IAdminActionResponse>(`/admin/agents/${agentId}/restart`);
  return data;
};

export const adminDeleteAgent = async (agentId: string): Promise<IAdminActionResponse> => {
  const { data } = await api.delete<IAdminActionResponse>(`/admin/agents/${agentId}`);
  return data;
};

// --- Admin Coupon Endpoints ---

export interface ICoupon {
  _id: string;
  code: string;
  tier: string;
  discountType: string;
  discountValue: number;
  durationMonths: number | null;
  maxRedemptions: number | null;
  currentRedemptions: number;
  expiresAt: string | null;
  isActive: boolean;
  recipients: string[];
  createdAt: string;
}

export const getCoupons = async (active?: boolean): Promise<ICoupon[]> => {
  const params = active !== undefined ? { active } : {};
  const { data } = await api.get<ICoupon[]>('/admin/coupons', { params });
  return data;
};

export const createCoupon = async (payload: {
  tier: string;
  discountType: string;
  discountValue: number;
  durationMonths: number | null;
  maxRedemptions: number | null;
  expiresAt: string | null;
  recipients: string[];
  customCode: string;
}): Promise<{ coupon: ICoupon; message: string }> => {
  const { data } = await api.post<{ coupon: ICoupon; message: string }>('/admin/coupons', payload);
  return data;
};

export const deactivateCoupon = async (couponId: string): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>(`/admin/coupons/${couponId}/deactivate`);
  return data;
};

export const sendCoupon = async (couponId: string, recipients: string[]): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>(`/admin/coupons/${couponId}/send`, { recipients });
  return data;
};

// --- Registry Endpoints ---

export const getSkills = async (): Promise<any[]> => {
  const { data } = await api.get<any[]>('/registry/skills');
  return data;
};

export const getPlugins = async (): Promise<any[]> => {
  const { data } = await api.get<any[]>('/registry/plugins');
  return data;
};

export const uploadSkill = async (manifestFile: File): Promise<IUploadSkillResponse> => {
  const formData = new FormData();
  formData.append('manifest', manifestFile);
  
  const { data } = await api.post<IUploadSkillResponse>('/registry/skills', formData, {
      headers: {
          'Content-Type': 'multipart/form-data'
      }
  });
  return data;
};

export const uploadPlugin = async (manifestFile: File): Promise<IUploadSkillResponse> => {
  const formData = new FormData();
  formData.append('manifest', manifestFile);
  
  const { data } = await api.post<IUploadSkillResponse>('/registry/plugins', formData, {
      headers: {
          'Content-Type': 'multipart/form-data'
      }
  });
  return data;
};

/* Registry search/trending results. The service's response is denormalized
   across implementations, so every presentational field is optional and the
   login (`slug`) is the only contract. */
export interface ISkillResult {
  slug: string;
  name?: string;
  displayName?: string;
  summary?: string;
  description?: string;
  version?: string;
  score?: number;
  author?: string;
  installs?: number;
  stats?: { stars?: number; downloads?: number };
}

export const searchClawHub = async (query: string): Promise<ISkillResult[]> => {
  const { data } = await api.get<ISkillResult[]>(`/registry/search?q=${encodeURIComponent(query)}`);
  return data;
};

export const getTrendingSkills = async (): Promise<ISkillResult[]> => {
  const { data } = await api.get<ISkillResult[]>('/registry/trending');
  return data;
};

export const getSkillDetails = async (slug: string): Promise<ISkillResult & Record<string, unknown>> => {
  const { data } = await api.get<ISkillResult & Record<string, unknown>>(`/registry/skills/${slug}/details`);
  return data;
};

export const getSkillFileContent = async (slug: string, filePath: string): Promise<string> => {
  const { data } = await api.get<{ content: string }>(`/registry/skills/${slug}/files/content`, {
    params: { filePath }
  });
  return data.content;
};

export const installSkill = async (slug: string): Promise<{ message: string; slug: string }> => {
  const { data } = await api.post<{ message: string; slug: string }>('/registry/install', { slug });
  return data;
};

// --- Lobby Endpoints ---

export const fetchLobbies = async (tenantId: string): Promise<ILobby[]> => {
  const { data } = await api.get<ILobby[]>(`/lobbies?tenantId=${tenantId}`);
  return data;
};

export const fetchLobby = async (lobbyId: string): Promise<ILobby> => {
  const { data } = await api.get<ILobby>(`/lobbies/${lobbyId}`);
  return data;
};

export const createLobby = async (tenantId: string, name: string, agentIds: string[]): Promise<ILobby> => {
  const { data } = await api.post<ILobby>('/lobbies', { tenantId, name, agentIds });
  return data;
};

export const deleteLobby = async (lobbyId: string): Promise<void> => {
  await api.delete(`/lobbies/${lobbyId}`);
};

export const sendLobbyMessage = async (lobbyId: string, content: string, senderId: string, senderName: string): Promise<void> => {
  await api.post(`/lobbies/${lobbyId}/message`, { content, senderId, senderName });
};

// The terminal token mint lives in lib/socketApi.ts: it is only meaningful
// alongside a socket connection, and a second definition of the same route
// here is one place too many to keep in step.

// ─── Memory service ─────────────────────────────────────────────────────────
//
// The hosted long-term memory layer (NMAFC), reached through the platform's
// `/api/memory` proxy. Distinct from `fetchAgentMemory` above: that reads an
// agent's workspace files off disk, this is the memory the agent has actually
// accumulated across a conversation.
//
// Field names are snake_case, matching the wire. `memoryController.ts`
// forwards the service response verbatim (`res.json(await operation())`) and
// the memory service dumps its pydantic models with `model_dump()`, so nothing
// between the engine and the browser camelises. A camelCase interface here
// would type-check and still be wrong at runtime.
//
// The one exception is `POST /forget`, whose body `memoryController.forget`
// reads as `recordId` / `entityName` before converting downstream. That is the
// request side, not the response side, so it is camelCase.

export type MemoryType = 'CoreAnchor' | 'ActiveContext' | 'EphemeralState';

export interface MemoryRecord {
  id: string;
  entity_name: string;
  fact_content: string;
  memory_type: MemoryType;
  weight: number;
  consolidation_index: number;
  created_at_turn: number;
  last_reinforced_turn: number;
  is_active: boolean;
  related_entities: string[];
  valid_at: number | null;
  valid_at_text: string | null;
  invalid_at: number | null;
  created_date: string | null;
}

export interface MemoryRecordPage {
  results: MemoryRecord[];
  total: number;
  limit: number;
  offset: number;
}

/** `has_dates` is false for a store that was never dated: turn numbers are
 *  then not dates, and the UI must not render them as though they were. */
export interface MemoryValidity {
  valid_at: number | null;
  valid_at_text: string | null;
  valid_date: string | null;
  invalid_at: number | null;
  invalid_date: string | null;
  has_dates: boolean;
}

export interface MemorySourceTurn {
  turn: number;
  timestamp: string | null;
  /** Verbatim turn text. null when the backend keeps no turn text, which is a
   *  real answer ("this store does not retain the words"), not a failure. */
  text: string | null;
}

export interface MemoryRecordSource {
  record: MemoryRecord;
  validity: MemoryValidity;
  source_turns: MemorySourceTurn[];
}

export interface MemorySearchHit {
  record: MemoryRecord;
  score: number;
  /** Edges of the entity graph traversed to reach this record. 0 is a direct
   *  vector hit; each hop above that is spreading activation. */
  hops: number;
}

export type MemoryEventType =
  | 'weight_update'
  | 'override'
  | 'suppression'
  | 'prune'
  | 'consolidation'
  | 'ltp'
  | 'retrieval';

export interface MemoryEvent {
  event_type: MemoryEventType | string;
  turn: number;
  timestamp: string | null;
  record_id: string | null;
  entity_name: string | null;
  old_weight: number | null;
  new_weight: number | null;
  old_memory_type: MemoryType | null;
  new_memory_type: MemoryType | null;
  suppressed_by: string | null;
  old_k: number | null;
  new_k: number | null;
  retrieval_score: number | null;
  hops: number | null;
  metadata: Record<string, unknown> | null;
}

export interface MemoryEventPage {
  results: MemoryEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface MemoryTimelinePoint {
  turn: number;
  event_type: string;
  count: number;
}

export interface MemoryGraphNode {
  id: string;
  record_count: number;
  types: Record<string, number>;
  avg_weight: number;
  clustering_coefficient: number;
  related_entities: string[];
}

export interface MemoryGraph {
  nodes: MemoryGraphNode[];
  edges: { source: string; target: string }[];
}

export interface MemoryDecayPoint {
  turn: number;
  weight: number;
}

export interface MemoryDecayCurve {
  record_id: string;
  entity_name: string;
  memory_type: MemoryType;
  current_weight: number;
  consolidation_index: number;
  points: MemoryDecayPoint[];
}

export interface MemoryDecayProjection {
  current_turn: number;
  prune_threshold: number;
  curves: MemoryDecayCurve[];
}

export interface MemoryStats {
  tenant: string;
  conversation_id: string;
  turn: number;
  /** `{ count, avg_weight, types }` — keys are the engine's own. */
  hot: Record<string, unknown> & { count?: number };
  cold: Record<string, unknown> & { total_events?: number; active_events?: number };
  events: { total_events: number; by_type: Record<string, number> };
}

export interface MemoryHealth {
  status: string;
  checks?: Record<string, unknown>;
}

/**
 * Caller-selectable sub-scopes *inside* the tenant: which agent's memory, in
 * which conversation. Both optional; absent means the tenant's own default
 * store, which is where everything written before agent scoping existed
 * lives. camelCase on the wire — memoryController reads `req.query.agentId`.
 */
export interface MemoryScopeParams {
  agentId?: string;
  conversationId?: string;
}

export const getMemoryRecords = async (
  params: { limit?: number; offset?: number } & MemoryScopeParams = {},
): Promise<MemoryRecordPage> => {
  const { data } = await api.get<MemoryRecordPage>('/memory/records', { params });
  return data;
};

export const getMemoryRecord = async (
  recordId: string,
  scope: MemoryScopeParams = {},
): Promise<MemoryRecord> => {
  const { data } = await api.get<MemoryRecord>(`/memory/records/${encodeURIComponent(recordId)}`, {
    params: scope,
  });
  return data;
};

export const getMemoryRecordSource = async (
  recordId: string,
  scope: MemoryScopeParams = {},
): Promise<MemoryRecordSource> => {
  const { data } = await api.get<MemoryRecordSource>(
    `/memory/records/${encodeURIComponent(recordId)}/source`,
    { params: scope },
  );
  return data;
};

/** Vector search over Hot RAM. Deliberately not `recall`: retrieval buffers an
 *  LTP reinforcement for every record it surfaces, and a search box must not
 *  change what is remembered. */
export const searchMemoryRecords = async (
  query: string,
  top_k = 10,
  scope: MemoryScopeParams = {},
): Promise<{ results: MemorySearchHit[] }> => {
  // camelCase on the wire: memoryController.searchRecords reads `body.topK`
  // and converts downstream. Sending top_k here was silently ignored, which
  // pinned every search to the server's default of 10 no matter what the
  // panel's selector said.
  const { data } = await api.post<{ results: MemorySearchHit[] }>('/memory/records/search', {
    query,
    topK: top_k,
    ...scope,
  });
  return data;
};

export const getMemoryEvents = async (
  params: {
    turn_from?: number;
    turn_to?: number;
    event_type?: string;
    entity_name?: string;
    limit?: number;
    offset?: number;
  } & MemoryScopeParams = {},
): Promise<MemoryEventPage> => {
  const { data } = await api.get<MemoryEventPage>('/memory/events', { params });
  return data;
};

export const getMemoryEventTimeline = async (
  limit = 100,
  scope: MemoryScopeParams = {},
): Promise<MemoryTimelinePoint[]> => {
  const { data } = await api.get<MemoryTimelinePoint[]>('/memory/events/timeline', {
    params: { limit, ...scope },
  });
  return data;
};

export const getMemoryEventStats = async (
  scope: MemoryScopeParams = {},
): Promise<{
  total_events: number;
  by_type: Record<string, number>;
}> => {
  const { data } = await api.get<{ total_events: number; by_type: Record<string, number> }>(
    '/memory/events/stats',
    { params: scope },
  );
  return data;
};

export const getMemoryGraph = async (scope: MemoryScopeParams = {}): Promise<MemoryGraph> => {
  const { data } = await api.get<MemoryGraph>('/memory/graph', { params: scope });
  return data;
};

export const getMemoryEntity = async (
  entityName: string,
  scope: MemoryScopeParams = {},
): Promise<{
  entity_name: string;
  records: MemoryRecord[];
  clustering_coefficient: number;
  neighbors: string[];
  degree: number;
}> => {
  const { data } = await api.get(`/memory/graph/entity/${encodeURIComponent(entityName)}`, {
    params: scope,
  });
  return data;
};

/** Projection of the model's decay configuration from here forward. A read:
 *  asking for the curve cannot move it. */
export const getMemoryDecayCurves = async (
  turns_ahead = 50,
  scope: MemoryScopeParams = {},
): Promise<MemoryDecayProjection> => {
  const { data } = await api.get<MemoryDecayProjection>('/memory/decay/curves', {
    params: { turns_ahead, ...scope },
  });
  return data;
};

export const getMemoryStats = async (scope: MemoryScopeParams = {}): Promise<MemoryStats> => {
  const { data } = await api.get<MemoryStats>('/memory/stats', { params: scope });
  return data;
};

export const getMemoryHealth = async (): Promise<MemoryHealth> => {
  const { data } = await api.get<MemoryHealth>('/memory/health');
  return data;
};

/**
 * Temporal invalidation, not destruction. The write-ahead log keeps the entry,
 * so the archive history stays auditable — the response carries
 * `semantics: "temporal_invalidation"` so a caller cannot mistake this for a
 * right-to-erasure fulfilment.
 */
export const forgetMemoryRecord = async (
  recordId: string,
  scope: MemoryScopeParams = {},
): Promise<{ forgotten: number; by: string; semantics: string }> => {
  const { data } = await api.post<{ forgotten: number; by: string; semantics: string }>(
    '/memory/forget',
    { recordId, ...scope },
  );
  return data;
};

/* ── Memory chat surface ───────────────────────────────────────────────────
 * The three endpoints an application actually integrates: one turn with
 * memory interposed, read-only retrieval, and transcript ingest. These are
 * writes against the live memory — /chat and /remember extract facts, and
 * /recall reinforces what it surfaces — which is why the console's search
 * box deliberately does not use them (see searchMemoryRecords above). The
 * playground page is the one surface that exposes them on purpose.
 */

/** `POST /memory/chat` — recall, inject, generate and write in one LLM call. */
export interface MemoryChatResult {
  reply: string;
  turn: number;
  conversation_id: string;
}

export const chatMemory = async (input: {
  message: string;
  history?: { role: string; content: string }[];
  conversationId?: string;
  agentId?: string;
}): Promise<MemoryChatResult> => {
  const { data } = await api.post<MemoryChatResult>('/memory/chat', {
    message: input.message,
    history: input.history ?? [],
    conversationId: input.conversationId,
    agentId: input.agentId,
  });
  return data;
};

/** `POST /memory/recall` — the context the engine would inject for a query. */
export interface MemoryRecallHit {
  id: string | null;
  entity_name: string;
  fact: string;
  memory_type: MemoryType | string;
  /** Cosine similarity, or null when the hit arrived through keyword or
   *  graph-walk provenance — the engine does not score those. */
  score: number | null;
  source: string;
  hop_distance: number;
}

export interface MemoryRecallResult {
  context: string;
  hits: MemoryRecallHit[];
  token_estimate: number;
  turn: number;
}

export const recallMemory = async (input: {
  query: string;
  topK?: number;
  conversationId?: string;
  agentId?: string;
}): Promise<MemoryRecallResult> => {
  const { data } = await api.post<MemoryRecallResult>('/memory/recall', {
    query: input.query,
    // camelCase on the wire — memoryController.recall reads `body.topK` and
    // converts to the service's top_k itself.
    topK: input.topK,
    conversationId: input.conversationId,
    agentId: input.agentId,
  });
  return data;
};

/** `POST /memory/remember` — ingest a transcript without generating a reply. */
export interface MemoryRememberResult {
  updates_ingested: number;
  overrides_suppressed: number;
  consolidated: boolean;
  turn: number;
}

export const rememberMemory = async (input: {
  messages: { role: string; content: string }[];
  conversationId?: string;
  agentId?: string;
}): Promise<MemoryRememberResult> => {
  const { data } = await api.post<MemoryRememberResult>('/memory/remember', {
    messages: input.messages,
    conversationId: input.conversationId,
    agentId: input.agentId,
  });
  return data;
};

/* ── Memory API connections ────────────────────────────────────────────────
 * A memory key is how a customer connects their own application to their
 * memory. The platform mints one per connection; the key value appears in
 * exactly one HTTP response and is never retrievable afterwards, which is why
 * only the mint response carries it.
 */

export type MemoryScope = 'read' | 'write';

export interface IMemoryConnection {
  keyId: string;
  label: string;
  scopes: MemoryScope[];
  /** Non-secret handle, e.g. `nmafc_org_d2484abb.…`. Never the key itself. */
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/** Mint response. `apiKey` is present here and nowhere else. */
export interface IMemoryConnectionIssued {
  keyId: string;
  label: string;
  scopes: MemoryScope[];
  keyPrefix: string;
  apiKey: string;
  createdAt: string;
}

export const listMemoryConnections =
  async (): Promise<{ results: IMemoryConnection[] }> => {
    const { data } = await api.get<{ results: IMemoryConnection[] }>('/memory/connections');
    return data;
  };

export const mintMemoryConnection = async (input: {
  label: string;
  scopes?: MemoryScope[];
}): Promise<IMemoryConnectionIssued> => {
  const { data } = await api.post<IMemoryConnectionIssued>('/memory/connections', input);
  return data;
};

export const revokeMemoryConnection = async (
  keyId: string,
): Promise<{ keyId: string; revokedAt: string }> => {
  const { data } = await api.delete<{ keyId: string; revokedAt: string }>(
    `/memory/connections/${encodeURIComponent(keyId)}`,
  );
  return data;
};
