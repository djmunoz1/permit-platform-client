/* ═══════════════════════════════════════════════════════
   app.js — shared data layer for Maryland OneStop prototype
   All persistence is localStorage; no server required.
═══════════════════════════════════════════════════════ */

// ── Keys ──────────────────────────────────────────────
const KEYS = {
  submissions: 'mos_submissions',
  session:     'mos_session',
  users:       'mos_users',
};

// ── Seed users (runs once) ────────────────────────────
function seedUsers() {
  if (localStorage.getItem(KEYS.users)) return;
  const users = [
    { id: 'u1', email: 'jane.doe@example.com',  password: 'resident1', role: 'resident', name: 'Jane Doe' },
    { id: 'u2', email: 'john.smith@example.com', password: 'resident2', role: 'resident', name: 'John Smith' },
    { id: 'a1', email: 'admin@maryland.gov',      password: 'admin1234', role: 'admin',    name: 'Admin Officer' },
  ];
  localStorage.setItem(KEYS.users, JSON.stringify(users));
}

// ── Auth ──────────────────────────────────────────────
const Auth = {
  login(email, password) {
    const users = JSON.parse(localStorage.getItem(KEYS.users) || '[]');
    const user  = users.find(u => u.email === email && u.password === password);
    if (!user) return null;
    const session = { userId: user.id, role: user.role, name: user.name, email: user.email };
    localStorage.setItem(KEYS.session, JSON.stringify(session));
    return session;
  },
  logout() {
    localStorage.removeItem(KEYS.session);
    window.location.href = '/portal/login.html';
  },
  current() {
    try { return JSON.parse(localStorage.getItem(KEYS.session)); }
    catch { return null; }
  },
  requireRole(role) {
    const s = Auth.current();
    if (!s) { window.location.href = '/portal/login.html'; return null; }
    if (role && s.role !== role) { window.location.href = s.role === 'admin' ? '/portal/admin-dashboard.html' : '/portal/my-applications.html'; return null; }
    return s;
  },
};

// ── Submissions ───────────────────────────────────────
const Submissions = {
  all() {
    try { return JSON.parse(localStorage.getItem(KEYS.submissions) || '[]'); }
    catch { return []; }
  },
  save(list) {
    localStorage.setItem(KEYS.submissions, JSON.stringify(list));
  },
  byUser(userId) {
    return Submissions.all().filter(s => s.userId === userId);
  },
  get(id) {
    return Submissions.all().find(s => s.id === id) || null;
  },
  create(userId, formType, formData) {
    const list = Submissions.all();
    const sub = {
      id:          'SUB-' + Date.now(),
      userId,
      formType,
      formData,
      status:      'submitted',
      submittedAt: new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      timeline: [
        { status: 'submitted', label: 'Application submitted', date: new Date().toISOString(), note: '' },
      ],
    };
    list.push(sub);
    Submissions.save(list);
    return sub;
  },
  updateStatus(id, status, note = '') {
    const list = Submissions.all();
    const idx  = list.findIndex(s => s.id === id);
    if (idx === -1) return null;
    list[idx].status    = status;
    list[idx].updatedAt = new Date().toISOString();
    list[idx].timeline.push({
      status,
      label: STATUS_LABELS[status] || status,
      date:  new Date().toISOString(),
      note,
    });
    Submissions.save(list);
    return list[idx];
  },
};

// ── Status metadata ───────────────────────────────────
const STATUS_LABELS = {
  submitted:    'Application submitted',
  under_review: 'Under review',
  info_needed:  'Additional information needed',
  approved:     'Approved',
  denied:       'Denied',
};

const STATUS_COLORS = {
  submitted:    { bg: '#e0f0ff', text: '#0071bc', border: '#b0d4f1' },
  under_review: { bg: '#fef9e7', text: '#b7860b', border: '#f0d080' },
  info_needed:  { bg: '#fdf0e8', text: '#c04a00', border: '#f0b480' },
  approved:     { bg: '#e8f5e9', text: '#2e7d32', border: '#a8d5ab' },
  denied:       { bg: '#fde8e8', text: '#be0000', border: '#f0a8a8' },
};

