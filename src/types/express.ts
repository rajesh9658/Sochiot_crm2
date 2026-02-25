declare global {
  namespace Express {
    interface Request {
      user?: {
        id: bigint;
        email: string;
        companyId?: bigint;
        role: string;
        isSuperAdmin: boolean;
      };
    }
  }
}

export {};
