import { PlayerService } from './player.service';
import { RedisService } from '../redis/redis.service';

describe('PlayerService', () => {
  let service: PlayerService;
  let redis: jest.Mocked<RedisService>;

  beforeEach(() => {
    redis = {
      exists: jest.fn(),
      hget: jest.fn(),
      hset: jest.fn(),
      hmset: jest.fn(),
      hgetall: jest.fn(),
      hincrby: jest.fn(),
      zadd: jest.fn(),
      zrem: jest.fn(),
      zrevrangeWithScores: jest.fn(),
    } as any;
    service = new PlayerService(redis);
  });

  describe('saveGameResult', () => {
    it('creates new player record if not exists', async () => {
      redis.exists.mockResolvedValue(false);

      await service.saveGameResult('uid1', 'Player1', 4, 5);

      expect(redis.hmset).toHaveBeenCalledWith('player:uid1', expect.objectContaining({
        displayName: 'Player1',
        totalWins: '1',
        roomWins: '0',
      }));
      expect(redis.zadd).toHaveBeenCalledWith('leaderboard', 1, 'uid1');
    });

    it('updates existing player stats', async () => {
      redis.exists.mockResolvedValue(true);
      redis.hget
        .mockResolvedValueOnce('true') // joinLeaderboard
        .mockResolvedValueOnce(JSON.stringify({
          3: { wins: 0, totalGuesses: 0 },
          4: { wins: 1, totalGuesses: 3 },
          5: { wins: 0, totalGuesses: 0 },
        })); // stats

      await service.saveGameResult('uid1', 'Player1', 4, 5);

      expect(redis.hset).toHaveBeenCalledWith('player:uid1', 'totalWins', '2');
      expect(redis.zadd).toHaveBeenCalledWith('leaderboard', 2, 'uid1');
    });

    it('increments roomWins when isRoomWin is true', async () => {
      redis.exists.mockResolvedValue(false);

      await service.saveGameResult('uid1', 'Player1', 4, 5, true);

      expect(redis.hmset).toHaveBeenCalledWith('player:uid1', expect.objectContaining({
        roomWins: '1',
      }));
    });

    it('skips saving if player opted out of leaderboard', async () => {
      redis.exists.mockResolvedValue(true);
      redis.hget.mockResolvedValueOnce('false'); // joinLeaderboard

      await service.saveGameResult('uid1', 'Player1', 4, 5);

      expect(redis.hset).not.toHaveBeenCalled();
      expect(redis.zadd).not.toHaveBeenCalled();
    });
  });

  describe('getPlayerStats', () => {
    it('returns null if player not found', async () => {
      redis.hgetall.mockResolvedValue({});

      const result = await service.getPlayerStats('uid1');
      expect(result).toBeNull();
    });

    it('returns player stats', async () => {
      redis.hgetall.mockResolvedValue({
        displayName: 'Player1',
        totalWins: '5',
        roomWins: '2',
        joinLeaderboard: 'true',
        stats: JSON.stringify({ 4: { wins: 5, totalGuesses: 20 } }),
      });

      const result = await service.getPlayerStats('uid1');
      expect(result).toEqual({
        uid: 'uid1',
        displayName: 'Player1',
        totalWins: 5,
        roomWins: 2,
        joinLeaderboard: true,
        stats: { 4: { wins: 5, totalGuesses: 20 } },
      });
    });

    it('defaults joinLeaderboard to true when not set', async () => {
      redis.hgetall.mockResolvedValue({
        displayName: 'Player1',
        totalWins: '0',
        roomWins: '0',
        stats: '{}',
      });

      const result = await service.getPlayerStats('uid1');
      expect(result!.joinLeaderboard).toBe(true);
    });
  });

  describe('getLeaderboard', () => {
    it('returns only players who opted into leaderboard', async () => {
      redis.zrevrangeWithScores.mockResolvedValue([
        { member: 'uid1', score: 10 },
        { member: 'uid2', score: 5 },
      ]);
      redis.hgetall
        .mockResolvedValueOnce({ displayName: 'P1', totalWins: '10', roomWins: '0', joinLeaderboard: 'true', stats: '{}' })
        .mockResolvedValueOnce({ displayName: 'P2', totalWins: '5', roomWins: '0', joinLeaderboard: 'false', stats: '{}' });

      const result = await service.getLeaderboard();
      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('P1');
    });
  });

  describe('updateProfile', () => {
    it('updates display name and joinLeaderboard', async () => {
      await service.updateProfile('uid1', { displayName: 'NewName', joinLeaderboard: true });

      expect(redis.hset).toHaveBeenCalledWith('player:uid1', 'displayName', 'NewName');
      expect(redis.hset).toHaveBeenCalledWith('player:uid1', 'joinLeaderboard', 'true');
      expect(redis.zrem).not.toHaveBeenCalled();
    });

    it('clears stats and removes from leaderboard when opting out', async () => {
      await service.updateProfile('uid1', { displayName: 'Player1', joinLeaderboard: false });

      expect(redis.zrem).toHaveBeenCalledWith('leaderboard', 'uid1');
      expect(redis.hset).toHaveBeenCalledWith('player:uid1', 'totalWins', '0');
      expect(redis.hset).toHaveBeenCalledWith('player:uid1', 'roomWins', '0');
    });
  });

  describe('getAverageGuesses', () => {
    it('returns average guesses for a length', () => {
      const stats = { 4: { wins: 4, totalGuesses: 20 } };
      expect(service.getAverageGuesses(stats, 4)).toBe(5);
    });

    it('returns null when no wins for length', () => {
      const stats = { 4: { wins: 0, totalGuesses: 0 } };
      expect(service.getAverageGuesses(stats, 4)).toBeNull();
    });

    it('returns null for missing length', () => {
      expect(service.getAverageGuesses({}, 4)).toBeNull();
    });

    it('rounds to one decimal place', () => {
      const stats = { 4: { wins: 3, totalGuesses: 10 } };
      expect(service.getAverageGuesses(stats, 4)).toBe(3.3);
    });
  });
});
