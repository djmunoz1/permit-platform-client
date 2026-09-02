import { Router } from 'express';
import { query, queryOne } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { applicationId, status, inspectorId } = req.query;
  const conditions = ['i.tenant_id = $1'];
  const params: any[] = [tenantId];
  let p = 2;
  if (applicationId) { conditions.push(`i.application_id = $${p++}`); params.push(applicationId); }
  if (status) { conditions.push(`i.status = $${p++}`); params.push(status); }
  if (inspectorId) { conditions.push(`i.inspector_id = $${p++}`); params.push(inspectorId); }
  try {
    const rows = await query<any>(`
      SELECT i.*,
        u.first_name || ' ' || u.last_name as inspector_name,
        a.application_number,
        l.name as facility_name
      FROM inspections i
      LEFT JOIN users u ON u.id = i.inspector_id
      LEFT JOIN applications a ON a.id = i.application_id
      LEFT JOIN locations l ON l.id = i.location_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY i.created_at DESC
    `, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { applicationId, locationId, inspectorId, contactId, inspectionType, scheduledAt } = req.body;
  try {
    const insp = await queryOne<any>(`
      INSERT INTO inspections (tenant_id, application_id, location_id, inspector_id, contact_id, inspection_type, scheduled_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [tenantId, applicationId, locationId, inspectorId, contactId, inspectionType, scheduledAt]);
    res.status(201).json(insp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { status, passed, notes, findings, completedAt } = req.body;
  try {
    const insp = await queryOne<any>(`
      UPDATE inspections SET
        status = COALESCE($1, status),
        passed = COALESCE($2, passed),
        notes = COALESCE($3, notes),
        findings = COALESCE($4, findings),
        completed_at = COALESCE($5, completed_at),
        updated_at = NOW()
      WHERE id = $6 AND tenant_id = $7
      RETURNING *
    `, [status, passed, notes, findings ? JSON.stringify(findings) : null, completedAt, req.params.id, tenantId]);
    if (!insp) return res.status(404).json({ error: 'Not found' });
    res.json(insp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
