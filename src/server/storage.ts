import fs from 'fs';
import path from 'path';

export interface CompletedMatch {
  id: string;
  roomCode: string;
  gameName: string;
  playedAt: number;
  durationSeconds: number;
  winner: 'hunters' | 'crewmates';
  winReason: string;
  hunters: string[];
  crewmates: string[];
  catchesCount: number;
  catches: {
    hunterName: string;
    crewmateName: string;
    timestamp: number;
  }[];
}

export interface LeaderboardEntry {
  playerName: string;
  hunterWins: number;
  crewmateWins: number;
  totalCatches: number;
  matchesPlayed: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

export class GameStorage {
  private matches: CompletedMatch[] = [];
  private leaderboard: Record<string, LeaderboardEntry> = {};

  constructor() {
    this.ensureDataDir();
    this.loadData();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): void {
    try {
      if (fs.existsSync(MATCHES_FILE)) {
        this.matches = JSON.parse(fs.readFileSync(MATCHES_FILE, 'utf8'));
      }
    } catch (e) {
      console.error('[Storage] Error loading matches:', e);
      this.matches = [];
    }

    try {
      if (fs.existsSync(LEADERBOARD_FILE)) {
        this.leaderboard = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
      }
    } catch (e) {
      console.error('[Storage] Error loading leaderboard:', e);
      this.leaderboard = {};
    }
  }

  public recordMatch(match: CompletedMatch): void {
    this.matches.unshift(match);
    // Keep last 50 matches
    if (this.matches.length > 50) {
      this.matches = this.matches.slice(0, 50);
    }

    // Update leaderboard stats
    // Hunter stats
    for (const hName of match.hunters) {
      if (!this.leaderboard[hName]) {
        this.leaderboard[hName] = {
          playerName: hName,
          hunterWins: 0,
          crewmateWins: 0,
          totalCatches: 0,
          matchesPlayed: 0,
        };
      }
      this.leaderboard[hName].matchesPlayed++;
      if (match.winner === 'hunters') {
        this.leaderboard[hName].hunterWins++;
      }
    }

    // Crewmate stats
    for (const cName of match.crewmates) {
      if (!this.leaderboard[cName]) {
        this.leaderboard[cName] = {
          playerName: cName,
          hunterWins: 0,
          crewmateWins: 0,
          totalCatches: 0,
          matchesPlayed: 0,
        };
      }
      this.leaderboard[cName].matchesPlayed++;
      if (match.winner === 'crewmates') {
        this.leaderboard[cName].crewmateWins++;
      }
    }

    // Catches stats
    for (const c of match.catches) {
      if (this.leaderboard[c.hunterName]) {
        this.leaderboard[c.hunterName].totalCatches++;
      }
    }

    this.saveData();
  }

  public getMatches(): CompletedMatch[] {
    return this.matches;
  }

  public getLeaderboard(): LeaderboardEntry[] {
    return Object.values(this.leaderboard).sort(
      (a, b) => b.totalCatches * 2 + b.hunterWins + b.crewmateWins - (a.totalCatches * 2 + a.hunterWins + a.crewmateWins)
    );
  }

  private saveData(): void {
    try {
      this.ensureDataDir();
      fs.writeFileSync(MATCHES_FILE, JSON.stringify(this.matches, null, 2), 'utf8');
      fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(this.leaderboard, null, 2), 'utf8');
    } catch (e) {
      console.error('[Storage] Error saving data:', e);
    }
  }
}
