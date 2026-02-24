export interface AuthenticatedRequest extends Request {
  user?: {
    id: bigint;
    email: string;
    companyId?: bigint;
    role: string;
    isSuperAdmin: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  companyId?: string | undefined;
  isSuperAdmin: boolean;
  role?: string | undefined;
}