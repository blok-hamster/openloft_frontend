import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

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
  status: 'provisioning' | 'starting' | 'running' | 'stopped' | 'failed';
  containerId?: string;
  llmProvider: string;
  activeSkills: string[];
  activePlugins: string[];
  pluginConfigs?: Record<string, any>;
  gatewayToken: string;
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
export interface IDeployAgentRequest { 
  tenantId: string; 
  name: string; 
  description?: string;
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

export const createTenant = async (data: ICreateTenantRequest): Promise<ITenant> => {
  const { data: res } = await api.post<ITenant>('/tenants', data);
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

export const approveAgentDevice = async (agentId: string): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.post<{ success: boolean; message: string }>(`/agents/${agentId}/device/approve`);
  return data;
};

export const fetchAgentConfig = async (agentId: string): Promise<Record<string, unknown>> => {
  const { data } = await api.get<{ config: Record<string, unknown> }>(`/agents/${agentId}/config`);
  return data.config;
};

export const updateAgentConfig = async (agentId: string, config: Record<string, unknown>): Promise<void> => {
  await api.put(`/agents/${agentId}/config`, { config });
};

export const saveAgentSecret = async (agentId: string, keyName: string, value: string): Promise<void> => {
  await api.post(`/agents/${agentId}/secret`, { keyName, value });
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

export const getBilling = async (tenantId: string): Promise<{
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
}> => {
    const { data } = await api.get(`/tenants/${tenantId}/billing`);
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

export const searchClawHub = async (query: string): Promise<any[]> => {
  const { data } = await api.get<any[]>(`/registry/search?q=${encodeURIComponent(query)}`);
  return data;
};

export const getSkillDetails = async (slug: string): Promise<any> => {
  const { data } = await api.get<any>(`/registry/skills/${slug}/details`);
  return data;
};

export const getSkillFileContent = async (slug: string, filePath: string): Promise<string> => {
  const { data } = await api.get<{ content: string }>(`/registry/skills/${slug}/files/content`, {
    params: { filePath }
  });
  return data.content;
};

export const getTrendingSkills = async (): Promise<any[]> => {
    const { data } = await api.get<any[]>('/registry/trending');
    return data;
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

export const requestTerminalToken = async (agentId: string): Promise<{ token: string; expiresIn: number }> => {
  const { data } = await api.post(`/agents/${agentId}/terminal/token`);
  return data;
};
