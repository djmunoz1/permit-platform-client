export const MOCK_USER = {
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'admin@ca-abc.gov',
  role: 'admin',
  firstName: 'Eric',
  lastName: 'Keipper',
};

export const MOCK_TENANT = {
  slug: 'ca-abc',
  name: 'California ABC',
  config: { primary_color: '#1d4ed8' },
};

const STAGES = [
  { id: 's1', name: 'Application Received', stage_order: 1, color: '#6b7280', sla_days: 2, is_terminal: false, workflow_id: 'wf-1', transitions: [{ id: 't1', label: 'Next Stage', from_stage_id: 's1', to_stage_id: 's2' }] },
  { id: 's2', name: 'Initial Review',       stage_order: 2, color: '#f59e0b', sla_days: 5, is_terminal: false, workflow_id: 'wf-1', transitions: [{ id: 't2', label: 'Next Stage', from_stage_id: 's2', to_stage_id: 's3' }, { id: 't3', label: 'Return to Previous', from_stage_id: 's2', to_stage_id: 's1' }] },
  { id: 's3', name: 'Investigation',        stage_order: 3, color: '#3b82f6', sla_days: 14, is_terminal: false, workflow_id: 'wf-1', transitions: [{ id: 't4', label: 'Next Stage', from_stage_id: 's3', to_stage_id: 's4' }] },
  { id: 's4', name: 'Division Office Review', stage_order: 4, color: '#8b5cf6', sla_days: 7, is_terminal: false, workflow_id: 'wf-1', transitions: [{ id: 't5', label: 'Next Stage', from_stage_id: 's4', to_stage_id: 's5' }] },
  { id: 's5', name: 'Judicial Review',      stage_order: 5, color: '#ef4444', sla_days: 10, is_terminal: false, workflow_id: 'wf-1', transitions: [{ id: 't6', label: 'Next Stage', from_stage_id: 's5', to_stage_id: 's6' }] },
  { id: 's6', name: 'Final Review',         stage_order: 6, color: '#10b981', sla_days: 5, is_terminal: false, workflow_id: 'wf-1', transitions: [{ id: 't7', label: 'Issue License', from_stage_id: 's6', to_stage_id: 's7' }] },
  { id: 's7', name: 'Issue License',        stage_order: 7, color: '#059669', sla_days: 2, is_terminal: true, workflow_id: 'wf-1', transitions: [] },
];

export const MOCK_APPLICATIONS = [
  {
    id: 'app-1', application_number: 'APL-0000001056', status: 'active', transaction_type: 'original',
    permit_type_name: 'Beer Manufacturer', permit_type_code: 'BEER-MFG',
    current_stage_id: 's4', current_stage_name: 'Division Office Review', current_stage_color: '#8b5cf6',
    applicant_name: 'Mary Gomez', entity_name: 'Acme Corp', assigned_to_name: 'Eric Keipper',
    applicant_first: 'Mary', applicant_last: 'Gomez', applicant_email: 'mary.gomez@acmecorp.com', applicant_phone: '916-555-0100',
    entity_type: 'LLC', location_name: 'PALMS THE',
    address_street: '500 Palms Ave', address_city: 'Sacramento', address_state: 'CA', address_zip: '95822',
    fee_amount: 1500, fee_paid: true, workflow_id: 'wf-1', workflow_name: 'Standard License Application',
    submitted_at: '2026-07-15T10:00:00Z', created_at: '2026-07-15T10:00:00Z', updated_at: '2026-07-28T14:00:00Z',
    form_schema: [
      { key: 'type_of_business', label: 'Type of Business', type: 'text' },
      { key: 'food_service', label: 'Food Service', type: 'boolean' },
      { key: 'entertainment', label: 'Entertainment Options', type: 'text' },
      { key: 'hire_general_manager', label: 'Hire General Manager', type: 'boolean' },
      { key: 'food_license', label: 'Have Food License', type: 'boolean' },
    ],
    form_data: { type_of_business: 'Beer Manufacturer', food_service: 'No', entertainment: '---', hire_general_manager: 'No', food_license: 'No' },
    checklist: { payment_received: true, documents_approved: true, inspection_complete: false, background_check: true },
    stages: STAGES,
    backgroundChecks: [],
    inspections: [],
    documents: [],
    activities: [
      { id: 'act-1', activity_type: 'portal_comment', subject: 'Application Approval', body: 'Dear Mary, Congratulations! Your application for Beer Manufacturer has been approved. Please log in to the portal to complete next steps.', user_name: 'Eric Keipper', is_closed: false, direction: 'outbound', created_at: '2026-07-28T15:17:00Z' },
      { id: 'act-2', activity_type: 'email', subject: 'Investigation Results CRM-0297001', body: 'Your application has been reviewed and your background investigation was complete with no issues found.', user_name: 'Eric Keipper', is_closed: true, direction: 'outbound', created_at: '2026-07-28T20:00:00Z' },
      { id: 'act-3', activity_type: 'portal_comment', subject: 'Birth Certificate', body: 'Your birth certificate was not legible. Please attach a new image of it.', user_name: 'Eric Keipper', is_closed: true, direction: 'outbound', created_at: '2026-07-28T14:42:00Z' },
      { id: 'act-4', activity_type: 'system', subject: 'Application created', body: null, user_name: 'Mary Gomez', is_closed: true, direction: null, created_at: '2026-07-15T13:05:00Z' },
    ],
    stageHistory: [
      { id: 'sh-1', from_stage_name: 'Initial Review', to_stage_name: 'Investigation', transitioned_by_name: 'Eric Keipper', note: null, created_at: '2026-07-18T09:00:00Z' },
      { id: 'sh-2', from_stage_name: 'Application Received', to_stage_name: 'Initial Review', transitioned_by_name: 'Eric Keipper', note: null, created_at: '2026-07-16T11:00:00Z' },
    ],
  },
  {
    id: 'app-2', application_number: 'APL-0000001050', status: 'active', transaction_type: 'renewal',
    permit_type_name: 'Wine Retailer', permit_type_code: 'WINE-RETAIL',
    current_stage_id: 's2', current_stage_name: 'Initial Review', current_stage_color: '#f59e0b',
    applicant_name: 'James Park', entity_name: 'Bay Wines LLC', assigned_to_name: 'Jane Smith',
    updated_at: '2026-07-30T09:00:00Z', created_at: '2026-07-20T09:00:00Z',
    fee_amount: 500, fee_paid: false,
    stages: STAGES, backgroundChecks: [], inspections: [], documents: [], activities: [], stageHistory: [],
    form_schema: [], form_data: {}, checklist: {},
  },
  {
    id: 'app-3', application_number: 'APL-0000001001', status: 'approved', transaction_type: 'original',
    permit_type_name: 'Spirits Distributor', permit_type_code: 'SPIRITS-DIST',
    current_stage_id: 's7', current_stage_name: 'Issue License', current_stage_color: '#059669',
    applicant_name: 'Sandra Lee', entity_name: 'Golden State Spirits', assigned_to_name: 'Eric Keipper',
    updated_at: '2026-07-01T09:00:00Z', created_at: '2026-06-01T09:00:00Z',
    fee_amount: 2500, fee_paid: true,
    stages: STAGES, backgroundChecks: [], inspections: [], documents: [], activities: [], stageHistory: [],
    form_schema: [], form_data: {}, checklist: {},
  },
];

