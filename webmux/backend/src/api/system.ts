import { Router, Request, Response } from 'express';
import { resolveExecutable } from '../services/platform';

const router = Router();

// GET /api/system/capabilities — no auth required (read-only system info)
router.get('/capabilities', (_req: Request, res: Response) => {
  res.json({
    gsudo: !!resolveExecutable('gsudo', process.env, process.platform),
    bash:  !!resolveExecutable('bash',  process.env, process.platform),
  });
});

export default router;
