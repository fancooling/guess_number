import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../../services/room.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-room-game',
    imports: [CommonModule, FormsModule],
    template: `
    <div class="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-white/50">
      <!-- Header -->
      <div class="bg-indigo-600 text-white p-4 text-center relative">
        <h1 class="text-xl font-extrabold tracking-tight">{{ roomService.currentRoom()?.name }}</h1>

        <!-- Players bar -->
        <div class="flex justify-center gap-2 mt-2">
          <div *ngFor="let player of roomService.currentRoom()?.players"
            class="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            [class.bg-green-500]="player.uid === roomService.currentRoom()?.gameState?.currentTurnPlayerId"
            [class.bg-indigo-700]="player.uid !== roomService.currentRoom()?.gameState?.currentTurnPlayerId">
            <span>{{ player.displayName }}</span>
            <span *ngIf="player.uid === roomService.currentRoom()?.gameState?.currentTurnPlayerId"
              class="animate-pulse">&#9679;</span>
          </div>
        </div>

        <!-- Timer -->
        <div *ngIf="roomService.currentRoom()?.status === 'playing'"
          class="mt-2 text-sm font-bold"
          [class.text-red-300]="roomService.turnTimeRemaining() <= 10"
          [class.text-indigo-200]="roomService.turnTimeRemaining() > 10">
          {{ roomService.turnTimeRemaining() }}s
        </div>
      </div>

      <div class="p-4">
        <!-- Playing State -->
        <div *ngIf="roomService.currentRoom()?.status === 'playing'" class="flex flex-col h-[400px]">
          <!-- Turn indicator -->
          <div class="text-center mb-3 text-sm font-semibold px-3 py-1.5 rounded-full"
            [class.bg-green-50]="roomService.isMyTurn()"
            [class.text-green-700]="roomService.isMyTurn()"
            [class.bg-gray-50]="!roomService.isMyTurn()"
            [class.text-gray-500]="!roomService.isMyTurn()">
            {{ roomService.isMyTurn() ? 'Your turn!' : getCurrentTurnPlayerName() + "'s turn" }}
          </div>

          <!-- Length indicator -->
          <div class="text-center mb-3">
            <span class="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Length: <span class="font-bold text-indigo-600">{{ roomService.currentRoom()?.gameState?.length }}</span>
            </span>
          </div>

          <!-- History -->
          <div class="flex-1 overflow-y-auto mb-4 bg-gradient-to-b from-gray-50 to-white rounded-2xl p-3 border border-gray-100 shadow-inner flex flex-col-reverse gap-2">
            <div *ngIf="!roomService.currentRoom()?.gameState?.history?.length" class="text-center text-gray-400 font-medium italic mt-auto mb-auto text-sm">
              Waiting for first guess...
            </div>

            <div *ngFor="let item of getReversedHistory()"
              class="bg-white rounded-xl p-2.5 shadow-sm border flex items-center justify-between relative overflow-hidden"
              [ngClass]="item.greenLights === roomService.currentRoom()?.gameState?.length ? 'border-green-200' : 'border-gray-100'">
              <div class="absolute inset-y-0 left-0 w-1.5"
                [ngClass]="item.greenLights === roomService.currentRoom()?.gameState?.length ? 'bg-green-500' : (item.greenLights + item.yellowLights === 0 ? 'bg-red-400' : 'bg-yellow-400')">
              </div>

              <div class="pl-2 flex items-center gap-2">
                <span class="text-xs font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{{ item.playerName }}</span>
                <div class="font-mono text-lg text-gray-800 font-bold tracking-[0.15em]">{{ item.guess }}</div>
              </div>

              <div class="flex gap-1.5">
                <div *ngIf="item.greenLights > 0"
                  class="flex items-center bg-green-50 rounded-full px-2 py-0.5 border border-green-100 gap-1">
                  <span class="text-green-700 font-black text-sm">{{ item.greenLights }}</span>
                  <div class="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"></div>
                </div>
                <div *ngIf="item.yellowLights > 0"
                  class="flex items-center bg-yellow-50 rounded-full px-2 py-0.5 border border-yellow-100 gap-1">
                  <span class="text-yellow-700 font-black text-sm">{{ item.yellowLights }}</span>
                  <div class="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]"></div>
                </div>
                <div *ngIf="item.greenLights === 0 && item.yellowLights === 0"
                  class="bg-gray-50 rounded-full px-2 py-0.5 text-gray-400 text-xs font-bold border border-gray-100">
                  Miss
                </div>
              </div>
            </div>
          </div>

          <!-- Input (only when it's my turn) -->
          <div *ngIf="roomService.isMyTurn()" class="mt-auto">
            <div class="flex gap-2">
              <input type="text" [(ngModel)]="guessInput"
                [maxlength]="roomService.currentRoom()?.gameState?.length || 4"
                (keyup.enter)="submitGuess()"
                placeholder="Enter {{ roomService.currentRoom()?.gameState?.length }} digits"
                class="flex-1 rounded-2xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 bg-gray-50 px-4 py-3 text-lg font-mono tracking-[0.2em] text-center font-bold text-gray-800 transition-colors shadow-sm outline-none"
                pattern="\d*" inputmode="numeric" autofocus>
              <button (click)="submitGuess()"
                [disabled]="guessInput().length !== roomService.currentRoom()?.gameState?.length"
                class="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-2xl shadow-md transition-all active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>

          <div *ngIf="!roomService.isMyTurn()" class="mt-auto text-center text-gray-400 text-sm py-3">
            Waiting for {{ getCurrentTurnPlayerName() }} to guess...
          </div>
        </div>

        <!-- Finished State -->
        <div *ngIf="roomService.currentRoom()?.status === 'finished'" class="opacity-0 animate-fade-in">
          <div class="bg-green-50 rounded-2xl p-6 text-center border-2 border-green-200 shadow-sm mb-4">
            <h3 class="text-2xl font-black text-green-600 mb-2">
              {{ isWinner() ? '🎉 You Won!' : '🏆 ' + roomService.currentRoom()?.gameState?.winnerName + ' Wins!' }}
            </h3>
            <p class="text-green-800 font-medium text-sm">
              The number was <span class="font-mono font-black text-lg">{{ roomService.currentRoom()?.gameState?.targetNumber }}</span>
            </p>
          </div>

          <!-- Play Again (Creator only) -->
          <div *ngIf="roomService.isRoomCreator()" class="mb-3">
            <div class="flex items-center justify-center gap-3 mb-3">
              <button *ngFor="let len of [3, 4, 5]"
                (click)="selectedLength.set(len)"
                [class.ring-3]="selectedLength() === len"
                [class.ring-indigo-300]="selectedLength() === len"
                [class.bg-indigo-50]="selectedLength() === len"
                class="px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-sm shadow-sm transition-all">
                {{ len }}
              </button>
            </div>
            <button (click)="restartGame()"
              class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl shadow-lg shadow-green-200 transition-all active:scale-[0.98]">
              Play Again
            </button>
          </div>

          <div *ngIf="!roomService.isRoomCreator()" class="mb-3 text-center text-gray-500 text-sm py-2">
            Waiting for host to start next game...
          </div>

          <button (click)="leaveRoom()"
            class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-2xl transition text-sm">
            Leave Room
          </button>
        </div>
      </div>
    </div>
  `
})
export class RoomGameComponent {
  roomService = inject(RoomService);
  auth = inject(AuthService);

  guessInput = signal('');
  selectedLength = signal(4);

  getCurrentTurnPlayerName(): string {
    const room = this.roomService.currentRoom();
    if (!room?.gameState) return '';
    const player = room.players.find(p => p.uid === room.gameState!.currentTurnPlayerId);
    return player?.displayName || '';
  }

  getReversedHistory() {
    const history = this.roomService.currentRoom()?.gameState?.history;
    if (!history) return [];
    return [...history].reverse();
  }

  isWinner(): boolean {
    return this.roomService.currentRoom()?.gameState?.winnerId === this.auth.getUserId();
  }

  async submitGuess() {
    const guess = this.guessInput();
    if (!guess) return;
    await this.roomService.makeRoomGuess(guess);
    this.guessInput.set('');
  }

  async restartGame() {
    await this.roomService.restartGame(this.selectedLength());
  }

  async leaveRoom() {
    await this.roomService.leaveRoom();
  }
}
