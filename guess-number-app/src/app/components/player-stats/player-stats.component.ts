import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { LeaderboardEntry } from '../../../common/types/player';

@Component({
    selector: 'app-player-stats',
    imports: [CommonModule],
    template: `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="close.emit()">
      <div class="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="bg-indigo-600 text-white p-4">
          <h2 class="text-lg font-bold text-center">{{ player.displayName }}</h2>
          <p class="text-indigo-200 text-center text-sm">{{ player.totalWins }} total wins<span *ngIf="player.roomWins > 0"> &middot; {{ player.roomWins }} room wins</span></p>
        </div>

        <!-- Stats -->
        <div class="p-4">
          <div class="grid grid-cols-3 gap-2 text-center">
            <!-- Length 3 -->
            <div class="bg-gray-50 rounded-xl p-3">
              <div class="text-2xl font-black text-indigo-600">3</div>
              <div class="text-xs text-gray-500 mb-1">digits</div>
              <div class="font-bold text-gray-800">{{ player.stats[3].wins || 0 }} wins</div>
              <div class="text-xs text-gray-500">
                Avg: {{ api.getAverageGuesses(player.stats, 3) || '-' }} guesses
              </div>
            </div>

            <!-- Length 4 -->
            <div class="bg-gray-50 rounded-xl p-3">
              <div class="text-2xl font-black text-indigo-600">4</div>
              <div class="text-xs text-gray-500 mb-1">digits</div>
              <div class="font-bold text-gray-800">{{ player.stats[4].wins || 0 }} wins</div>
              <div class="text-xs text-gray-500">
                Avg: {{ api.getAverageGuesses(player.stats, 4) || '-' }} guesses
              </div>
            </div>

            <!-- Length 5 -->
            <div class="bg-gray-50 rounded-xl p-3">
              <div class="text-2xl font-black text-indigo-600">5</div>
              <div class="text-xs text-gray-500 mb-1">digits</div>
              <div class="font-bold text-gray-800">{{ player.stats[5].wins || 0 }} wins</div>
              <div class="text-xs text-gray-500">
                Avg: {{ api.getAverageGuesses(player.stats, 5) || '-' }} guesses
              </div>
            </div>
          </div>

          <button (click)="close.emit()"
            class="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition">
            Close
          </button>
        </div>
      </div>
    </div>
  `
})
export class PlayerStatsComponent {
  api = inject(ApiService);

  @Input() player!: LeaderboardEntry;
  @Output() close = new EventEmitter<void>();
}
