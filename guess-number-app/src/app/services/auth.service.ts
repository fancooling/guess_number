import { Injectable, inject, signal, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { AuthState, AuthUser, LoginResponse } from '../../common/types/auth';
import { environment } from '../../environments/environment';
import { AnalyticsService } from './analytics.service';

declare const google: any;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);
  private analytics = inject(AnalyticsService);

  private _user = signal<AuthUser | null>(null);
  private _authState = signal<AuthState>('guest');
  private _displayName = signal<string>('Guest');
  private _token = signal<string | null>(null);
  private _showNamePrompt = signal<boolean>(false);

  private isNative = Capacitor.isNativePlatform();

  authState = this._authState.asReadonly();
  displayName = this._displayName.asReadonly();
  user = this._user.asReadonly();
  token = this._token.asReadonly();
  showNamePrompt = this._showNamePrompt.asReadonly();

  constructor() {
    this.restoreSession();
    if (!this.isNative) {
      // GIS is only used on web
    } else {
      GoogleAuth.initialize({
        clientId: environment.googleClientId,
        scopes: ['profile', 'email'],
      });
    }
  }

  private restoreSession(): void {
    const token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('auth_user');
    if (token && userJson) {
      try {
        const user: AuthUser = JSON.parse(userJson);
        this._token.set(token);
        this._user.set(user);
        this._authState.set(user.authState);
        this._displayName.set(user.displayName);
        this.analytics.setUserId(user.uid);
      } catch {
        this.clearSession();
      }
    } else {
      this._authState.set('guest');
    }
  }

  initGoogleSignIn(buttonElement: HTMLElement): void {
    if (this.isNative) return;

    if (typeof google === 'undefined' || !google.accounts?.id) {
      setTimeout(() => this.initGoogleSignIn(buttonElement), 500);
      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => {
        this.ngZone.run(() => this.handleGoogleCredential(response.credential));
      },
    });

    google.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'medium',
      text: 'signin_with',
      shape: 'pill',
    });
  }

  async signInWithGoogleNative(): Promise<void> {
    try {
      const result = await GoogleAuth.signIn();
      const idToken = result.authentication.idToken;
      if (idToken) {
        await this.signInWithGoogle(idToken);
      }
    } catch (e) {
      console.error('Native Google sign-in failed:', e);
    }
  }

  async signInWithGoogle(idToken: string): Promise<void> {
    const response = await firstValueFrom(this.http.post<LoginResponse>('/api/auth/google', { idToken }));
    this.setSession(response);
  }

  async signInAsGuest(): Promise<void> {
    const response = await firstValueFrom(this.http.post<LoginResponse>('/api/auth/guest', {}));
    this.setSession(response);
  }

  signOut(): void {
    if (this.isNative) {
      GoogleAuth.signOut().catch(() => {});
    }
    this.clearSession();
  }

  isLoggedIn(): boolean {
    return this._token() !== null;
  }

  getUserId(): string | null {
    return this._user()?.uid || null;
  }

  getToken(): string | null {
    return this._token();
  }

  updateDisplayName(name: string): void {
    this._displayName.set(name);
    const user = this._user();
    if (user) {
      const updated = { ...user, displayName: name };
      this._user.set(updated);
      localStorage.setItem('auth_user', JSON.stringify(updated));
    }
  }

  dismissNamePrompt(): void {
    this._showNamePrompt.set(false);
  }

  private async handleGoogleCredential(credential: string): Promise<void> {
    try {
      await this.signInWithGoogle(credential);
    } catch (e) {
      console.error('Google sign-in failed:', e);
    }
  }

  private setSession(response: LoginResponse): void {
    this._token.set(response.token);
    this._user.set(response.user);
    this._authState.set(response.user.authState);
    this._displayName.set(response.user.displayName);
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
    this.analytics.setUserId(response.user.uid);
    if (response.user.isNewPlayer) {
      this._showNamePrompt.set(true);
    }
  }

  private clearSession(): void {
    this._token.set(null);
    this._user.set(null);
    this._authState.set('guest');
    this._displayName.set('Guest');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.analytics.clearUserId();
  }
}
