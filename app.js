/* ===========================
   APP STATE & STORAGE
=========================== */
const STORAGE_KEY = 'hilman_complaints_v2';

let complaints = loadComplaints();
let filteredComplaints = [...complaints];
let currentPage = 'dashboard';
let selectMode = false;
let selectedIds = new Set();
let deleteTargetId = null;
let attachmentFiles = [];

function loadComplaints() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getSeedData();
  } catch { return getSeedData(); }
}

function saveComplaints() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
}

function getSeedData() {
  return [
    {
      id: 'UI-1784526028',
      status: 'OPEN',
      dateReceived: '2025-01-15',
      customer: 'Test Customer',
      description: 'Automated test complaint',
      dateEmail: '',
      dermalog: '',
      dateRefusal: '',
      dateResolved: '',
      attachments: [],
      createdAt: '2025-01-15T00:00:00Z'
    },
    {
      id: 'TEST-1784525968',
      status: 'OPEN',
      dateReceived: '2025-01-15',
      customer: 'ACME',
      description: 'Fingerprint scanner issue at gate 3.',
      dateEmail: '',
      dermalog: '',
      dateRefusal: '',
      dateResolved: '',
      attachments: [],
      createdAt: '2025-01-15T00:00:00Z'
    }
  ];
}

/* ===========================
   ROUTING
=========================== */
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  currentPage = page;
  document.getElementById('page-' + page).classList.add('active');

  const navId = page === 'new-complaint' ? 'nav-new' : 'nav-' + page;
  const navEl = document.getElementById(navId);
  if (navEl) navEl.classList.add('active');

  if (page === 'dashboard') renderDashboard();
  if (page === 'complaints') { filteredComplaints = [...complaints]; renderComplaints(); }
  if (page === 'done') renderDone();
  if (page === 'new-complaint') resetForm();

  return false;
}

/* ===========================
   SIDEBAR
=========================== */
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('collapsed');
});

/* ===========================
   DASHBOARD
=========================== */
function renderDashboard() {
  const total = complaints.length;
  const open = complaints.filter(c => c.status === 'OPEN').length;
  const closed = complaints.filter(c => c.status === 'CLOSED').length;
  const done = complaints.filter(c => c.status === 'DONE').length;
  const pend = complaints.filter(c => c.status === 'PEND/KIV').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statOpen').textContent = open;
  document.getElementById('statClosed').textContent = closed;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statPend').textContent = pend;

  // Recent list (latest 5)
  const sorted = [...complaints].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recent = sorted.slice(0, 5);
  const recentEl = document.getElementById('recentList');
  if (recent.length === 0) {
    recentEl.innerHTML = '<p class="empty-state">No complaints yet.</p>';
  } else {
    recentEl.innerHTML = recent.map(c => `
      <div class="recent-item" onclick="editComplaint('${c.id}')">
        <div class="ticket-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5H19a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h4"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg></div>
        <div class="ticket-info">
          <div class="ticket-id">${esc(c.id)}</div>
          <div class="ticket-customer">${esc(c.customer || '—')}</div>
        </div>
        <div class="ticket-meta">
          <span class="status-badge status-${statusKey(c.status)}">${esc(c.status)}</span>
          <span class="ticket-date">${formatDate(c.dateReceived)}</span>
        </div>
      </div>
    `).join('');
  }

  // Latest detail
  const latest = sorted[0];
  const latestEl = document.getElementById('latestDetail');
  if (!latest) {
    latestEl.innerHTML = '<p class="latest-empty">No data yet.</p>';
  } else {
    latestEl.innerHTML = `
      <div class="latest-field"><div class="latest-field-label">Ticket ID</div><div class="latest-field-value">${esc(latest.id)}</div></div>
      <div class="latest-field"><div class="latest-field-label">Customer</div><div class="latest-field-value">${esc(latest.customer || '—')}</div></div>
      <div class="latest-field"><div class="latest-field-label">Date Received</div><div class="latest-field-value">${formatDate(latest.dateReceived)}</div></div>
      <div class="latest-field"><div class="latest-field-label">Complaint</div><div class="latest-field-value" style="font-weight:400;font-size:13px;">${esc(latest.description || '—')}</div></div>
      <div class="latest-field"><div class="latest-field-label">Dermalog Ticket</div><div class="latest-field-value">${esc(latest.dermalog || '—')}</div></div>
      <span class="status-badge status-${statusKey(latest.status)}">${esc(latest.status)}</span>
    `;
  }
}

