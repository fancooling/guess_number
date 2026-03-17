import { Injectable, inject, signal } from '@angular/core';
import { Auth, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, user, User } from '@angular/fire/auth';

export type AuthState = 'loading' | 'guest' | 'authenticated';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);

  // Use Firebase Auth's user observable
  firebaseUser = user(this.auth);

  // Local user state
  private _user = signal<User | null>(null);
  private _authState = signal<AuthState>('loading');
  private _displayName = signal<string>('Guest');

  authState = this._authState.asReadonly();
  displayName = this._displayName.asReadonly();
  user = this._user.asReadonly();

  constructor() {
    // Listen to auth state changes
    this.firebaseUser.subscribe((user) => {
      this._user.set(user);
      if (user) {
        this._authState.set(user.isAnonymous ? 'guest' : 'authenticated');
        this._displayName.set(user.displayName || 'Guest');
      } else {
        this._authState.set('loading');
        this._displayName.set('Guest');
      }
    });
  }

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
  }

  async signInAsGuest(): Promise<void> {
    await signInAnonymously(this.auth);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  isLoggedIn(): boolean {
    return this._authState() === 'guest' || this._authState() === 'authenticated';
  }

  getUserId(): string | null {
    return this._user()?.uid || null;
  }
}
