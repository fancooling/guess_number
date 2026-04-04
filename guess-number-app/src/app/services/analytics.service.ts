import { Injectable, signal } from '@angular/core';

declare let gtag: (...args: any[]) => void;

const CONSENT_KEY = 'analytics_consent';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private _showConsentBanner = signal(false);
  showConsentBanner = this._showConsentBanner.asReadonly();

  constructor() {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'granted') {
      this.grantConsent();
    } else if (stored === null) {
      this._showConsentBanner.set(true);
    }
  }

  acceptConsent(): void {
    localStorage.setItem(CONSENT_KEY, 'granted');
    this._showConsentBanner.set(false);
    this.grantConsent();
  }

  declineConsent(): void {
    localStorage.setItem(CONSENT_KEY, 'denied');
    this._showConsentBanner.set(false);
  }

  private grantConsent(): void {
    if (typeof gtag !== 'undefined') {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  }

  setUserId(uid: string): void {
    if (typeof gtag !== 'undefined' && localStorage.getItem(CONSENT_KEY) === 'granted') {
      gtag('set', { user_id: uid });
    }
  }

  clearUserId(): void {
    if (typeof gtag !== 'undefined') {
      gtag('set', { user_id: null });
    }
  }

  event(eventName: string, params?: Record<string, string | number>) {
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, params);
    }
  }
}
