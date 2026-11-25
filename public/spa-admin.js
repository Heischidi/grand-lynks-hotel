// =============================================================================
// SERENITY SPA & WELLNESS ADMIN PORTAL — JavaScript Controller
// =============================================================================

const API_BASE = window.APP_CONFIG && window.APP_CONFIG.API_URL ? window.APP_CONFIG.API_URL : '/api';
const TOKEN_KEY = 'gl_spa_admin_token';
const USER_KEY = 'gl_spa_admin_user';

let currentTab = 'appointments';
let allAppointments = [];
let catalogServices = [];
let financeData = null;

// Currency formatting
function formatNaira(num) {
  return '₦' + Number(num || 0).toLocaleString();
}

// Toast notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-800 text-white' : 'bg-red-800 text-white';
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';

  toast.className = `${bg} px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 pointer-events-auto transition-all transform translate-y-2 opacity-0`;
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// -----------------------------------------------------------------------------
// INITIALIZATION & AUTH STATE
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    showDashboard();
  } else {
    showLogin();
  }

  // Set default dates on date inputs
  const today = new Date().toISOString().slice(0, 10);
  const walkInDate = document.getElementById('walkInDate');
  if (walkInDate) walkInDate.value = today;

  const customDate = document.getElementById('customDatePicker');
  if (customDate) customDate.value = today;
});

function showLogin() {
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('dashboardView').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('dashboardView').classList.remove('hidden');

  const username = localStorage.getItem(USER_KEY) || 'spaadmin';
  const activeUser = document.getElementById('activeUserName');
  if (activeUser) activeUser.textContent = username;

  loadInitialData();
}

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// -----------------------------------------------------------------------------
// AUTHENTICATION HANDLERS
// -----------------------------------------------------------------------------
async function handleSpaLogin(e) {
  e.preventDefault();
  const username = document.getElementById('spaUsername').value.trim();
  const password = document.getElementById('spaPassword').value;
  const alertBox = document.getElementById('loginAlert');
  const btn = document.getElementById('loginBtn');

  alertBox.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>Authenticating...`;

  try {
    const res = await fetch(`${API_BASE}/spa/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication failed');

    // Save token
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, data.username || username);

    showToast('Welcome to Serenity Spa Admin Portal');
    showDashboard();
  } catch (err) {
    console.error('Login error:', err);
    alertBox.textContent = err.message || 'Invalid spa admin credentials';
    alertBox.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Sign In to Spa Portal</span><i class="fa-solid fa-arrow-right text-xs ml-2"></i>`;
  }
}

function handleSpaLogout() {
  if (confirm('Are you sure you want to log out of the Spa Portal?')) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    showLogin();
    showToast('Logged out safely', 'success');
  }
}

function togglePasswordVisibility() {
  const input = document.getElementById('spaPassword');
  const icon = document.getElementById('passwordEyeIcon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa-solid fa-eye';
  }
}

// -----------------------------------------------------------------------------
// TABS SWITCHING
// -----------------------------------------------------------------------------
function switchTab(tab) {
  currentTab = tab;
  ['appointments', 'finances', 'catalog'].forEach(t => {
    const btn = document.getElementById(`tabBtn-${t}`);
    const section = document.getElementById(`tab-${t}`);
    if (t === tab) {
      if (btn) btn.className = 'tab-btn active px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-700 transition-all flex items-center gap-2 whitespace-nowrap shadow-sm';
      if (section) section.classList.remove('hidden');
    } else {
      if (btn) btn.className = 'tab-btn px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 transition-all flex items-center gap-2 whitespace-nowrap';
      if (section) section.classList.add('hidden');
    }
  });

  if (tab === 'appointments') fetchAppointments();
  if (tab === 'finances') fetchFinances();
  if (tab === 'catalog') fetchCatalog();
}

function loadInitialData() {
  fetchAppointments();
  fetchCatalog();
  fetchFinances();
}

// -----------------------------------------------------------------------------
// TAB 1: APPOINTMENTS
// -----------------------------------------------------------------------------
async function fetchAppointments() {
  const tbody = document.getElementById('appointmentsTableBody');
  try {
    const res = await fetch(`${API_BASE}/spa/bookings?_t=${Date.now()}`, {
      headers: getAuthHeaders()
    });

    if (res.status === 401 || res.status === 403) {
      handleSpaLogout();
      return;
    }

    if (!res.ok) throw new Error('Failed to fetch appointments');
    allAppointments = await res.json();
    updateAppointmentStats();
    filterAppointments();
  } catch (err) {
    console.error('Error fetching spa appointments:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-red-500">Error loading appointments: ${err.message}</td></tr>`;
    }
  }
}

