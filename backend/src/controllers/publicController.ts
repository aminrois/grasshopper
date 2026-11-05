import { Request, Response } from 'express';
import * as matchService from '../services/matchService.js';
import { getDatabase } from '../db/database.js';

function paramToStr(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export async function getCurrentPublicMatch(req: Request, res: Response): Promise<void> {
  try {
    const activeId = await matchService.getActiveMatchId();
    if (!activeId) {
      res.status(404).json({ error: 'Tidak ada pertandingan aktif' });
      return;
    }

    const match = await matchService.getMatchById(activeId);
    if (!match) {
      res.status(404).json({ error: 'Pertandingan aktif tidak ditemukan' });
      return;
    }

    // Public sanitized payload
    res.json(match);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getPublicMatchById(req: Request, res: Response): Promise<void> {
  try {
    const match = await matchService.getMatchById(paramToStr(req.params.id));
    if (!match) {
      res.status(404).json({ error: 'Pertandingan tidak ditemukan' });
      return;
    }
    res.json(match);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getSystemInfo(req: Request, res: Response): Promise<void> {
  try {
    const db = getDatabase();
    const rows = await db.query<{ key: string; value: string }>(`SELECT key, value FROM system_settings`);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json({
      competition_name: settings.competition_name || 'Robotik Grasshopper Competition',
      organizer_name: settings.organizer_name || 'Maskumambang Fest 4',
      default_duration_seconds: parseInt(settings.default_duration_seconds || '120', 10)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
