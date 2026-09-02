import { Router } from 'express';
import { query, queryOne } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// List workflows
router.get('/', async (req, res) => {
  const tenantId = req.user!.tenantId;
  try {
    const workflows = await query<any>(`
      SELECT w.*, pt.name as permit_type_name,
        (SELECT COUNT(*)::int FROM workflow_stages ws WHERE ws.workflow_id = w.id) as stage_count
      FROM workflows w
      LEFT JOIN permit_types pt ON pt.id = w.permit_type_id
      WHERE w.tenant_id = $1
      ORDER BY w.name
    `, [tenantId]);
    res.json(workflows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single workflow with stages and transitions
router.get('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  try {
    const workflow = await queryOne<any>(`
      SELECT w.*, pt.name as permit_type_name
      FROM workflows w
      LEFT JOIN permit_types pt ON pt.id = w.permit_type_id
      WHERE w.id = $1 AND w.tenant_id = $2
    `, [req.params.id, tenantId]);

    if (!workflow) return res.status(404).json({ error: 'Not found' });

    const stages = await query<any>(`
      SELECT * FROM workflow_stages WHERE workflow_id = $1 ORDER BY stage_order
    `, [req.params.id]);

    const transitions = await query<any>(`
      SELECT wt.*, fs.name as from_stage_name, ts.name as to_stage_name
      FROM workflow_transitions wt
      LEFT JOIN workflow_stages fs ON fs.id = wt.from_stage_id
      LEFT JOIN workflow_stages ts ON ts.id = wt.to_stage_id
      WHERE wt.workflow_id = $1
    `, [req.params.id]);

    res.json({ ...workflow, stages, transitions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create workflow
router.post('/', requireRole('admin', 'superadmin'), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { name, description, permitTypeId, isDefault = false } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    const wf = await queryOne<any>(`
      INSERT INTO workflows (tenant_id, permit_type_id, name, description, is_default)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [tenantId, permitTypeId, name, description, isDefault]);
    res.status(201).json(wf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add stage
router.post('/:id/stages', requireRole('admin', 'superadmin'), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { name, description, stageOrder, color = '#6366f1', slaDays, requiredChecklist = [], autoAssignRole, isTerminal = false } = req.body;

  const wf = await queryOne<any>(`SELECT id FROM workflows WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  try {
    const stage = await queryOne<any>(`
      INSERT INTO workflow_stages (workflow_id, name, description, stage_order, color, sla_days, required_checklist, auto_assign_role, is_terminal)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [req.params.id, name, description, stageOrder, color, slaDays, JSON.stringify(requiredChecklist), autoAssignRole, isTerminal]);
    res.status(201).json(stage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update stage
router.patch('/:id/stages/:stageId', requireRole('admin', 'superadmin'), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { name, description, stageOrder, color, slaDays, requiredChecklist, autoAssignRole, isTerminal } = req.body;

  const wf = await queryOne<any>(`SELECT id FROM workflows WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  try {
    const stage = await queryOne<any>(`
      UPDATE workflow_stages SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        stage_order = COALESCE($3, stage_order),
        color = COALESCE($4, color),
        sla_days = COALESCE($5, sla_days),
        required_checklist = COALESCE($6, required_checklist),
        auto_assign_role = COALESCE($7, auto_assign_role),
        is_terminal = COALESCE($8, is_terminal)
      WHERE id = $9 AND workflow_id = $10
      RETURNING *
    `, [name, description, stageOrder, color, slaDays,
        requiredChecklist ? JSON.stringify(requiredChecklist) : null,
        autoAssignRole, isTerminal, req.params.stageId, req.params.id]);

    if (!stage) return res.status(404).json({ error: 'Stage not found' });
    res.json(stage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete stage
router.delete('/:id/stages/:stageId', requireRole('admin', 'superadmin'), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const wf = await queryOne<any>(`SELECT id FROM workflows WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  try {
    await query(`DELETE FROM workflow_stages WHERE id = $1 AND workflow_id = $2`, [req.params.stageId, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add transition
router.post('/:id/transitions', requireRole('admin', 'superadmin'), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { fromStageId, toStageId, label = 'Next Stage', conditions = [], requiresNote = false, allowedRoles = [] } = req.body;
  if (!toStageId) return res.status(400).json({ error: 'toStageId required' });

  const wf = await queryOne<any>(`SELECT id FROM workflows WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  try {
    const t = await queryOne<any>(`
      INSERT INTO workflow_transitions (workflow_id, from_stage_id, to_stage_id, label, conditions, requires_note, allowed_roles)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.params.id, fromStageId, toStageId, label, JSON.stringify(conditions), requiresNote, JSON.stringify(allowedRoles)]);
    res.status(201).json(t);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete transition
router.delete('/:id/transitions/:transitionId', requireRole('admin', 'superadmin'), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const wf = await queryOne<any>(`SELECT id FROM workflows WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  try {
    await query(`DELETE FROM workflow_transitions WHERE id = $1 AND workflow_id = $2`, [req.params.transitionId, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
