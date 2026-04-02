export type AuthState = 'guest' | 'authenticated';

export interface AuthUser {
  uid: string;
  displayName: string;
  authState: AuthState;
  isNewPlayer?: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
