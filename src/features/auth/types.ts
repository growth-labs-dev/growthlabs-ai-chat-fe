export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
}

export interface AuthSession {
  authenticated: boolean;
  user: AuthUser | null;
  expiresAt?: string;
  csrfToken: string | null;
}

export interface AuthConfig {
  authentication: boolean;
  password: { enabled: boolean; registration: boolean };
  google: { enabled: boolean; loginUrl: string | null };
  cli: { enabled: boolean; verificationUrl: string };
}
