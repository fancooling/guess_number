import { Injectable, signal } from '@angular/core';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase.config';

export type AuthState = 'loading' | 'guest' | 'authenticated';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Local user state
  private _user = signal<User | null>(null);
  private _authState = signal<AuthState>('loading');
  private _displayName = signal<string>('Guest');

  authState = this._authState.asReadonly();
  displayName = this._displayName.asReadonly();
  user = this._user.asReadonly();

  // Expose as observable-like for room service subscription
  firebaseUser = {
    subscribe: (callback: (user: User | null) => void) => {
      return onAuthStateChanged(auth, callback);
    }
  };

  constructor() {
    onAuthStateChanged(auth, (user) => {
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
    await signInWithPopup(auth, provider);
  }

  async signInAsGuest(): Promise<void> {
    await signInAnonymously(auth);
  }

  async signOut(): Promise<void> {
    await signOut(auth);
  }

  isLoggedIn(): boolean {
    return this._authState() === 'guest' || this._authState() === 'authenticated';
  }

  getUserId(): string | null {
    return this._user()?.uid || null;
  }
}