export const MOCK_CONTACTS = [
  { id: 'c-1', first_name: 'Mary', last_name: 'Gomez', email: 'mary.gomez@acmecorp.com', phone: '916-555-0100', mobile: null, address_street: '731 K Street', address_city: 'Sacramento', address_state: 'CA', address_zip: '95814', preferred_contact: 'Email', application_count: 1, applications: [{ id: 'app-1', application_number: 'APL-0000001056', status: 'active', permit_type_name: 'Beer Manufacturer', current_stage_name: 'Division Office Review' }], activities: [] },
  { id: 'c-2', first_name: 'James', last_name: 'Park', email: 'james.park@baywines.com', phone: '415-555-0200', mobile: '415-555-0201', address_street: '200 Market St', address_city: 'San Francisco', address_state: 'CA', address_zip: '94105', preferred_contact: 'Phone', application_count: 1, applications: [], activities: [] },
  { id: 'c-3', first_name: 'Sandra', last_name: 'Lee', email: 'sandra@goldenstatespirits.com', phone: '213-555-0300', mobile: null, address_street: '1 Commerce Dr', address_city: 'Los Angeles', address_state: 'CA', address_zip: '90001', preferred_contact: 'Email', application_count: 1, applications: [], activities: [] },
];

export const MOCK_WORKFLOWS = [
  {
    id: 'wf-1', name: 'Standard License Application', permit_type_name: 'Beer Manufacturer', is_default: true, stage_count: 7,
    stages: STAGES,
    transitions: [
      { id: 't1', from_stage_id: 's1', to_stage_id: 's2', label: 'Next Stage', from_stage_name: 'Application Received', to_stage_name: 'Initial Review', requires_note: false },
      { id: 't2', from_stage_id: 's2', to_stage_id: 's3', label: 'Next Stage', from_stage_name: 'Initial Review', to_stage_name: 'Investigation', requires_note: false },
      { id: 't3', from_stage_id: 's2', to_stage_id: 's1', label: 'Return to Previous', from_stage_name: 'Initial Review', to_stage_name: 'Application Received', requires_note: true },
      { id: 't4', from_stage_id: 's3', to_stage_id: 's4', label: 'Next Stage', from_stage_name: 'Investigation', to_stage_name: 'Division Office Review', requires_note: false },
      { id: 't5', from_stage_id: 's4', to_stage_id: 's5', label: 'Next Stage', from_stage_name: 'Division Office Review', to_stage_name: 'Judicial Review', requires_note: false },
      { id: 't6', from_stage_id: 's5', to_stage_id: 's6', label: 'Next Stage', from_stage_name: 'Judicial Review', to_stage_name: 'Final Review', requires_note: false },
      { id: 't7', from_stage_id: 's6', to_stage_id: 's7', label: 'Issue License', from_stage_name: 'Final Review', to_stage_name: 'Issue License', requires_note: false },
    ],
  },
];