// ── Homestead Tax Credit form schema ──────────────────
const HOMESTEAD_SCHEMA = {
  id:    'homestead-tax-credit',
  title: 'Homestead Tax Credit Application',
  agency: 'Maryland Department of Assessments and Taxation',
  steps: [
    {
      id: 'eligibility',
      title: 'Check Eligibility',
      subtitle: 'Answer a few questions to confirm you qualify.',
      fields: [
        {
          id: 'owns_property',
          label: 'Do you own the property you are applying for?',
          type: 'radio',
          required: true,
          options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
          failValue: 'no',
          failMessage: 'You must be the owner of the property to apply for the Homestead Tax Credit.',
        },
        {
          id: 'principal_residence',
          label: 'Is this property your principal residence?',
          type: 'radio',
          required: true,
          options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
          failValue: 'no',
          failMessage: 'The Homestead Tax Credit only applies to a principal residence.',
        },
        {
          id: 'lived_six_months',
          label: 'Did you live at this property for at least 6 months of the prior tax year, including July 1?',
          type: 'radio',
          required: true,
          options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
          failValue: 'no',
          failMessage: 'You must have lived at the property for at least 6 months including July 1 of the prior tax year.',
        },
        {
          id: 'no_transfer',
          label: 'Was there any transfer of ownership of this property in the prior tax year?',
          type: 'radio',
          required: true,
          options: [{ value: 'no', label: 'No — ownership did not transfer' }, { value: 'yes', label: 'Yes — ownership transferred' }],
          failValue: 'yes',
          failMessage: 'If ownership transferred in the prior tax year, the property does not qualify.',
        },
        {
          id: 'one_property',
          label: 'Are you applying for more than one property?',
          type: 'radio',
          required: true,
          options: [{ value: 'no', label: 'No — this is my only application' }, { value: 'yes', label: 'Yes — I am applying for multiple properties' }],
          failValue: 'yes',
          failMessage: 'The Homestead Tax Credit is limited to one principal residence per owner.',
        },
      ],
    },
    {
      id: 'property',
      title: 'Property Information',
      subtitle: 'Enter the details of the property for which you are applying.',
      fields: [
        {
          id: 'property_address',
          label: 'Property Street Address',
          type: 'text',
          required: true,
          placeholder: '123 Main Street',
        },
        {
          id: 'property_city',
          label: 'City',
          type: 'text',
          required: true,
          placeholder: 'Baltimore',
          width: 'half',
        },
        {
          id: 'property_county',
          label: 'County',
          type: 'select',
          required: true,
          width: 'half',
          options: [
            'Allegany', 'Anne Arundel', 'Baltimore City', 'Baltimore County',
            'Calvert', 'Caroline', 'Carroll', 'Cecil', 'Charles', 'Dorchester',
            'Frederick', 'Garrett', 'Harford', 'Howard', 'Kent', 'Montgomery',
            'Prince George\'s', 'Queen Anne\'s', 'Somerset', 'St. Mary\'s',
            'Talbot', 'Washington', 'Wicomico', 'Worcester',
          ],
        },
        {
          id: 'property_zip',
          label: 'ZIP Code',
          type: 'text',
          required: true,
          placeholder: '21202',
          width: 'half',
          pattern: '^(20[6-9][0-9]{2}|21[0-9]{3})$',
          patternMessage: 'Enter a valid Maryland ZIP code (ranges 206xx–209xx or 210xx–219xx).',
        },
        {
          id: 'property_account',
          label: 'State Department of Assessments and Taxation (SDAT) Account Number',
          type: 'text',
          required: false,
          placeholder: 'e.g. 01-000000-000',
          hint: 'Optional. Find your account number at sdat.dat.maryland.gov/RealProperty',
        },
        {
          id: 'move_in_date',
          label: 'Date you began using this property as your principal residence',
          type: 'date',
          required: true,
        },
      ],
    },
    {
      id: 'owner',
      title: 'Owner Information',
      subtitle: 'Provide your personal information as the property owner.',
      fields: [
        {
          id: 'owner_first_name',
          label: 'First Name',
          type: 'text',
          required: true,
          placeholder: 'Jane',
          width: 'half',
        },
        {
          id: 'owner_last_name',
          label: 'Last Name',
          type: 'text',
          required: true,
          placeholder: 'Doe',
          width: 'half',
        },
        {
          id: 'owner_email',
          label: 'Email Address',
          type: 'email',
          required: true,
          placeholder: 'jane.doe@example.com',
          width: 'half',
        },
        {
          id: 'owner_phone',
          label: 'Phone Number',
          type: 'tel',
          required: true,
          placeholder: '(410) 555-0100',
          width: 'half',
        },
        {
          id: 'owner_ssn_last4',
          label: 'Last 4 digits of Social Security Number',
          type: 'text',
          required: true,
          placeholder: '0000',
          maxLength: 4,
          pattern: '^[0-9]{4}$',
          patternMessage: 'Enter exactly 4 digits.',
          hint: 'Required by SDAT. Your SSN is encrypted and protected under federal law.',
          width: 'half',
        },
        {
          id: 'mailing_same',
          label: 'Is your mailing address the same as the property address?',
          type: 'radio',
          required: true,
          options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
        },
        {
          id: 'mailing_address',
          label: 'Mailing Street Address',
          type: 'text',
          required: false,
          placeholder: '456 Other Street',
          showIf: { field: 'mailing_same', value: 'no' },
        },
        {
          id: 'mailing_city',
          label: 'Mailing City',
          type: 'text',
          required: false,
          placeholder: 'Baltimore',
          width: 'half',
          showIf: { field: 'mailing_same', value: 'no' },
        },
        {
          id: 'mailing_state',
          label: 'Mailing State',
          type: 'text',
          required: false,
          placeholder: 'MD',
          width: 'quarter',
          showIf: { field: 'mailing_same', value: 'no' },
        },
        {
          id: 'mailing_zip',
          label: 'Mailing ZIP Code',
          type: 'text',
          required: false,
          placeholder: '21202',
          width: 'quarter',
          showIf: { field: 'mailing_same', value: 'no' },
        },
      ],
    },
    {
      id: 'review',
      title: 'Review & Submit',
      subtitle: 'Review your application before submitting. You cannot edit after submission.',
      fields: [
        {
          id: 'certification',
          label: 'I certify under penalty of perjury that the information provided is true, correct, and complete to the best of my knowledge and belief. I understand that any false statement may subject me to penalties under Maryland law.',
          type: 'checkbox',
          required: true,
        },
      ],
    },
  ],
};

// ── Utility ───────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ── Init ──────────────────────────────────────────────
seedUsers();
