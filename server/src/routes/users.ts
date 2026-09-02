import { Router } from 'express';
import { query, queryOne } from '../db';
import { authenticate, requireRole } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const tenantId = req.user!.tenantId;
  try {
    const users = await query<any>(`
      SELECT id, email, first_name, last_name, role, is_active, created_at
      FROM users WHERE tenant_id = $1 ORDER BY last_name, first_name
    `, [tenantId]);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireRole('admin', 'superadmin'), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { email, password, firstName, lastName, role = 'staff' } = req.body;
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'email, password, firstName, lastName required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await queryOne<any>(`
      INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, email, first_name, last_name, role, is_active
    `, [tenantId, email, hash, firstName, lastName, role]);
    res.status(201).json(user);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', requireRole('admin', 'superadmin'), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { role, isActive } = req.body;
  try {
    const user = await queryOne<any>(`
      UPDATE users SET
        role = COALESCE($1, role),
        is_active = COALESCE($2, is_active),
        updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING id, email, first_name, last_name, role, is_active
    `, [role, isActive, req.params.id, tenantId]);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
