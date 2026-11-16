import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
const router = Router();
const registerSchema = z.object({ name: z.string().min(2).max(80), email: z.string().email(), password: z.string().min(8), role: z.enum(['customer', 'host']).optional() });
const tokenFor = user => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
const safeUser = user => ({ id: user._id, name: user.name, email: user.email, role: user.role, kycStatus: user.kycStatus });
router.post('/register', async (req, res, next) => { try {
  const data = registerSchema.parse(req.body); const email = data.email.toLowerCase();
  if (await User.exists({ email })) return res.status(409).json({ message: 'Email is already registered' });
  const user = await User.create({ ...data, email, password: await bcrypt.hash(data.password, 12) });
  res.status(201).json({ token: tokenFor(user), user: safeUser(user) });
} catch (e) { next(e); } });
router.post('/login', async (req, res, next) => { try {
  const email = String(req.body.email || '').toLowerCase(); const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password))) return res.status(401).json({ message: 'Invalid email or password' });
  if (!user.isActive) return res.status(403).json({ message: 'Account is disabled' });
  res.json({ token: tokenFor(user), user: safeUser(user) });
} catch (e) { next(e); } });
router.get('/me', protect, (req, res) => res.json({ user: safeUser(req.user) }));
export default router;
