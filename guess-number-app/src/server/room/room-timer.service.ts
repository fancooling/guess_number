import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RoomTimerService {
  private turnTimers = new Map<string, NodeJS.Timeout>();
  private countdownIntervals = new Map<string, NodeJS.Timeout>();

  startTurnTimer(roomId: string, server: Server, onTimeout: () => void, durationMs = 60000): void {
    this.clearTimer(roomId);

    // Countdown broadcast every second
    let remaining = Math.floor(durationMs / 1000);
    const interval = setInterval(() => {
      remaining--;
      server.to(`room:${roomId}`).emit('turn:timer', { remaining: Math.max(0, remaining) });
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    this.countdownIntervals.set(roomId, interval);

    // Turn timeout
    const timer = setTimeout(() => {
      this.clearCountdown(roomId);
      onTimeout();
    }, durationMs);
    this.turnTimers.set(roomId, timer);
  }

  clearTimer(roomId: string): void {
    const timer = this.turnTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.turnTimers.delete(roomId);
    }
    this.clearCountdown(roomId);
  }

  private clearCountdown(roomId: string): void {
    const interval = this.countdownIntervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.countdownIntervals.delete(roomId);
    }
  }

  clearAll(): void {
    for (const roomId of this.turnTimers.keys()) {
      this.clearTimer(roomId);
    }
  }
}
