import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password, tenantSlug } = req.body;
  if (!email || !password || !tenantSlug) {
    return res.status(400).json({ error: 'email, password, and tenantSlug required' });
  }

  try {
    const user = await queryOne<any>(`
      SELECT u.*, t.slug as tenant_slug, t.name as tenant_name, t.config as tenant_config
      FROM users u
      JOIN tenants t ON t.id = u.tenant_id
      WHERE u.email = $1 AND t.slug = $2 AND u.is_active = true
    `, [email, tenantSlug]);

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '8h' });

    res.json({
      token,
      user: payload,
      tenant: { slug: user.tenant_slug, name: user.tenant_name, config: user.tenant_config },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;
