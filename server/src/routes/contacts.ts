import { Router } from 'express';
import { query, queryOne } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { search } = req.query;
  const params: any[] = [tenantId];
  let where = 'WHERE c.tenant_id = $1';
  if (search) {
    where += ` AND (c.first_name ILIKE $2 OR c.last_name ILIKE $2 OR c.email ILIKE $2)`;
    params.push(`%${search}%`);
  }
  try {
    const contacts = await query<any>(`
      SELECT c.*,
        (SELECT COUNT(*)::int FROM applications a WHERE a.applicant_contact_id = c.id) as application_count
      FROM contacts c ${where}
      ORDER BY c.last_name, c.first_name
      LIMIT 100
    `, params);
    res.json(contacts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  try {
    const contact = await queryOne<any>(`SELECT * FROM contacts WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]);
    if (!contact) return res.status(404).json({ error: 'Not found' });

    const applications = await query<any>(`
      SELECT a.id, a.application_number, a.status, pt.name as permit_type_name, ws.name as current_stage_name
      FROM applications a
      LEFT JOIN permit_types pt ON pt.id = a.permit_type_id
      LEFT JOIN workflow_stages ws ON ws.id = a.current_stage_id
      WHERE a.applicant_contact_id = $1
      ORDER BY a.created_at DESC
    `, [req.params.id]);

    const activities = await query<any>(`
      SELECT act.*, u.first_name || ' ' || u.last_name as user_name
      FROM activities act
      LEFT JOIN users u ON u.id = act.user_id
      WHERE act.contact_id = $1 OR act.application_id IN (
        SELECT id FROM applications WHERE applicant_contact_id = $1
      )
      ORDER BY act.created_at DESC
      LIMIT 50
    `, [req.params.id]);

    res.json({ ...contact, applications, activities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { firstName, lastName, email, phone, mobile, dateOfBirth, addressStreet, addressCity, addressState, addressZip, preferredContact, notes } = req.body;
  if (!firstName || !lastName) return res.status(400).json({ error: 'firstName and lastName required' });
  try {
    const contact = await queryOne<any>(`
      INSERT INTO contacts (tenant_id, first_name, last_name, email, phone, mobile, date_of_birth, address_street, address_city, address_state, address_zip, preferred_contact, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [tenantId, firstName, lastName, email, phone, mobile, dateOfBirth, addressStreet, addressCity, addressState, addressZip, preferredContact, notes]);
    res.status(201).json(contact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const fields: Record<string, string> = {
    firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone',
    mobile: 'mobile', dateOfBirth: 'date_of_birth', addressStreet: 'address_street',
    addressCity: 'address_city', addressState: 'address_state', addressZip: 'address_zip',
    preferredContact: 'preferred_contact', notes: 'notes'
  };
  const updates: string[] = [];
  const params: any[] = [];
  let p = 1;
  for (const [key, col] of Object.entries(fields)) {
    if (key in req.body) { updates.push(`${col} = $${p++}`); params.push(req.body[key]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  updates.push(`updated_at = NOW()`);
  params.push(req.params.id, tenantId);
  try {
    const contact = await queryOne<any>(`
      UPDATE contacts SET ${updates.join(', ')} WHERE id = $${p} AND tenant_id = $${p + 1} RETURNING *
    `, params);
    if (!contact) return res.status(404).json({ error: 'Not found' });
    res.json(contact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/activities', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { activityType = 'note', subject, body } = req.body;
  try {
    const act = await queryOne<any>(`
      INSERT INTO activities (tenant_id, contact_id, user_id, activity_type, subject, body)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [tenantId, req.params.id, req.user!.id, activityType, subject, body]);
    res.status(201).json(act);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
