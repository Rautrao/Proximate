import { Router } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { SOSIncident } from '../models/SOSIncident';

const router = Router();
router.use(authMiddleware);

// Active SOS incident for the authenticated user
router.get('/active', async (req: AuthRequest, res) => {
  try {
    const incident = await SOSIncident.findOne({
      userId: req.userId,
      status: 'active',
    });
    res.json(incident ?? null);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Last 10 incidents (incident history / evidence trail)
router.get('/history', async (req: AuthRequest, res) => {
  try {
    const incidents = await SOSIncident.find({ userId: req.userId })
      .sort({ startedAt: -1 })
      .limit(10)
      .select('status currentTier startedAt endedAt escalationLog');
    res.json(incidents);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Full incident detail (forensic report)
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const incident = await SOSIncident.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).populate('responders.userId', 'name phone');
    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    res.json(incident);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
