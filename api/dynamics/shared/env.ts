export interface DynamicsEnv {
  DYNAMICS_URL: string;
  TENANT_ID: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  ALLOWED_ORIGINS: string;
}

const REQUIRED = ['DYNAMICS_URL', 'TENANT_ID', 'CLIENT_ID', 'CLIENT_SECRET'] as const;

export function getEnv(): DynamicsEnv {
  for (const key of REQUIRED) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  return {
    DYNAMICS_URL: process.env.DYNAMICS_URL!,
    TENANT_ID: process.env.TENANT_ID!,
    CLIENT_ID: process.env.CLIENT_ID!,
    CLIENT_SECRET: process.env.CLIENT_SECRET!,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ?? '',
  };
}
