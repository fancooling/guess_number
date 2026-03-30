import { Injectable } from '@angular/core';

declare let gtag: (...args: any[]) => void;

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  setUserId(uid: string): void {
    if (typeof gtag !== 'undefined') {
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
