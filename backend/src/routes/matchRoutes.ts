import { Router } from 'express';
import * as matchController from '../controllers/matchController.js';
import * as trialService from '../services/trialService.js';

const router = Router();

// Trial Run (Percobaan Arena) Routes
router.get('/trial/status', (req, res) => {
  res.json(trialService.getTrialStatus());
});

router.post('/trial/start', async (req, res) => {
  try {
    const duration = req.body.duration_seconds ? parseInt(req.body.duration_seconds, 10) : 30;
    const status = await trialService.startTrial(duration);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trial/stop', async (req, res) => {
  try {
    const status = await trialService.stopTrial();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// System Settings & Factory Reset (PIN Protected)
router.post('/system/reset-all', matchController.resetAllSystem);
router.post('/system/settings', matchController.saveSystemSettings);

// Matches CRUD & Lookup
router.get('/', matchController.listMatches);
router.post('/', matchController.createMatch);
router.get('/active', matchController.getActiveMatch);
router.get('/:id', matchController.getMatch);
router.patch('/:id', matchController.updateMatchInfo);
router.patch('/:id/teams/:teamId', matchController.updateTeamName);

// Timer Actions
router.post('/:id/start', matchController.startMatch);
router.post('/:id/pause', matchController.pauseMatch);
router.post('/:id/resume', matchController.resumeMatch);
router.post('/:id/end', matchController.endMatch);
router.post('/:id/reset', matchController.resetMatch);

// Checkpoints
router.post('/:id/checkpoints', matchController.recordCheckpoint);
router.post('/:id/correct-checkpoint', matchController.correctCheckpoint);
router.post('/:id/teams/:teamId/cancel-last-checkpoint', matchController.cancelLastCheckpoint);

// Match flow
router.post('/:id/verify', matchController.verifyMatch);
router.post('/:id/next', matchController.nextMatch);
router.post('/:id/set-active', matchController.setActiveMatch);

// Logs
router.get('/:id/audit-logs', matchController.getAuditLogs);

export default router;

