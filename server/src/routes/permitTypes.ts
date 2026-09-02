import { Router } from 'express';
import { query, queryOne } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const tenantId = req.user!.tenantId;
  try {
    const types = await query<any>(`
      SELECT pt.*,
        (SELECT COUNT(*)::int FROM applications a WHERE a.permit_type_id = pt.id) as application_count
      FROM permit_types pt
      WHERE pt.tenant_id = $1
      ORDER BY pt.name
    `, [tenantId]);
    res.json(types);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  try {
    const pt = await queryOne<any>(`SELECT * FROM permit_types WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]);
    if (!pt) return res.status(404).json({ error: 'Not found' });
    res.json(pt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireRole('admin', 'superadmin'), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { name, code, description, fee = 0, renewalPeriodDays, formSchema = [] } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'name and code required' });
  try {
    const pt = await queryOne<any>(`
      INSERT INTO permit_types (tenant_id, name, code, description, fee, renewal_period_days, form_schema)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [tenantId, name, code, description, fee, renewalPeriodDays, JSON.stringify(formSchema)]);
    res.status(201).json(pt);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Code already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', requireRole('admin', 'superadmin'), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { name, description, fee, renewalPeriodDays, formSchema, isActive } = req.body;
  try {
    const pt = await queryOne<any>(`
      UPDATE permit_types SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        fee = COALESCE($3, fee),
        renewal_period_days = COALESCE($4, renewal_period_days),
        form_schema = COALESCE($5, form_schema),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $7 AND tenant_id = $8
      RETURNING *
    `, [name, description, fee, renewalPeriodDays,
        formSchema ? JSON.stringify(formSchema) : null,
        isActive, req.params.id, tenantId]);
    if (!pt) return res.status(404).json({ error: 'Not found' });
    res.json(pt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