export const HOMESTEAD_FORM_SCHEMA = [
  { key: 'owns_property',       label: 'Do you own the property you are applying for?', type: 'radio',   required: true,  options: ['Yes', 'No'] },
  { key: 'principal_residence', label: 'Is this property your principal residence?',    type: 'radio',   required: true,  options: ['Yes', 'No'] },
  { key: 'lived_six_months',    label: 'Did you live at this property for at least 6 months of the prior tax year, including July 1?', type: 'radio', required: true, options: ['Yes', 'No'] },
  { key: 'no_transfer',         label: 'Was there any transfer of ownership in the prior tax year?', type: 'radio', required: true, options: ['No — ownership did not transfer', 'Yes — ownership transferred'] },
  { key: 'one_property',        label: 'Are you applying for more than one property?',  type: 'radio',   required: true,  options: ['No — this is my only application', 'Yes — multiple properties'] },
  { key: 'property_address',    label: 'Property Street Address',                        type: 'text',    required: true,  placeholder: '123 Main Street' },
  { key: 'property_city',       label: 'City',                                           type: 'text',    required: true,  placeholder: 'Baltimore' },
  { key: 'property_county',     label: 'County',                                         type: 'select',  required: true,  options: ['Allegany','Anne Arundel','Baltimore City','Baltimore County','Calvert','Caroline','Carroll','Cecil','Charles','Dorchester','Frederick','Garrett','Harford','Howard','Kent','Montgomery',"Prince George's","Queen Anne's",'Somerset',"St. Mary's",'Talbot','Washington','Wicomico','Worcester'] },
  { key: 'property_zip',        label: 'ZIP Code',                                       type: 'text',    required: true,  placeholder: '21202' },
  { key: 'move_in_date',        label: 'Date you began using this property as your principal residence', type: 'date', required: true },
  { key: 'owner_first_name',    label: 'First Name',                                     type: 'text',    required: true,  placeholder: 'Jane' },
  { key: 'owner_last_name',     label: 'Last Name',                                      type: 'text',    required: true,  placeholder: 'Doe' },
  { key: 'owner_email',         label: 'Email Address',                                  type: 'email',   required: true,  placeholder: 'jane.doe@example.com' },
  { key: 'owner_phone',         label: 'Phone Number',                                   type: 'tel',     required: true,  placeholder: '(410) 555-0100' },
  { key: 'owner_ssn_last4',     label: 'Last 4 digits of Social Security Number',        type: 'text',    required: true,  placeholder: '0000', hint: 'Required by SDAT. Your SSN is encrypted and protected under federal law.' },
  { key: 'mailing_same',        label: 'Is your mailing address the same as the property address?', type: 'radio', required: true, options: ['Yes', 'No'] },
  { key: 'certification',       label: 'I certify under penalty of perjury that the information provided is true, correct, and complete.', type: 'checkbox', required: true },
];

export const MOCK_PERMIT_TYPES = [
  {
    id: 'pt-homestead', name: 'Homestead Tax Credit', code: 'HOMESTEAD-TC',
    description: 'Maryland Homestead Tax Credit application for principal residence owners',
    fee: 0, renewal_period_days: null, application_count: 0, is_active: true,
    form_schema: HOMESTEAD_FORM_SCHEMA,
  },
  { id: 'pt-1', name: 'Beer Manufacturer', code: 'BEER-MFG', description: 'License to manufacture beer', fee: 1500, renewal_period_days: 365, application_count: 1, is_active: true, form_schema: [{ key: 'type_of_business', label: 'Type of Business', type: 'text' }, { key: 'food_service', label: 'Food Service', type: 'boolean' }] },
  { id: 'pt-2', name: 'Wine Retailer', code: 'WINE-RETAIL', description: 'License to sell wine at retail', fee: 500, renewal_period_days: 365, application_count: 1, is_active: true, form_schema: [] },
  { id: 'pt-3', name: 'Spirits Distributor', code: 'SPIRITS-DIST', description: 'License to distribute spirits', fee: 2500, renewal_period_days: 365, application_count: 1, is_active: true, form_schema: [] },
];

export const MOCK_USERS = [
  { id: 'user-1', email: 'admin@ca-abc.gov', first_name: 'Eric', last_name: 'Keipper', role: 'admin', is_active: true },
  { id: 'user-2', email: 'staff@ca-abc.gov', first_name: 'Jane', last_name: 'Smith', role: 'staff', is_active: true },
];
