import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body as Record<string, string>;

    if (!name?.trim() || !phone?.trim() || !password?.trim()) {
      res.status(400).json({ error: 'name, phone and password are required' });
      return;
    }

    const existing = await User.findOne({ phone: phone.trim() });
    if (existing) {
      res.status(409).json({ error: 'Phone number already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), phone: phone.trim(), passwordHash });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '30d',
    });

    res.status(201).json({ id: user.id, name: user.name, phone: user.phone, token });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body as Record<string, string>;

    if (!phone?.trim() || !password?.trim()) {
      res.status(400).json({ error: 'phone and password are required' });
      return;
    }

    const user = await User.findOne({ phone: phone.trim() });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '30d',
    });

    res.json({ id: user.id, name: user.name, phone: user.phone, token });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update FCM push token (called after app gets a new FCM token)
router.post('/fcm-token', async (req, res) => {
  try {
    const { userId, fcmToken } = req.body as Record<string, string>;
    if (!userId || !fcmToken) {
      res.status(400).json({ error: 'userId and fcmToken required' });
      return;
    }
    await User.findByIdAndUpdate(userId, { fcmToken });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
