import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-room-lobby',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-white/50">
      <!-- Header -->
      <div class="bg-indigo-600 text-white p-6 text-center">
        <h1 class="text-2xl font-extrabold tracking-tight">{{ roomService.currentRoom()?.name }}</h1>
        <p class="text-indigo-200 mt-1 text-sm">Waiting for players...</p>
      </div>

      <div class="p-6">
        <!-- Players -->
        <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Players</h3>
        <div class="space-y-2 mb-6">
          <div *ngFor="let player of roomService.currentRoom()?.players"
            class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span class="text-indigo-600 font-bold text-sm">{{ player.displayName.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="flex-1">
              <span class="font-semibold text-gray-800 text-sm">{{ player.displayName }}</span>
              <span *ngIf="player.uid === roomService.currentRoom()?.creatorId"
                class="ml-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">Host</span>
            </div>
          </div>

          <!-- Empty slots -->
          <div *ngFor="let slot of emptySlots()"
            class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-dashed border-gray-200">
            <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <span class="text-gray-400 text-sm">?</span>
            </div>
            <span class="text-gray-400 text-sm">Waiting...</span>
          </div>
        </div>

        <!-- Start Game (Creator only) -->
        <div *ngIf="roomService.isRoomCreator()" class="mb-4">
          <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Select Length</h3>
          <div class="flex items-center justify-center gap-3 mb-4">
            <button *ngFor="let len of [3, 4, 5]"
              (click)="selectedLength.set(len)"
              [class.ring-4]="selectedLength() === len"
              [class.ring-indigo-300]="selectedLength() === len"
              [class.bg-indigo-50]="selectedLength() === len"
              [class.text-indigo-700]="selectedLength() === len"
              class="px-5 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 font-extrabold text-lg shadow-sm transition-all focus:outline-none">
              {{ len }}
            </button>
          </div>
          <button (click)="startGame()"
            class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-2xl shadow-lg shadow-green-200 transition-all active:scale-[0.98] text-lg">
            Start Game
          </button>
        </div>

        <div *ngIf="!roomService.isRoomCreator()" class="mb-4 text-center text-gray-500 text-sm py-4">
          Waiting for host to start the game...
        </div>

        <!-- Leave Room -->
        <button (click)="leaveRoom()"
          class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-2xl transition text-sm">
          Leave Room
        </button>
      </div>
    </div>
  `
})
export class RoomLobbyComponent {
  roomService = inject(RoomService);
  selectedLength = signal(4);

  emptySlots(): number[] {
    const playerCount = this.roomService.currentRoom()?.players.length || 0;
    return Array(3 - playerCount).fill(0);
  }

  async startGame() {
    try {
      await this.roomService.startGame(this.selectedLength());
    } catch (e) {
      console.error('Error starting game:', e);
    }
  }

  async leaveRoom() {
    await this.roomService.leaveRoom();
  }
}
