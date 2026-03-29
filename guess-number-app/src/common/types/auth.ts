export type AuthState = 'loading' | 'guest' | 'authenticated';

export interface AuthUser {
  uid: string;
  displayName: string;
  authState: AuthState;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