function dashSearch() {
  const q = document.getElementById('dashSearchInput').value.toLowerCase();
  const items = document.querySelectorAll('#recentList .recent-item');
  items.forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

/* ===========================
   COMPLAINTS PAGE
=========================== */
function renderComplaints() {
  const list = document.getElementById('complaintsList');
  const label = document.getElementById('showingLabel');

  if (filteredComplaints.length === 0) {
    list.innerHTML = '<div class="empty-state">No complaints match your filters.</div>';
    label.textContent = '';
    return;
  }

  list.innerHTML = filteredComplaints.map(c => `
    <div class="complaint-item" id="ci-${c.id}" data-id="${c.id}">
      <input type="checkbox" class="complaint-checkbox" id="chk-${c.id}" onchange="toggleSelect('${c.id}')" />
      <div class="ticket-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5H19a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h4"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg></div>
      <div class="ticket-info" style="flex:1;">
        <div class="ticket-id">${esc(c.id)}</div>
        <div class="ticket-customer">${esc(c.customer || '—')}</div>
      </div>
      <span class="status-badge status-${statusKey(c.status)}">${esc(c.status)}</span>
      <span class="ticket-date">${formatDate(c.dateReceived)}</span>
      <div class="row-actions">
        <button class="qbtn-row qbtn-row-edit"   onclick="openDrawer('${c.id}')"          title="Edit ticket">✏️ Edit</button>
        <button class="qbtn-row qbtn-row-done"   onclick="quickStatusRow('${c.id}','DONE')"     title="Mark as Done">✓ Done</button>
        <button class="qbtn-row qbtn-row-pend"   onclick="quickStatusRow('${c.id}','PEND/KIV')" title="Mark as Pend/KIV">⏳ Pend/KIV</button>
        <button class="qbtn-row qbtn-row-delete" onclick="openDeleteModal('${c.id}')"     title="Delete">🗑</button>
      </div>
    </div>
  `).join('');

  label.textContent = `Showing ${filteredComplaints.length} ticket${filteredComplaints.length !== 1 ? 's' : ''}`;
}

function applyFilters() {
  const search = document.getElementById('filterSearch').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const from = document.getElementById('filterFrom').value;
  const to = document.getElementById('filterTo').value;

  filteredComplaints = complaints.filter(c => {
    const matchSearch = !search ||
      c.id.toLowerCase().includes(search) ||
      (c.customer || '').toLowerCase().includes(search) ||
      (c.dermalog || '').toLowerCase().includes(search) ||
      (c.description || '').toLowerCase().includes(search);
    const matchStatus = !status || c.status === status;
    const matchFrom = !from || (c.dateReceived && c.dateReceived >= from);
    const matchTo = !to || (c.dateReceived && c.dateReceived <= to);
    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  renderComplaints();
}

/* ===========================
   SELECT MODE
=========================== */
function toggleSelectMode() {
  selectMode = true;
  selectedIds.clear();
  document.getElementById('complaintsList').classList.add('select-mode');
  document.getElementById('bulkBar').style.display = 'flex';
  updateSelectedCount();
}
function cancelSelectMode() {
  selectMode = false;
  selectedIds.clear();
  document.getElementById('complaintsList').classList.remove('select-mode');
  document.getElementById('bulkBar').style.display = 'none';
  document.querySelectorAll('.complaint-checkbox').forEach(cb => { cb.checked = false; });
  document.querySelectorAll('.complaint-item').forEach(el => el.classList.remove('selected'));
}
function toggleSelect(id) {
  if (selectedIds.has(id)) { selectedIds.delete(id); document.getElementById('ci-' + id).classList.remove('selected'); }
  else { selectedIds.add(id); document.getElementById('ci-' + id).classList.add('selected'); }
  updateSelectedCount();
}
function updateSelectedCount() {
  document.getElementById('selectedCount').textContent = `${selectedIds.size} selected`;
}

/* ===========================
   FORM (NEW / EDIT)
=========================== */
function resetForm() {
  document.getElementById('editId').value = '';
  document.getElementById('formTitle').textContent = 'New Complaint';
  document.getElementById('formSubtitle').textContent = 'Enter customer complaint details and Dermalog escalation info.';
  document.getElementById('complaintForm').reset();
  attachmentFiles = [];
  renderAttachments();
}

function editComplaint(id) {
  const c = complaints.find(x => x.id === id);
  if (!c) return;
  showPage('new-complaint');
  document.getElementById('editId').value = c.id;
  document.getElementById('formTitle').textContent = 'Edit Complaint';
  document.getElementById('formSubtitle').textContent = `Editing ticket: ${c.id}`;
  document.getElementById('fTicketId').value = c.id;
  document.getElementById('fDateReceived').value = c.dateReceived || '';
  document.getElementById('fCustomer').value = c.customer || '';
  document.getElementById('fDescription').value = c.description || '';
  document.getElementById('fDateEmail').value = c.dateEmail || '';
  document.getElementById('fDermalog').value = c.dermalog || '';
  document.getElementById('fDateRefusal').value = c.dateRefusal || '';
  document.getElementById('fDateResolved').value = c.dateResolved || '';
  attachmentFiles = [];
  renderAttachments();
}

function saveComplaint(e) {
  e.preventDefault();
  const editId = document.getElementById('editId').value;
  const newId = document.getElementById('fTicketId').value.trim();

  if (!editId) {
    // Check duplicate
    if (complaints.find(c => c.id === newId)) {
      showToast('Ticket ID already exists!', 'error'); return;
    }
  }

  const data = {
    id: editId || newId,
    status: editId ? (complaints.find(c => c.id === editId)?.status || 'OPEN') : 'OPEN',
    dateReceived: document.getElementById('fDateReceived').value,
    customer: document.getElementById('fCustomer').value.trim(),
    description: document.getElementById('fDescription').value.trim(),
    dateEmail: document.getElementById('fDateEmail').value,
    dermalog: document.getElementById('fDermalog').value.trim(),
    dateRefusal: document.getElementById('fDateRefusal').value,
    dateResolved: document.getElementById('fDateResolved').value,
    attachments: attachmentFiles.map(f => f.name),
    createdAt: editId ? (complaints.find(c => c.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
  };

  if (editId) {
    const idx = complaints.findIndex(c => c.id === editId);
    if (idx > -1) complaints[idx] = data;
    showToast('Complaint updated successfully!', 'success');
  } else {
    complaints.unshift(data);
    showToast('Complaint saved successfully!', 'success');
  }

  saveComplaints();
  showPage('complaints');
}

function cancelForm() {
  showPage('complaints');
}

/* ===========================
   ATTACHMENTS
=========================== */
function handleFiles(e) {
  const newFiles = Array.from(e.target.files);
  attachmentFiles = [...attachmentFiles, ...newFiles];
  renderAttachments();
}
function renderAttachments() {
  const preview = document.getElementById('attachmentPreview');
  const placeholder = document.getElementById('attachmentPlaceholder');
  if (attachmentFiles.length === 0) {
    placeholder.style.display = '';
    preview.innerHTML = '';
  } else {
    placeholder.style.display = 'none';
    preview.innerHTML = attachmentFiles.map((f, i) => {
      const url = URL.createObjectURL(f);
      return `<img class="attachment-thumb" src="${url}" title="${esc(f.name)}" alt="${esc(f.name)}" />`;
    }).join('');
  }
}

/* ===========================
   DELETE
=========================== */
function openDeleteModal(id) {
  deleteTargetId = id;
  document.getElementById('deleteModal').style.display = 'flex';
}
function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('deleteModal').style.display = 'none';
}
function confirmDelete() {
  if (!deleteTargetId) return;
  complaints = complaints.filter(c => c.id !== deleteTargetId);
  filteredComplaints = filteredComplaints.filter(c => c.id !== deleteTargetId);
  saveComplaints();
  closeDeleteModal();
  renderComplaints();
  showToast('Complaint deleted.', 'success');
}
function deleteSelected() {
  if (selectedIds.size === 0) { showToast('No items selected.', 'error'); return; }
  complaints = complaints.filter(c => !selectedIds.has(c.id));
  filteredComplaints = filteredComplaints.filter(c => !selectedIds.has(c.id));
  saveComplaints();
  cancelSelectMode();
  renderComplaints();
  showToast(`${selectedIds.size} complaint(s) deleted.`, 'success');
}

/* ===========================
   DONE PAGE
=========================== */
let doneFiltered = [];

function renderDone() {
  doneFiltered = complaints.filter(c => c.status === 'DONE');
  applyDoneFilters(true);
}

function applyDoneFilters(skipRead) {
  const search = (document.getElementById('doneSearch')?.value || '').toLowerCase();
  const from = document.getElementById('doneFrom')?.value || '';
  const to = document.getElementById('doneTo')?.value || '';

  const base = complaints.filter(c => c.status === 'DONE');
  doneFiltered = base.filter(c => {
    const matchSearch = !search ||
      c.id.toLowerCase().includes(search) ||
      (c.customer || '').toLowerCase().includes(search) ||
      (c.dermalog || '').toLowerCase().includes(search) ||
      (c.description || '').toLowerCase().includes(search);
    const matchFrom = !from || (c.dateReceived && c.dateReceived >= from);
    const matchTo = !to || (c.dateReceived && c.dateReceived <= to);
    return matchSearch && matchFrom && matchTo;
  });

  renderDoneTable();
}

function renderDoneTable() {
  const tbody = document.getElementById('doneTableBody');
  const label = document.getElementById('doneShowingLabel');
  const summary = document.getElementById('doneSummary');

  // Summary strip
  const allDone = complaints.filter(c => c.status === 'DONE').length;
  const allPend = complaints.filter(c => c.status === 'PEND/KIV').length;
  const allClosed = complaints.filter(c => c.status === 'CLOSED').length;
  summary.innerHTML = `
    <div class="done-stat"><span class="done-stat-val">${allDone}</span><span class="done-stat-key">Done</span></div>
    <div class="done-stat done-stat-pend"><span class="done-stat-val">${allPend}</span><span class="done-stat-key">Pend/KIV</span></div>
    <div class="done-stat done-stat-closed"><span class="done-stat-val">${allClosed}</span><span class="done-stat-key">Closed</span></div>
  `;

  if (doneFiltered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="done-empty">No done complaints found.</td></tr>`;
    label.textContent = '';
    return;
  }

  tbody.innerHTML = doneFiltered.map(c => `
    <tr class="done-row">
      <td class="done-id">${esc(c.id)}</td>
      <td>${esc(c.customer || '—')}</td>
      <td><span class="status-badge status-${statusKey(c.status)}">${esc(c.status)}</span></td>
      <td>${formatDate(c.dateReceived)}</td>
      <td>${formatDate(c.dateEmail)}</td>
      <td>${esc(c.dermalog || '—')}</td>
      <td>${formatDate(c.dateRefusal)}</td>
      <td>${formatDate(c.dateResolved)}</td>
      <td class="done-desc">${esc(c.description || '—')}</td>
      <td>
        <button class="qbtn-row qbtn-row-edit" onclick="openDrawer('${c.id}')" title="Edit">✏️</button>
        <button class="qbtn-row qbtn-row-delete" onclick="openDeleteModal('${c.id}')" title="Delete">🗑</button>
      </td>
    </tr>
  `).join('');

  label.textContent = `Showing ${doneFiltered.length} of ${complaints.filter(c => c.status === 'DONE').length} done ticket(s)`;
}

/* ===========================
   EXCEL EXPORT (SheetJS)
=========================== */
function buildExcelRows(data) {
  return data.map(c => ({
    'Ticket ID': c.id,
    'Status': c.status,
    'Customer': c.customer || '',
    'Date Received': formatDate(c.dateReceived),
    'Complaint Description': c.description || '',
    'Date Email to Dermalog': formatDate(c.dateEmail),
    'Dermalog Ticket': c.dermalog || '',
    'Date Respond': formatDate(c.dateRefusal),
    'Date Resolved': formatDate(c.dateResolved),
    'Created At': c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
  }));
}

function exportToExcel(data, filename) {
  if (!data || data.length === 0) { showToast('No data to export.', 'error'); return; }
  const rows = buildExcelRows(data);
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 40 },
    { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 22 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
  XLSX.writeFile(wb, filename);
  showToast(`Exported ${data.length} record(s) to Excel!`, 'success');
}

function exportAllToExcel() {
  exportToExcel(complaints, 'complaints_all.xlsx');
}
function exportFilteredToExcel() {
  exportToExcel(filteredComplaints, 'complaints_filtered.xlsx');
}
function exportSelectedToExcel() {
  const sel = complaints.filter(c => selectedIds.has(c.id));
  exportToExcel(sel, 'complaints_selected.xlsx');
}

// Done-page exports
function exportDoneAllToExcel() {
  const done = complaints.filter(c => c.status === 'DONE');
  exportToExcel(done, 'done_complaints_all.xlsx');
}
function exportDoneFilteredToExcel() {
  exportToExcel(doneFiltered, 'done_complaints_filtered.xlsx');
}
function exportAllComplaintsToExcel() {
  exportToExcel(complaints, 'all_tickets.xlsx');
}

/* ===========================
   TOAST
=========================== */
let toastTimer = null;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type + ' show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3000);
}

/* ===========================
   HELPERS
=========================== */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
    return dt.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return d; }
}

function statusKey(s) {
  if (!s) return 'OPEN';
  return s.replace('/', '').toUpperCase();
}

/* ===========================
   EDIT DRAWER
=========================== */
function openDrawer(id) {
  const c = complaints.find(x => x.id === id);
  if (!c) return;
  document.getElementById('dEditId').value = c.id;
  document.getElementById('dStatus').value = c.status || 'OPEN';
  document.getElementById('dTicketId').value = c.id;
  document.getElementById('dCustomer').value = c.customer || '';
  document.getElementById('dDateReceived').value = c.dateReceived || '';
  document.getElementById('dDateEmail').value = c.dateEmail || '';
  document.getElementById('dDermalog').value = c.dermalog || '';
  document.getElementById('dDateRefusal').value = c.dateRefusal || '';
  document.getElementById('dDateResolved').value = c.dateResolved || '';
  document.getElementById('dDescription').value = c.description || '';
  document.getElementById('drawerTitle').textContent = 'Edit Ticket';
  document.getElementById('drawerSubtitle').textContent = c.id;
  updateDrawerBadge(c.status || 'OPEN');
  document.getElementById('editDrawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  document.getElementById('editDrawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function updateDrawerBadge(status) {
  const badge = document.getElementById('drawerCurrentBadge');
  badge.textContent = status;
  badge.className = `status-badge status-${statusKey(status)}`;
  document.getElementById('dStatus').value = status;

  // Highlight active quick-button
  document.querySelectorAll('.qbtn').forEach(b => b.classList.remove('qbtn-active'));
  const map = { 'OPEN': 'qbtn-open', 'DONE': 'qbtn-done', 'PEND/KIV': 'qbtn-pend', 'CLOSED': 'qbtn-closed' };
  const active = document.querySelector(`.${map[status]}`);
  if (active) active.classList.add('qbtn-active');
}

function quickStatus(status) {
  updateDrawerBadge(status);
}

function quickStatusRow(id, status) {
  const c = complaints.find(x => x.id === id);
  if (!c) return;
  c.status = status;
  const fc = filteredComplaints.find(x => x.id === id);
  if (fc) fc.status = status;
  saveComplaints();
  renderComplaints();
  renderDashboard();
  renderDone();
  showToast(`Ticket ${id} marked as ${status}`, 'success');
}

function saveDrawer(e) {
  e.preventDefault();
  const id = document.getElementById('dEditId').value;
  const idx = complaints.findIndex(c => c.id === id);
  if (idx === -1) return;

  complaints[idx] = {
    ...complaints[idx],
    status: document.getElementById('dStatus').value,
    customer: document.getElementById('dCustomer').value.trim(),
    dateReceived: document.getElementById('dDateReceived').value,
    dateEmail: document.getElementById('dDateEmail').value,
    dermalog: document.getElementById('dDermalog').value.trim(),
    dateRefusal: document.getElementById('dDateRefusal').value,
    dateResolved: document.getElementById('dDateResolved').value,
    description: document.getElementById('dDescription').value.trim(),
  };

  // Sync filtered list
  const fi = filteredComplaints.findIndex(c => c.id === id);
  if (fi > -1) filteredComplaints[fi] = complaints[idx];

  saveComplaints();
  closeDrawer();
  renderComplaints();
  renderDashboard();
  renderDone();
  showToast('Ticket saved successfully!', 'success');
}

/* ===========================
   INIT
=========================== */
showPage('dashboard');