function updateAppointmentStats() {
  const todayStr = new Date().toISOString().slice(0, 10);
  let todayCount = 0;
  let confirmedCount = 0;
  let completedCount = 0;

  allAppointments.forEach(b => {
    const bDateStr = b.appointmentDate ? new Date(b.appointmentDate).toISOString().slice(0, 10) : '';
    if (bDateStr === todayStr && b.status !== 'cancelled') todayCount++;
    if (b.status === 'confirmed' || b.status === 'in-progress') confirmedCount++;
    if (b.status === 'completed') completedCount++;
  });

  document.getElementById('statTodayCount').textContent = todayCount;
  document.getElementById('badgeTodayAppointments').textContent = todayCount;
  document.getElementById('statConfirmedCount').textContent = confirmedCount;
  document.getElementById('statCompletedCount').textContent = completedCount;
  document.getElementById('statTotalCount').textContent = allAppointments.length;
}

function handleDateFilterChange(val) {
  const custom = document.getElementById('customDatePicker');
  if (val === 'custom') {
    custom.classList.remove('hidden');
  } else {
    custom.classList.add('hidden');
  }
  filterAppointments();
}

function filterAppointments() {
  const search = (document.getElementById('appointmentSearchInput')?.value || '').toLowerCase().trim();
  const status = document.getElementById('appointmentStatusFilter')?.value || 'all';
  const dateFilter = document.getElementById('appointmentDateFilter')?.value || 'today';
  const customDate = document.getElementById('customDatePicker')?.value;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const filtered = allAppointments.filter(b => {
    // Status
    if (status !== 'all' && b.status !== status) return false;

    // Date
    const bDateStr = b.appointmentDate ? new Date(b.appointmentDate).toISOString().slice(0, 10) : '';
    if (dateFilter === 'today' && bDateStr !== todayStr) return false;
    if (dateFilter === 'tomorrow' && bDateStr !== tomorrowStr) return false;
    if (dateFilter === 'custom' && customDate && bDateStr !== customDate) return false;

    // Search query
    if (search) {
      const match = (b.guestName || '').toLowerCase().includes(search) ||
                    (b.phone || '').toLowerCase().includes(search) ||
                    (b.bookingRef || '').toLowerCase().includes(search) ||
                    (b.roomNumber || '').toLowerCase().includes(search) ||
                    (b.serviceName || '').toLowerCase().includes(search);
      if (!match) return false;
    }

    return true;
  });

  renderAppointmentsTable(filtered);
}

