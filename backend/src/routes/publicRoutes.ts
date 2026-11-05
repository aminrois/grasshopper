import { Router } from 'express';
import * as publicController from '../controllers/publicController.js';

const router = Router();

router.get('/current-match', publicController.getCurrentPublicMatch);
router.get('/matches/:id', publicController.getPublicMatchById);
router.get('/system-info', publicController.getSystemInfo);

export default router;

