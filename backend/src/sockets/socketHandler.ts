import { Server, Socket } from 'socket.io';
import { Match } from '../types/index.js';
import * as matchService from '../services/matchService.js';
import { calculateElapsedMs } from '../services/timerService.js';

let ioInstance: Server | null = null;
let timerHeartbeatInterval: NodeJS.Timeout | null = null;

export function initSocketIO(io: Server): void {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    socket.emit('connection:status', { connected: true, socketId: socket.id });

    socket.on('join:match', (matchId: string) => {
      socket.join(`match:${matchId}`);
    });

    socket.on('leave:match', (matchId: string) => {
      socket.leave(`match:${matchId}`);
    });

    socket.on('join:public', () => {
      socket.join('public');
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  // Start periodic heartbeat tick for running matches
  if (!timerHeartbeatInterval) {
    timerHeartbeatInterval = setInterval(async () => {
      try {
        const activeId = await matchService.getActiveMatchId();
        if (activeId && ioInstance) {
          const match = await matchService.getMatchById(activeId);
          if (match && match.status === 'RUNNING') {
            const { elapsedMs, isTimedOut } = calculateElapsedMs(match);
            ioInstance.to(`match:${match.id}`).to('public').emit('timer:tick', {
              match_id: match.id,
              server_timestamp: Date.now(),
              elapsed_ms: elapsedMs,
              status: match.status
            });

            // If auto timed out during tick, broadcast full update
            if (isTimedOut) {
              const updated = await matchService.getMatchById(activeId);
              if (updated) {
                broadcastMatchUpdate(updated);
              }
            }
          }
        }
      } catch (err) {
        // silent catch on tick
      }
    }, 100); // 100ms sync heartbeat
  }
}

export function broadcastMatchUpdate(match: Match): void {
  if (!ioInstance) return;

  // Broadcast to specific match room
  ioInstance.to(`match:${match.id}`).emit('match:updated', match);

  // Broadcast to public room as well
  ioInstance.to('public').emit('match:updated', match);
}

export function broadcastTimerEvent(matchId: string, event: string, match: Match): void {
  if (!ioInstance) return;
  ioInstance.to(`match:${matchId}`).to('public').emit(event, match);
}

export function broadcastTrialEvent(event: string, data: any): void {
  if (!ioInstance) return;
  ioInstance.emit(event, data);
}