function renderAppointmentsTable(list) {
  const tbody = document.getElementById('appointmentsTableBody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-gray-400">No appointments found matching your filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(b => {
    const dateFormatted = b.appointmentDate ? new Date(b.appointmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    
    // Status badge styling
    let statusClass = 'bg-gray-100 text-gray-700';
    if (b.status === 'confirmed') statusClass = 'bg-emerald-100 text-emerald-800';
    else if (b.status === 'in-progress') statusClass = 'bg-amber-100 text-amber-800';
    else if (b.status === 'completed') statusClass = 'bg-blue-100 text-blue-800';
    else if (b.status === 'cancelled') statusClass = 'bg-red-100 text-red-700 line-through';

    // Payment badge
    let paymentClass = 'bg-amber-50 text-amber-700 border border-amber-200';
    if (b.paymentStatus === 'paid') paymentClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    else if (b.paymentStatus === 'charged-to-room') paymentClass = 'bg-purple-50 text-purple-700 border border-purple-200';

    const isDone = b.status === 'completed';

    return `
      <tr class="hover:bg-gray-50/80 transition-colors">
        <!-- Ref & Date -->
        <td class="py-3.5 px-4">
          <span class="font-mono font-bold text-gray-900">${b.bookingRef || 'SPA-' + b.id}</span>
          <span class="block text-[11px] text-gray-400 mt-0.5">${dateFormatted}</span>
        </td>

        <!-- Guest Details -->
        <td class="py-3.5 px-4">
          <div class="font-semibold text-gray-900">${b.guestName}</div>
          <div class="text-[11px] text-gray-500">${b.phone}</div>
          ${b.roomNumber ? `
            <span class="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-gray-100 text-[10px] font-bold text-gray-700">
              <i class="fa-solid fa-hotel text-[9px] mr-1"></i>${b.roomNumber}
            </span>
          ` : '<span class="text-[10px] text-gray-400">Walk-in</span>'}
        </td>

        <!-- Service -->
        <td class="py-3.5 px-4">
          <div class="font-medium text-gray-900">${b.serviceName}</div>
          ${b.numberOfGuests > 1 ? `<span class="text-[10px] text-emerald-700 font-semibold">${b.numberOfGuests} Guests</span>` : ''}
          ${b.specialRequests ? `<div class="text-[10px] text-gray-500 truncate max-w-xs italic">"${b.specialRequests}"</div>` : ''}
        </td>

        <!-- Time Slot -->
        <td class="py-3.5 px-4 whitespace-nowrap">
          <span class="font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md text-xs">
            ${b.timeSlot}
          </span>
        </td>

        <!-- Price & Payment -->
        <td class="py-3.5 px-4 whitespace-nowrap">
          <div class="font-bold text-gray-900 font-playfair text-sm">${formatNaira(b.price)}</div>
          <span class="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${paymentClass}">
            ${b.paymentStatus || 'unpaid'} ${b.paymentMethod ? `(${b.paymentMethod})` : ''}
          </span>
        </td>

        <!-- Status -->
        <td class="py-3.5 px-4 whitespace-nowrap">
          <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${statusClass}">
            ${b.status}
          </span>
        </td>

        <!-- Actions -->
        <td class="py-3.5 px-4 text-right whitespace-nowrap space-x-1">
          ${!isDone && b.status !== 'cancelled' ? `
            <button onclick="quickCompleteAppointment(${b.id}, ${b.price})" class="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs" title="Mark Completed & Paid">
              <i class="fa-solid fa-check mr-1"></i>Complete
            </button>
          ` : ''}
          <button onclick="openStatusModal(${b.id})" class="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-gray-100 rounded-lg text-xs" title="Edit Status / Payment">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Quick Complete & Paid
async function quickCompleteAppointment(id, price) {
  const method = prompt(`Record settlement for ${formatNaira(price)}:\nEnter payment method (cash, pos, transfer, room):`, 'cash');
  if (method === null) return;

  try {
    const res = await fetch(`${API_BASE}/spa/bookings/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: method.trim().toLowerCase()
      })
    });
    if (!res.ok) throw new Error('Failed to update');
    showToast('Appointment completed & recorded as paid');
    fetchAppointments();
    fetchFinances();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Status modal
