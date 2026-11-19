// Fictional, local-only Shipyard demonstrations. No API calls, storage or real client data.
const EXAMPLES = Object.freeze({
  volunteers: {
    title: 'Volunteer organiser',
    intro: 'A lightweight view of shifts, people and where help is still needed.',
    itemName: 'Shift',
    itemPlaceholder: 'e.g. Saturday food distribution',
    statuses: ['Needs cover', 'Filled', 'Completed'],
    totalLabel: 'Shifts',
    attentionLabel: 'Need cover',
    doneLabel: 'Completed',
    realTool: 'A real volunteer system would need appropriate permissions, reliable contact and availability information, notifications and a clear decision about what personal data is actually necessary.',
    rows: [
      {title: 'Monday food distribution', owner: 'Asha', status: 'Filled'},
      {title: 'Community garden', owner: 'Rory', status: 'Needs cover'},
      {title: 'Wednesday advice drop-in', owner: 'Imani', status: 'Completed'},
      {title: 'Friday donations sorting', owner: 'Sam', status: 'Needs cover'}
    ]
  },
  grants: {
    title: 'Grant reporting overview',
    intro: 'Keep reporting commitments visible, with simple ownership and next steps.',
    itemName: 'Reporting task',
    itemPlaceholder: 'e.g. Community fund quarterly update',
    statuses: ['To prepare', 'In progress', 'Submitted'],
    totalLabel: 'Reporting tasks',
    attentionLabel: 'To prepare',
    doneLabel: 'Submitted',
    realTool: 'A real reporting tool would need the right funding terms, dates, evidence sources, controlled access and an audit trail. Some organisations may only need a better shared checklist or spreadsheet.',
    rows: [
      {title: 'Community fund Q3 update', owner: 'Rory', status: 'In progress'},
      {title: 'Neighbourhood project outcomes', owner: 'Asha', status: 'To prepare'},
      {title: 'Youth programme learning note', owner: 'Sam', status: 'Submitted'},
      {title: 'Trustee finance summary', owner: 'Imani', status: 'To prepare'}
    ]
  },
  referrals: {
    title: 'Referral tracker',
    intro: 'A simple workflow for seeing which requests need a next action.',
    itemName: 'Referral reference',
    itemPlaceholder: 'e.g. DEMO-005 (never use a real name)',
    statuses: ['New', 'In progress', 'Closed'],
    totalLabel: 'Referrals',
    attentionLabel: 'New',
    doneLabel: 'Closed',
    realTool: 'Real referral handling may involve highly sensitive information. It needs an assessed lawful basis, data minimisation, access controls, secure hosting, retention policies and a safeguarding approach. This example must never be used for real cases.',
    rows: [
      {title: 'DEMO-001', owner: 'Sam', status: 'New'},
      {title: 'DEMO-002', owner: 'Asha', status: 'In progress'},
      {title: 'DEMO-003', owner: 'Imani', status: 'Closed'},
      {title: 'DEMO-004', owner: 'Rory', status: 'New'}
    ]
  }
});

const requested = new URLSearchParams(window.location.search).get('example');
const config = EXAMPLES[requested] || EXAMPLES.volunteers;
const rows = config.rows.map((row, index) => ({...row, id: index + 1}));
let nextId = rows.length + 1;

const el = (id) => document.getElementById(id);
const filter = el('status-filter');
el('demo-title').textContent = config.title;
el('demo-intro').textContent = config.intro;
el('table-title').textContent = config.itemName + 's';
el('item-head').textContent = config.itemName;
el('item-label').textContent = 'New ' + config.itemName.toLowerCase();
el('item-name').placeholder = config.itemPlaceholder;
el('real-tool').textContent = config.realTool;
el('total-label').textContent = config.totalLabel;
el('active-label').textContent = config.attentionLabel;
el('done-label').textContent = config.doneLabel;
document.title = config.title + ' | Shipyard example';

for (const status of config.statuses) {
  const option = document.createElement('option');
  option.value = status;
  option.textContent = status;
  filter.append(option);
}

function createCell(row, value) {
  const cell = document.createElement('td');
  cell.textContent = value;
  row.append(cell);
  return cell;
}

function render() {
  const tbody = el('items-body');
  const visible = rows.filter((row) => filter.value === 'all' || row.status === filter.value);
  const finalStatus = config.statuses[config.statuses.length - 1];

  el('total-count').textContent = String(rows.length);
  el('active-count').textContent = String(rows.filter((row) => row.status === config.statuses[0]).length);
  el('done-count').textContent = String(rows.filter((row) => row.status === finalStatus).length);
  tbody.replaceChildren();

  if (!visible.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'No example entries at this stage.';
    row.append(cell);
    tbody.append(row);
    return;
  }

  for (const item of visible) {
    const row = document.createElement('tr');
    createCell(row, item.title);
    createCell(row, item.owner);
    createCell(row, item.status);
    const cell = document.createElement('td');
    cell.className = 'action';
    const current = config.statuses.indexOf(item.status);
    if (current === config.statuses.length - 1) {
      cell.textContent = 'No further step';
    } else {
      const nextStatus = config.statuses[current + 1];
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Move to ' + nextStatus;
      button.setAttribute('aria-label', 'Move ' + item.title + ' to ' + nextStatus);
      button.addEventListener('click', () => {
        item.status = nextStatus;
        render();
      });
      cell.append(button);
    }
    row.append(cell);
    tbody.append(row);
  }
}

filter.addEventListener('change', render);
el('add-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const title = el('item-name').value.trim();
  const owner = el('item-owner').value.trim();

  if (!title || !owner) return;
  if (rows.length >= 30) {
    el('form-message').textContent = 'The demonstration is limited to 30 example entries.';
    return;
  }
  rows.unshift({id: nextId++, title: title.slice(0, 120), owner: owner.slice(0, 60), status: config.statuses[0]});
  filter.value = 'all';
  el('add-form').reset();
  el('form-message').textContent = 'Example entry added to this browser session only.';
  render();
});
render();
