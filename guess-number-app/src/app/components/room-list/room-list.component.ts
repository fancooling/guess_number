import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-room-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mt-6 bg-white rounded-3xl shadow-xl border border-white/50 overflow-hidden">
      <div class="bg-indigo-600 text-white p-4 flex items-center justify-between">
        <h2 class="text-lg font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Game Rooms
        </h2>
        <button (click)="showCreateForm.set(!showCreateForm())"
          class="text-xs bg-indigo-700 hover:bg-indigo-800 px-3 py-1.5 rounded-full font-medium transition">
          {{ showCreateForm() ? 'Cancel' : '+ Create Room' }}
        </button>
      </div>

      <div class="p-4">
        <!-- Create Room Form -->
        <div *ngIf="showCreateForm()" class="mb-4 opacity-0 animate-fade-in">
          <div class="flex gap-2">
            <input type="text" [(ngModel)]="roomName" placeholder="Room name"
              (keyup.enter)="createRoom()"
              class="flex-1 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 transition-colors outline-none"
              maxlength="30">
            <button (click)="createRoom()" [disabled]="!roomName().trim()"
              class="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-all text-sm">
              Create
            </button>
          </div>
        </div>

        <!-- Room List -->
        <div *ngIf="roomService.availableRooms().length === 0" class="text-center text-gray-400 py-4 text-sm">
          No rooms available. Create one!
        </div>

        <div *ngFor="let room of roomService.availableRooms()"
          class="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition border border-gray-100 mb-2">
          <div class="flex-1">
            <div class="font-semibold text-gray-800 text-sm">{{ room.name }}</div>
            <div class="text-xs text-gray-500">by {{ room.creatorName }} &middot; {{ room.players.length }}/3 players</div>
          </div>
          <button (click)="joinRoom(room.id)" [disabled]="room.players.length >= 3"
            class="text-xs bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold px-3 py-1.5 rounded-full transition">
            {{ room.players.length >= 3 ? 'Full' : 'Join' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class RoomListComponent {
  roomService = inject(RoomService);

  showCreateForm = signal(false);
  roomName = signal('');

  async createRoom() {
    const name = this.roomName().trim();
    if (!name) return;
    try {
      await this.roomService.createRoom(name);
      this.roomName.set('');
      this.showCreateForm.set(false);
    } catch (e) {
      console.error('Error creating room:', e);
    }
  }

  async joinRoom(roomId: string) {
    try {
      await this.roomService.joinRoom(roomId);
    } catch (e) {
      console.error('Error joining room:', e);
    }
  }
}