function openStatusModal(id) {
  const booking = allAppointments.find(b => b.id === id);
  if (!booking) return;

  document.getElementById('statusBookingId').value = id;
  document.getElementById('statusModalSubtitle').textContent = `Ref: ${booking.bookingRef} • ${booking.guestName} (${booking.serviceName})`;
  document.getElementById('modalStatusSelect').value = booking.status || 'confirmed';
  document.getElementById('modalPaymentStatusSelect').value = booking.paymentStatus || 'unpaid';
  document.getElementById('modalPaymentMethodSelect').value = booking.paymentMethod || '';
  document.getElementById('modalNotesInput').value = booking.notes || '';

  const modal = document.getElementById('statusModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeStatusModal() {
  const modal = document.getElementById('statusModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function handleStatusSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('statusBookingId').value;
  const status = document.getElementById('modalStatusSelect').value;
  const paymentStatus = document.getElementById('modalPaymentStatusSelect').value;
  const paymentMethod = document.getElementById('modalPaymentMethodSelect').value;
  const notes = document.getElementById('modalNotesInput').value;

  try {
    const res = await fetch(`${API_BASE}/spa/bookings/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, paymentStatus, paymentMethod, notes })
    });
    if (!res.ok) throw new Error('Failed to update appointment');
    showToast('Appointment updated successfully');
    closeStatusModal();
    fetchAppointments();
    fetchFinances();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -----------------------------------------------------------------------------
// TAB 2: FINANCES
// -----------------------------------------------------------------------------
async function fetchFinances() {
  try {
    const res = await fetch(`${API_BASE}/spa/finances?_t=${Date.now()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load spa finances');
    financeData = await res.json();
    renderFinances();
  } catch (err) {
    console.error('Spa finance error:', err);
  }
}

function renderFinances() {
  if (!financeData) return;

  document.getElementById('finTotalRevenue').textContent = formatNaira(financeData.totalRevenue);
  document.getElementById('finTodayRevenue').textContent = formatNaira(financeData.todayRevenue);
  document.getElementById('finMonthRevenue').textContent = formatNaira(financeData.thisMonthRevenue);
  document.getElementById('finPendingRevenue').textContent = formatNaira(financeData.pendingRevenue);

  // Payment Methods
  const pm = financeData.byPaymentMethod || {};
  document.getElementById('payCash').textContent = formatNaira(pm.cash);
  document.getElementById('payPOS').textContent = formatNaira(pm.pos);
  document.getElementById('payTransfer').textContent = formatNaira(pm.transfer);
  document.getElementById('payRoom').textContent = formatNaira(pm['charged-to-room']);

  // Popular Services List
  const list = document.getElementById('popularServicesList');
  if (list && financeData.popularServices) {
    if (financeData.popularServices.length === 0) {
      list.innerHTML = `<p class="text-xs text-gray-400">No completed treatment revenues recorded yet.</p>`;
    } else {
      list.innerHTML = financeData.popularServices.map(s => {
        return `
          <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 text-xs">
            <div>
              <span class="font-semibold text-gray-800 block">${s.name}</span>
              <span class="text-[10px] text-gray-500">${s.count} sessions completed</span>
            </div>
            <span class="font-bold font-playfair text-emerald-800 text-sm">${formatNaira(s.revenue)}</span>
          </div>
        `;
      }).join('');
    }
  }
}

// -----------------------------------------------------------------------------
// TAB 3: MASSAGE TREATMENTS CATALOG (NO PICTURES)
// -----------------------------------------------------------------------------
async function fetchCatalog() {
  const grid = document.getElementById('catalogGrid');
  try {
    const res = await fetch(`${API_BASE}/spa/admin/services?_t=${Date.now()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load spa catalog');
    catalogServices = await res.json();
    renderCatalog();
    populateWalkInServices();
  } catch (err) {
    console.error('Catalog load error:', err);
    if (grid) {
      grid.innerHTML = `<div class="col-span-full text-center py-8 text-red-500">Failed to load massage catalog: ${err.message}</div>`;
    }
  }
}

function renderCatalog() {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  if (catalogServices.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400">No massage treatments in catalog yet. Click "+ Add New Massage Treatment" above to create one.</div>`;
    return;
  }

  grid.innerHTML = catalogServices.map(s => {
    return `
      <div class="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              ${s.category || 'Massage'}
            </span>
            <span class="text-xs text-gray-500">
              <i class="fa-regular fa-clock text-emerald-600 mr-1"></i>${s.duration || '60 mins'}
            </span>
          </div>

          <h3 class="text-lg font-playfair font-bold text-gray-900 mb-1.5">${s.name}</h3>

          ${s.targetFocus ? `
            <div class="text-[11px] text-emerald-700 font-medium mb-3">
              <i class="fa-solid fa-bullseye text-[10px] mr-1"></i>${s.targetFocus}
            </div>
          ` : ''}

          <p class="text-xs text-gray-600 leading-relaxed mb-6">
            ${s.description || 'No description provided.'}
          </p>
        </div>

        <div class="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
          <div>
            <span class="text-[10px] uppercase text-gray-400 block font-semibold">Price</span>
            <span class="text-lg font-bold font-playfair text-gray-900">${formatNaira(s.price)}</span>
          </div>

          <div class="flex items-center gap-1.5">
            <button onclick="toggleServiceAvailability(${s.id}, ${!s.available})" class="px-2.5 py-1 rounded-lg text-xs font-semibold ${s.available ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}">
              ${s.available ? 'Active' : 'Disabled'}
            </button>
            <button onclick="openTreatmentModal(${s.id})" class="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-gray-100 rounded-lg text-xs" title="Edit Treatment">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button onclick="deleteTreatment(${s.id})" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs" title="Delete">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Add / Edit Treatment Modal (NO PICTURES)
function openTreatmentModal(id = null) {
  const form = document.getElementById('treatmentForm');
  form.reset();

  if (id) {
    const s = catalogServices.find(item => item.id === id);
    if (s) {
      document.getElementById('treatmentId').value = s.id;
      document.getElementById('treatmentName').value = s.name;
      document.getElementById('treatmentCategory').value = s.category || 'Relaxation';
      document.getElementById('treatmentDuration').value = s.duration || '60 mins';
      document.getElementById('treatmentPrice').value = s.price;
      document.getElementById('treatmentTargetFocus').value = s.targetFocus || '';
      document.getElementById('treatmentDescription').value = s.description || '';
      document.getElementById('treatmentAvailable').checked = Boolean(s.available);
      document.getElementById('treatmentModalTitle').textContent = 'Edit Massage Treatment';
    }
  } else {
    document.getElementById('treatmentId').value = '';
    document.getElementById('treatmentModalTitle').textContent = 'Add New Massage Treatment';
    document.getElementById('treatmentAvailable').checked = true;
  }

  const modal = document.getElementById('treatmentModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeTreatmentModal() {
  const modal = document.getElementById('treatmentModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function handleTreatmentSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('treatmentId').value;
  const payload = {
    name: document.getElementById('treatmentName').value.trim(),
    category: document.getElementById('treatmentCategory').value,
    duration: document.getElementById('treatmentDuration').value.trim(),
    price: parseFloat(document.getElementById('treatmentPrice').value),
    targetFocus: document.getElementById('treatmentTargetFocus').value.trim() || null,
    description: document.getElementById('treatmentDescription').value.trim() || null,
    available: document.getElementById('treatmentAvailable').checked
  };

  const isEdit = Boolean(id);
  const url = isEdit ? `${API_BASE}/spa/services/${id}` : `${API_BASE}/spa/services`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save treatment');

    showToast(isEdit ? 'Massage treatment updated' : 'New massage treatment created');
    closeTreatmentModal();
    fetchCatalog();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleServiceAvailability(id, available) {
  try {
    const res = await fetch(`${API_BASE}/spa/services/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ available })
    });
    if (!res.ok) throw new Error('Failed to update status');
    showToast(`Treatment marked ${available ? 'Active' : 'Disabled'}`);
    fetchCatalog();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTreatment(id) {
  if (!confirm('Are you sure you want to remove this massage treatment from the catalog?')) return;
  try {
    const res = await fetch(`${API_BASE}/spa/services/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete treatment');
    showToast('Massage treatment deleted');
    fetchCatalog();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -----------------------------------------------------------------------------
// WALK-IN APPOINTMENT RECORDING
// -----------------------------------------------------------------------------
function populateWalkInServices() {
  const select = document.getElementById('walkInServiceSelect');
  if (!select) return;
  select.innerHTML = '<option value="">-- Choose a Massage --</option>' +
    catalogServices.map(s => `<option value="${s.id}" data-price="${s.price}" data-name="${s.name}">${s.name} (${s.duration || '60m'} - ${formatNaira(s.price)})</option>`).join('');
}

function openWalkInModal() {
  const modal = document.getElementById('walkInModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeWalkInModal() {
  const modal = document.getElementById('walkInModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function handleWalkInServiceChange() {
  const select = document.getElementById('walkInServiceSelect');
  const opt = select.options[select.selectedIndex];
  if (opt && opt.getAttribute('data-price')) {
    document.getElementById('walkInPrice').value = opt.getAttribute('data-price');
  }
}

async function handleWalkInSubmit(e) {
  e.preventDefault();
  const select = document.getElementById('walkInServiceSelect');
  const opt = select.options[select.selectedIndex];

  const payload = {
    serviceId: select.value ? parseInt(select.value) : null,
    serviceName: opt ? opt.getAttribute('data-name') : 'Massage Treatment',
    appointmentDate: document.getElementById('walkInDate').value,
    timeSlot: document.getElementById('walkInTimeSlot').value,
    guestName: document.getElementById('walkInGuestName').value.trim(),
    phone: document.getElementById('walkInPhone').value.trim(),
    roomNumber: document.getElementById('walkInRoom').value.trim() || null,
    price: parseFloat(document.getElementById('walkInPrice').value),
    paymentStatus: document.getElementById('walkInPaymentStatus').value,
    paymentMethod: document.getElementById('walkInPaymentMethod').value || null,
    notes: document.getElementById('walkInNotes').value.trim() || null
  };

  try {
    const res = await fetch(`${API_BASE}/spa/admin/bookings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record appointment');

    showToast('Walk-in appointment recorded');
    closeWalkInModal();
    document.getElementById('walkInForm').reset();
    fetchAppointments();
    fetchFinances();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -----------------------------------------------------------------------------
// CHANGE PASSWORD
// -----------------------------------------------------------------------------
function openChangePasswordModal() {
  const modal = document.getElementById('passwordModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeChangePasswordModal() {
  const modal = document.getElementById('passwordModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function handleChangePasswordSubmit(e) {
  e.preventDefault();
  const oldPassword = document.getElementById('pwOld').value;
  const newPassword = document.getElementById('pwNew').value;

  try {
    const res = await fetch(`${API_BASE}/spa/auth/change-password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ oldPassword, newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Password update failed');

    showToast('Spa Admin password updated successfully');
    closeChangePasswordModal();
    document.getElementById('pwOld').value = '';
    document.getElementById('pwNew').value = '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}
