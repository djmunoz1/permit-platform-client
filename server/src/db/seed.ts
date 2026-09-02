import { pool } from './index';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tenant
    const tenantRes = await client.query(`
      INSERT INTO tenants (name, slug, config)
      VALUES ('California ABC', 'ca-abc', '{"primary_color":"#1d4ed8","logo_url":null}')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const tenantId = tenantRes.rows[0].id;

    // Admin user
    const hash = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
      VALUES ($1, 'admin@ca-abc.gov', $2, 'Eric', 'Keipper', 'admin')
      ON CONFLICT (tenant_id, email) DO NOTHING
    `, [tenantId, hash]);

    await client.query(`
      INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
      VALUES ($1, 'staff@ca-abc.gov', $2, 'Jane', 'Smith', 'staff')
      ON CONFLICT (tenant_id, email) DO NOTHING
    `, [tenantId, hash]);

    // Permit types
    const ptRes = await client.query(`
      INSERT INTO permit_types (tenant_id, name, code, description, fee, renewal_period_days, form_schema)
      VALUES
        ($1, 'Beer Manufacturer', 'BEER-MFG', 'License to manufacture beer', 1500.00, 365,
          '[{"key":"type_of_business","label":"Type of Business","type":"text"},
            {"key":"food_service","label":"Food Service","type":"boolean"},
            {"key":"entertainment","label":"Entertainment Options","type":"text"},
            {"key":"hire_general_manager","label":"Hire General Manager","type":"boolean"},
            {"key":"food_license","label":"Have Food License","type":"boolean"}]'
        ),
        ($1, 'Wine Retailer', 'WINE-RETAIL', 'License to sell wine at retail', 500.00, 365, '[]'),
        ($1, 'Spirits Distributor', 'SPIRITS-DIST', 'License to distribute spirits', 2500.00, 365, '[]')
      ON CONFLICT (tenant_id, code) DO NOTHING
      RETURNING id, code
    `, [tenantId]);

    const beerTypeId = ptRes.rows.find(r => r.code === 'BEER-MFG')?.id;

    if (beerTypeId) {
      // Workflow
      const wfRes = await client.query(`
        INSERT INTO workflows (tenant_id, permit_type_id, name, is_default)
        VALUES ($1, $2, 'Standard License Application', true)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [tenantId, beerTypeId]);

      if (wfRes.rows.length > 0) {
        const workflowId = wfRes.rows[0].id;

        const stages = [
          { name: 'Application Received', order: 1, color: '#6b7280', sla: 2 },
          { name: 'Initial Review', order: 2, color: '#f59e0b', sla: 5 },
          { name: 'Investigation', order: 3, color: '#3b82f6', sla: 14 },
          { name: 'Division Office Review', order: 4, color: '#8b5cf6', sla: 7 },
          { name: 'Judicial Review', order: 5, color: '#ef4444', sla: 10 },
          { name: 'Final Review', order: 6, color: '#10b981', sla: 5 },
          { name: 'Issue License', order: 7, color: '#059669', sla: 2, terminal: true },
        ];

        const stageIds: string[] = [];
        for (const s of stages) {
          const sRes = await client.query(`
            INSERT INTO workflow_stages (workflow_id, name, stage_order, color, sla_days, is_terminal)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `, [workflowId, s.name, s.order, s.color, s.sla, s.terminal ?? false]);
          stageIds.push(sRes.rows[0].id);
        }

        // Transitions: each stage goes to the next
        for (let i = 0; i < stageIds.length - 1; i++) {
          await client.query(`
            INSERT INTO workflow_transitions (workflow_id, from_stage_id, to_stage_id, label)
            VALUES ($1, $2, $3, 'Next Stage')
          `, [workflowId, stageIds[i], stageIds[i + 1]]);
          if (i > 0) {
            // Allow sending back to previous
            await client.query(`
              INSERT INTO workflow_transitions (workflow_id, from_stage_id, to_stage_id, label)
              VALUES ($1, $2, $3, 'Return to Previous')
            `, [workflowId, stageIds[i], stageIds[i - 1]]);
          }
        }

        // Sample contact
        const contactRes = await client.query(`
          INSERT INTO contacts (tenant_id, first_name, last_name, email, phone, address_street, address_city, address_state, address_zip)
          VALUES ($1, 'Mary', 'Gomez', 'mary.gomez@acmecorp.com', '916-555-0100', '731 K Street', 'Sacramento', 'CA', '95814')
          RETURNING id
        `, [tenantId]);
        const contactId = contactRes.rows[0].id;

        // Sample entity
        const entityRes = await client.query(`
          INSERT INTO entities (tenant_id, name, dba, entity_type, address_street, address_city, address_state, address_zip)
          VALUES ($1, 'Acme Corp', 'Bay Center', 'LLC', '100 Main St', 'Sacramento', 'CA', '95814')
          RETURNING id
        `, [tenantId]);
        const entityId = entityRes.rows[0].id;

        // Sample location
        const locationRes = await client.query(`
          INSERT INTO locations (tenant_id, entity_id, name, address_street, address_city, address_state, address_zip)
          VALUES ($1, $2, 'PALMS THE', '500 Palms Ave', 'Sacramento', 'CA', '95822')
          RETURNING id
        `, [tenantId, entityId]);
        const locationId = locationRes.rows[0].id;

        // Sample application
        const userRes = await client.query(`SELECT id FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1`, [tenantId]);
        const userId = userRes.rows[0]?.id;

        await client.query(`
          INSERT INTO applications (
            tenant_id, application_number, permit_type_id, workflow_id, current_stage_id,
            status, transaction_type, applicant_contact_id, entity_id, location_id,
            assigned_to, form_data, checklist, fee_amount, fee_paid, submitted_at
          )
          VALUES (
            $1, 'APL-0000001056', $2, $3, $4,
            'active', 'original', $5, $6, $7,
            $8,
            '{"type_of_business":"Beer Manufacturer","food_service":false,"entertainment":null,"hire_general_manager":false,"food_license":false}',
            '{"payment_received":true,"documents_approved":true,"inspection_complete":false,"background_check":true}',
            1500.00, true, NOW()
          )
          ON CONFLICT DO NOTHING
        `, [tenantId, beerTypeId, workflowId, stageIds[3], contactId, entityId, locationId, userId]);
      }
    }

    await client.query('COMMIT');
    console.log('Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
