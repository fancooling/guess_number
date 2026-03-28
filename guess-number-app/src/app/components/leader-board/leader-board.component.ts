import { Component, inject, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../../services/firestore.service';
import { LeaderboardEntry } from '../../models/player-stats';

@Component({
    selector: 'app-leader-board',
    imports: [CommonModule],
    template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="close.emit()">
      <div class="bg-white rounded-3xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="bg-indigo-600 text-white p-4 flex items-center justify-between">
          <h2 class="text-xl font-bold">Leaderboard</h2>
          <button (click)="close.emit()" class="p-1 hover:bg-indigo-700 rounded-full transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div *ngIf="firestore.leaderboard().length === 0" class="text-center text-gray-500 py-8">
            No players yet. Be the first!
          </div>

          <div *ngFor="let player of firestore.leaderboard(); let i = index"
               (click)="selectPlayer.emit(player)"
               class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition border border-gray-100 mb-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                 [class.bg-yellow-400]="i === 0"
                 [class.text-yellow-900]="i === 0"
                 [class.bg-gray-200]="i > 0"
                 [class.text-gray-600]="i > 0">
              {{ i + 1 }}
            </div>
            <div class="flex-1">
              <div class="font-semibold text-gray-800">{{ player.displayName }}</div>
              <div class="text-xs text-gray-500">{{ player.totalWins }} wins<span *ngIf="player.roomWins > 0"> ({{ player.roomWins }} in rooms)</span></div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LeaderBoardComponent implements OnInit {
  firestore = inject(FirestoreService);

  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() selectPlayer = new EventEmitter<LeaderboardEntry>();

  async ngOnInit() {
    await this.firestore.loadLeaderboard();
  }
}
