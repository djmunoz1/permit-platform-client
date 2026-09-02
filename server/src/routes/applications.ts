import { Router } from 'express';
import { query, queryOne } from '../db';
import { authenticate } from '../middleware/auth';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

// List applications with filters
router.get('/', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { status, permitTypeId, assignedTo, search, page = '1', limit = '25' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const conditions: string[] = ['a.tenant_id = $1'];
  const params: any[] = [tenantId];
  let p = 2;

  if (status) { conditions.push(`a.status = $${p++}`); params.push(status); }
  if (permitTypeId) { conditions.push(`a.permit_type_id = $${p++}`); params.push(permitTypeId); }
  if (assignedTo) { conditions.push(`a.assigned_to = $${p++}`); params.push(assignedTo); }
  if (search) {
    conditions.push(`(a.application_number ILIKE $${p} OR c.first_name ILIKE $${p} OR c.last_name ILIKE $${p} OR e.name ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }

  const where = conditions.join(' AND ');

  try {
    const rows = await query<any>(`
      SELECT
        a.id, a.application_number, a.status, a.transaction_type,
        a.created_at, a.updated_at, a.submitted_at, a.fee_paid,
        pt.name as permit_type_name, pt.code as permit_type_code,
        ws.name as current_stage_name, ws.color as current_stage_color,
        c.first_name || ' ' || c.last_name as applicant_name,
        e.name as entity_name,
        u.first_name || ' ' || u.last_name as assigned_to_name
      FROM applications a
      LEFT JOIN permit_types pt ON pt.id = a.permit_type_id
      LEFT JOIN workflow_stages ws ON ws.id = a.current_stage_id
      LEFT JOIN contacts c ON c.id = a.applicant_contact_id
      LEFT JOIN entities e ON e.id = a.entity_id
      LEFT JOIN users u ON u.id = a.assigned_to
      WHERE ${where}
      ORDER BY a.updated_at DESC
      LIMIT $${p} OFFSET $${p + 1}
    `, [...params, parseInt(limit as string), offset]);

    const countResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*)::text as count
      FROM applications a
      LEFT JOIN contacts c ON c.id = a.applicant_contact_id
      LEFT JOIN entities e ON e.id = a.entity_id
      WHERE ${where}
    `, params);

    res.json({ data: rows, total: parseInt(countResult?.count ?? '0'), page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single application
router.get('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  try {
    const app = await queryOne<any>(`
      SELECT
        a.*,
        pt.name as permit_type_name, pt.code as permit_type_code, pt.form_schema,
        ws.name as current_stage_name, ws.color as current_stage_color, ws.stage_order as current_stage_order,
        w.id as workflow_id, w.name as workflow_name,
        c.first_name as applicant_first, c.last_name as applicant_last,
        c.email as applicant_email, c.phone as applicant_phone,
        e.name as entity_name, e.entity_type,
        l.name as location_name, l.address_street, l.address_city, l.address_state, l.address_zip,
        u.first_name || ' ' || u.last_name as assigned_to_name
      FROM applications a
      LEFT JOIN permit_types pt ON pt.id = a.permit_type_id
      LEFT JOIN workflows w ON w.id = a.workflow_id
      LEFT JOIN workflow_stages ws ON ws.id = a.current_stage_id
      LEFT JOIN contacts c ON c.id = a.applicant_contact_id
      LEFT JOIN entities e ON e.id = a.entity_id
      LEFT JOIN locations l ON l.id = a.location_id
      LEFT JOIN users u ON u.id = a.assigned_to
      WHERE a.id = $1 AND a.tenant_id = $2
    `, [req.params.id, tenantId]);

    if (!app) return res.status(404).json({ error: 'Not found' });

    // Load workflow stages
    const stages = await query<any>(`
      SELECT ws.*,
        (SELECT json_agg(wt.*) FROM workflow_transitions wt WHERE wt.from_stage_id = ws.id AND wt.workflow_id = $2) as transitions
      FROM workflow_stages ws
      WHERE ws.workflow_id = $1
      ORDER BY ws.stage_order
    `, [app.workflow_id, app.workflow_id]);

    // Load background checks
    const backgroundChecks = await query<any>(`
      SELECT bc.*, c.first_name || ' ' || c.last_name as contact_name
      FROM background_checks bc
      LEFT JOIN contacts c ON c.id = bc.contact_id
      WHERE bc.application_id = $1
      ORDER BY bc.created_at DESC
    `, [req.params.id]);

    // Load inspections
    const inspections = await query<any>(`
      SELECT i.*,
        u.first_name || ' ' || u.last_name as inspector_name,
        l.name as facility_name,
        c.first_name || ' ' || c.last_name as contact_name
      FROM inspections i
      LEFT JOIN users u ON u.id = i.inspector_id
      LEFT JOIN locations l ON l.id = i.location_id
      LEFT JOIN contacts c ON c.id = i.contact_id
      WHERE i.application_id = $1
      ORDER BY i.created_at DESC
    `, [req.params.id]);

    // Load documents
    const documents = await query<any>(`
      SELECT d.*, u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON u.id = d.uploaded_by
      WHERE d.application_id = $1
      ORDER BY d.created_at DESC
    `, [req.params.id]);

    // Load activities
    const activities = await query<any>(`
      SELECT act.*, u.first_name || ' ' || u.last_name as user_name, u.email as user_email
      FROM activities act
      LEFT JOIN users u ON u.id = act.user_id
      WHERE act.application_id = $1
      ORDER BY act.created_at DESC
      LIMIT 50
    `, [req.params.id]);

    // Load stage history
    const stageHistory = await query<any>(`
      SELECT ash.*,
        fs.name as from_stage_name, ts.name as to_stage_name,
        u.first_name || ' ' || u.last_name as transitioned_by_name
      FROM application_stage_history ash
      LEFT JOIN workflow_stages fs ON fs.id = ash.from_stage_id
      LEFT JOIN workflow_stages ts ON ts.id = ash.to_stage_id
      LEFT JOIN users u ON u.id = ash.transitioned_by
      WHERE ash.application_id = $1
      ORDER BY ash.created_at DESC
    `, [req.params.id]);

    res.json({ ...app, stages, backgroundChecks, inspections, documents, activities, stageHistory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create application
router.post('/', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { permitTypeId, workflowId, transactionType = 'original', applicantContactId, entityId, locationId, formData = {}, feeAmount } = req.body;

  if (!permitTypeId || !workflowId) {
    return res.status(400).json({ error: 'permitTypeId and workflowId required' });
  }

  try {
    // Get first stage
    const firstStage = await queryOne<any>(`
      SELECT id FROM workflow_stages WHERE workflow_id = $1 ORDER BY stage_order LIMIT 1
    `, [workflowId]);

    // Generate application number
    const count = await queryOne<{ count: string }>(`SELECT COUNT(*)::text as count FROM applications WHERE tenant_id = $1`, [tenantId]);
    const num = String(parseInt(count?.count ?? '0') + 1).padStart(10, '0');
    const applicationNumber = `APL-${num}`;

    const app = await queryOne<any>(`
      INSERT INTO applications (
        tenant_id, application_number, permit_type_id, workflow_id, current_stage_id,
        status, transaction_type, applicant_contact_id, entity_id, location_id,
        assigned_to, form_data, fee_amount, submitted_at
      )
      VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *
    `, [tenantId, applicationNumber, permitTypeId, workflowId, firstStage?.id,
        transactionType, applicantContactId, entityId, locationId,
        req.user!.id, JSON.stringify(formData), feeAmount]);

    // Log activity
    await query(`
      INSERT INTO activities (tenant_id, application_id, user_id, activity_type, subject)
      VALUES ($1, $2, $3, 'system', 'Application created')
    `, [tenantId, app!.id, req.user!.id]);

    res.status(201).json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update application
router.patch('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const allowed = ['formData', 'checklist', 'notes', 'assignedTo', 'locationId', 'entityId', 'applicantContactId', 'feeAmount', 'feePaid'];
  const updates: string[] = [];
  const params: any[] = [];
  let p = 1;

  for (const [key, val] of Object.entries(req.body)) {
    if (!allowed.includes(key)) continue;
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (key === 'formData' || key === 'checklist') {
      updates.push(`${col} = $${p++}`);
      params.push(JSON.stringify(val));
    } else {
      updates.push(`${col} = $${p++}`);
      params.push(val);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  updates.push(`updated_at = NOW()`);
  params.push(req.params.id, tenantId);

  try {
    const app = await queryOne<any>(`
      UPDATE applications SET ${updates.join(', ')}
      WHERE id = $${p} AND tenant_id = $${p + 1}
      RETURNING *
    `, params);

    if (!app) return res.status(404).json({ error: 'Not found' });
    res.json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Transition stage
router.post('/:id/transition', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { toStageId, transitionId, note } = req.body;

  if (!toStageId) return res.status(400).json({ error: 'toStageId required' });

  try {
    const app = await queryOne<any>(`SELECT * FROM applications WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]);
    if (!app) return res.status(404).json({ error: 'Not found' });

    const toStage = await queryOne<any>(`SELECT * FROM workflow_stages WHERE id = $1`, [toStageId]);
    if (!toStage) return res.status(400).json({ error: 'Invalid stage' });

    // Log history
    await query(`
      INSERT INTO application_stage_history (application_id, from_stage_id, to_stage_id, transitioned_by, note)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.params.id, app.current_stage_id, toStageId, req.user!.id, note]);

    // Update application
    const newStatus = toStage.is_terminal ? 'approved' : 'active';
    const updated = await queryOne<any>(`
      UPDATE applications SET current_stage_id = $1, status = $2, updated_at = NOW()
      ${toStage.is_terminal ? ', approved_at = NOW()' : ''}
      WHERE id = $3 RETURNING *
    `, [toStageId, newStatus, req.params.id]);

    // Log activity
    await query(`
      INSERT INTO activities (tenant_id, application_id, user_id, activity_type, subject, body)
      VALUES ($1, $2, $3, 'stage_change', $4, $5)
    `, [tenantId, req.params.id, req.user!.id, `Moved to ${toStage.name}`, note ?? null]);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add activity / note
router.post('/:id/activities', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { activityType = 'note', subject, body, direction } = req.body;

  try {
    const act = await queryOne<any>(`
      INSERT INTO activities (tenant_id, application_id, user_id, activity_type, subject, body, direction)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [tenantId, req.params.id, req.user!.id, activityType, subject, body, direction]);

    res.status(201).json(act);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
