import { Request, Response } from 'express';
import { z } from 'zod';
import * as matchService from '../services/matchService.js';import * as auditService from '../services/auditService.js';
import { broadcastMatchUpdate, broadcastTimerEvent } from '../sockets/socketHandler.js';

function paramToStr(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export async function listMatches(req: Request, res: Response): Promise<void> {
  try {
    const matches = await matchService.getAllMatches();
    res.json(matches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getActiveMatch(req: Request, res: Response): Promise<void> {
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
    res.json(match);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMatch(req: Request, res: Response): Promise<void> {
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

export async function createMatch(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      match_number: z.string().optional(),
      name: z.string().optional(),
      round: z.string().optional(),
      max_duration_seconds: z.number().positive().optional(),
      teams: z.array(z.object({
        slot: z.enum(['A', 'B', 'C', 'D']),
        name: z.string().min(1)
      })).optional()
    });

    const validated = schema.parse(req.body);
    const newMatch = await matchService.createMatch(validated);
    broadcastMatchUpdate(newMatch);
    res.status(201).json(newMatch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateMatchInfo(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      name: z.string().optional(),
      round: z.string().optional(),
      max_duration_seconds: z.number().positive().optional()
    });

    const validated = schema.parse(req.body);
    const updated = await matchService.updateMatchInfo(paramToStr(req.params.id), validated);
    broadcastMatchUpdate(updated);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateTeamName(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      name: z.string().min(1, 'Nama tim tidak boleh kosong').optional(),
      school_name: z.string().optional()
    });

    const { name, school_name } = schema.parse(req.body);
    const updated = await matchService.updateTeamInfo(
      paramToStr(req.params.id),
      paramToStr(req.params.teamId),
      {
        ...(name !== undefined ? { team_name: name } : {}),
        ...(school_name !== undefined ? { school_name } : {})
      }
    );
    broadcastMatchUpdate(updated);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function startMatch(req: Request, res: Response): Promise<void> {
  try {
    const match = await matchService.startMatch(paramToStr(req.params.id));
    broadcastTimerEvent(match.id, 'match:started', match);
    broadcastMatchUpdate(match);
    res.json(match);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function pauseMatch(req: Request, res: Response): Promise<void> {
  try {
    const match = await matchService.pauseMatch(paramToStr(req.params.id));
    broadcastTimerEvent(match.id, 'match:paused', match);
    broadcastMatchUpdate(match);
    res.json(match);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function resumeMatch(req: Request, res: Response): Promise<void> {
  try {
    const match = await matchService.resumeMatch(paramToStr(req.params.id));
    broadcastTimerEvent(match.id, 'match:resumed', match);
    broadcastMatchUpdate(match);
    res.json(match);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function endMatch(req: Request, res: Response): Promise<void> {
  try {
    const match = await matchService.endMatch(paramToStr(req.params.id), req.body.reason);
    broadcastTimerEvent(match.id, 'match:ended', match);
    broadcastMatchUpdate(match);
    res.json(match);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function resetMatch(req: Request, res: Response): Promise<void> {
  try {
    const match = await matchService.resetMatch(paramToStr(req.params.id));
    broadcastTimerEvent(match.id, 'match:reset', match);
    broadcastMatchUpdate(match);
    res.json(match);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function recordCheckpoint(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      team_id: z.string().min(1),
      checkpoint_number: z.number().int().min(1).max(4),
      recorded_by: z.string().optional()
    });

    const { team_id, checkpoint_number, recorded_by } = schema.parse(req.body);
    const result = await matchService.recordCheckpoint(
      paramToStr(req.params.id),
      team_id,
      checkpoint_number,
      recorded_by || 'Juri Operator'
    );

    broadcastMatchUpdate(result.match);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function verifyMatch(req: Request, res: Response): Promise<void> {
  try {
    const performedBy = req.body.performed_by || 'Juri Operator';
    const match = await matchService.verifyMatch(paramToStr(req.params.id), performedBy);
    broadcastTimerEvent(match.id, 'match:verified', match);
    broadcastMatchUpdate(match);
    res.json(match);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function correctCheckpoint(req: Request, res: Response): Promise<void> {
  try {
    const schema = z.object({
      checkpoint_id: z.string().min(1),
      new_elapsed_ms: z.number().min(0),
      reason: z.string().min(3, 'Alasan koreksi harus diisi minimal 3 karakter'),
      performed_by: z.string().optional()
    });

    const { checkpoint_id, new_elapsed_ms, reason, performed_by } = schema.parse(req.body);
    const match = await matchService.correctCheckpoint(
      paramToStr(req.params.id),
      checkpoint_id,
      new_elapsed_ms,
      reason,
      performed_by || 'Admin Juri'
    );

    broadcastMatchUpdate(match);
    res.json(match);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function nextMatch(req: Request, res: Response): Promise<void> {
  try {
    const currentMatch = await matchService.getMatchById(paramToStr(req.params.id));
    if (!currentMatch) {
      res.status(404).json({ error: 'Pertandingan aktif tidak ditemukan' });
      return;
    }

    // Check if there is already a subsequent match created
    const allMatches = await matchService.getAllMatches();
    const sorted = [...allMatches].sort((a, b) => a.match_number.localeCompare(b.match_number));
    const currentIndex = sorted.findIndex(m => m.id === currentMatch.id);

    let nextMatch = sorted[currentIndex + 1];

    if (!nextMatch) {
      // Create new match automatically
      const nextNumber = await matchService.generateNextMatchNumber();
      nextMatch = await matchService.createMatch({
        match_number: nextNumber,
        name: `Pertandingan ${nextNumber}`,
        round: currentMatch.round,
        max_duration_seconds: currentMatch.max_duration_seconds
      });
    }

    await matchService.setActiveMatchId(nextMatch.id);
    broadcastMatchUpdate(nextMatch);
    res.json(nextMatch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function setActiveMatch(req: Request, res: Response): Promise<void> {
  try {
    const match = await matchService.getMatchById(paramToStr(req.params.id));
    if (!match) {
      res.status(404).json({ error: 'Pertandingan tidak ditemukan' });
      return;
    }
    await matchService.setActiveMatchId(match.id);
    broadcastMatchUpdate(match);
    res.json({ success: true, active_match: match });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;
    const logs = await auditService.getRecentAuditLogs(paramToStr(req.params.id), limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
