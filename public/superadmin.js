// Configuration
const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:5000/api';

console.log('Admin JS starting execution...');
// alert('Debug: Admin Script Loaded'); // User can confirm this if needed

// EXPOSE GLOBALS IMMEDIATELY
window.openModal = function (id) {
    console.log('openModal called:', id);
    // alert('Debug: openModal called for ' + id); 
    const el = document.getElementById(id);
    if (!el) {
        alert('Error: Modal ' + id + ' not found');
        return;
    }
    el.classList.remove('hidden');
    // NUCLEAR FIX: Move to body to ensure it's on top of everything
    document.body.appendChild(el);

    // Force visibility
    el.style.display = 'flex';
    el.style.zIndex = '99999';
    // el.style.border = '5px solid red'; // Visual debug
    console.log('openModal: Moved to body and forced flex. InnerHTML length:', el.innerHTML.length);
};

window.closeModal = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
};

// Define placeholders for other globals so they exist
// Define placeholders only? No, define implementation immediately!
window.openEditMenuModal = function (menuId) {
    console.log('openEditMenuModal called with ID:', menuId, typeof menuId);

    if (!window.currentMenuItems) {
        console.error('window.currentMenuItems is undefined or empty');
        alert('Error: Menu items not loaded. Try refreshing.');
        return;
    }

    // Try finding by number and string to be safe
    const item = window.currentMenuItems.find(i => i.id == menuId); // Weak equality

    console.log('Found item:', item);

    if (!item) {
        console.error('Item not found in currentMenuItems:', window.currentMenuItems);
        alert('Error: Item not found!');
        return;
    }

    try {
        const idInput = document.getElementById('editMenuId');
        const nameInput = document.getElementById('editMenuName');
        const catInput = document.getElementById('editMenuCategory');
        const priceInput = document.getElementById('editMenuPrice');
        const descInput = document.getElementById('editMenuDescription');
        const statusSelect = document.getElementById('editMenuAvailable');

        if (idInput) { idInput.value = item.id; console.log('Set id:', item.id); }
        if (nameInput) { nameInput.value = item.name; console.log('Set name:', item.name); }
        if (catInput) {
            catInput.value = item.category;
            console.log('Set category:', item.category);
            if (catInput.value !== item.category) console.warn('Category value mismatch! Select likely missing option:', item.category);
        }
        if (priceInput) { priceInput.value = item.price; console.log('Set price:', item.price); }
        if (descInput) { descInput.value = item.description || ''; console.log('Set desc:', item.description); }

        // Status select
        if (statusSelect) {
            statusSelect.value = item.available ? 'true' : 'false';
            console.log('Set available:', statusSelect.value);
        }

        console.log('Opening edit modal...');
        window.openModal('editMenuModal');
    } catch (e) {
        console.error('Error populating edit modal:', e);
        alert('Error opening edit modal: ' + e.message);
    }
};

// Global function placeholders removed - implementations are defined directly on window


// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const adminUsernameDisplay = document.getElementById('adminUsernameDisplay');

// Sidebar logic
window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isOpen = !sidebar.classList.contains('-translate-x-full');

    if (isOpen) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        overlay.classList.remove('opacity-100');
    } else {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        // Small delay to allow transition to render
        setTimeout(() => overlay.classList.add('opacity-100'), 10);
    }
}

window.closeSidebarOnMobile = function () {
    if (window.innerWidth < 768) { // Tailwind md breakpoint
        const sidebar = document.getElementById('sidebar');
        if (!sidebar.classList.contains('-translate-x-full')) {
            window.toggleSidebar();
        }
    }
}

// Sections
const sections = {
    rooms: document.getElementById('section-rooms'),
    menu: document.getElementById('section-menu'),
    orders: document.getElementById('section-orders'),
    walkin: document.getElementById('section-walkin'),
    guests: document.getElementById('section-guests'),
    reviews: document.getElementById('section-reviews'),
    settings: document.getElementById('section-settings'),
    statistics: document.getElementById('section-statistics'),
    vault: document.getElementById('section-vault'),
    tracker: document.getElementById('section-tracker')
};

// --- AUTHENTICATION ---

function init() {
    // Re-bind sections just in case DOM wasn't ready at top-level
    sections.rooms = document.getElementById('section-rooms');
    sections.menu = document.getElementById('section-menu');
    sections.orders = document.getElementById('section-orders');
    sections.walkin = document.getElementById('section-walkin');
    sections.guests = document.getElementById('section-guests');
    sections.reviews = document.getElementById('section-reviews');
    sections.settings = document.getElementById('section-settings');
    sections.statistics = document.getElementById('section-statistics');
    sections.vault = document.getElementById('section-vault');
    sections.tracker = document.getElementById('section-tracker');

    const token = localStorage.getItem('adminToken');
    const user = JSON.parse(localStorage.getItem('adminUser') || '{}');

    if (token) {
        if (user.role !== 'superadmin') {
            window.location.href = 'admin.html';
            return;
        }
        showDashboard(user);
    } else {
        showLogin();
    }
}

function showLogin() {
    loginSection.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
}

function showDashboard(user) {
    loginSection.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    if (user && user.username) {
        adminUsernameDisplay.textContent = user.username;
    }
    // Load initial data
    switchTab('rooms');
    
    // Start notification polling
    pollNotifications();
    setInterval(pollNotifications, 30000); // Check every 30 seconds

    // Start live tracker polling (after a short delay to let calendar JS register)
    setTimeout(() => {
        if (window._startTrackerPolling) window._startTrackerPolling();
    }, 500);
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    loginError.classList.add('hidden');

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify({ username: data.username, role: data.role }));
            
            if (data.role !== 'superadmin') {
                window.location.href = 'admin.html';
                return;
            }
            
            showDashboard(data);
            loginForm.reset();
        } else {
            loginError.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Connection error. Please try again.';
        loginError.classList.remove('hidden');
    }
}

function handleLogout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    showLogin();
}

// Wrapper for authenticated requests
async function authFetch(endpoint, options = {}) {
    const token = localStorage.getItem('adminToken');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

        if (response.status === 401 || response.status === 403) {
            console.warn('Session expired. Logging out.');
            handleLogout();
            return null;
        }
        return response;
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

// --- NAVIGATION ---

function switchTab(tabName) {
    // Hide all sections
    // Hide all sections - SAFELY
    Object.values(sections).forEach(sec => {
        if (sec) sec.classList.add('hidden');
    });

    // Reset nav styles
    document.querySelectorAll('aside nav button').forEach(btn => {
        btn.classList.remove('bg-blue-50', 'text-blue-700');
        btn.classList.add('text-gray-700');
    });

    // Show selected
    if (sections[tabName]) {
        sections[tabName].classList.remove('hidden');

        // Highlight nav
        const navBtn = document.getElementById(`nav-${tabName}`);
        if (navBtn) {
            navBtn.classList.add('bg-blue-50', 'text-blue-700');
            navBtn.classList.remove('text-gray-700');
        }

        // Load data        // Fetch data based on tab
        if (tabName === 'rooms') fetchRooms();
        if (tabName === 'menu') fetchMenu();
        if (tabName === 'orders') fetchOrders();
        if (tabName === 'walkin') fetchAvailableRoomsForWalkIn();
        if (tabName === 'guests' && (!window.allGuests || window.allGuests.length === 0)) fetchGuests();
        if (tabName === 'reviews') fetchAdminReviews();
        if (tabName === 'settings') fetchSettings();
        if (tabName === 'statistics') fetchStatistics();
        if (tabName === 'vault') fetchVaultRecords();
        if (tabName === 'tracker') fetchRoomsForTracker();
    }
}

// --- ROOMS MANAGEMENT ---

async function fetchRooms() {
    const tbody = document.getElementById('roomsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center">Loading...</td></tr>';

    // Note: Public endpoint usually, but let's use authFetch to be safe/consistent or if endpoint changes
    // Wait, GET /api/rooms is public in server.js, but that's fine.
    const response = await fetch(`${API_URL}/rooms`);
    if (response && response.ok) {
        window.currentRooms = await response.json();
        renderRooms(window.currentRooms);
    } else {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Failed to load rooms</td></tr>';
    }
}

function renderRooms(rooms) {
    const tbody = document.getElementById('roomsTableBody');
    tbody.innerHTML = '';

    if (rooms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center">No rooms found. Add one!</td></tr>';
        return;
    }

    rooms.forEach(room => {
        let imageSrc = 'images/placeholder-room.jpg';
        if (room.images) {
            try {
                // Handle both JSON array string and potential future flat string
                if (room.images.startsWith('[')) {
                    const parsed = JSON.parse(room.images);
                    if (parsed.length > 0) imageSrc = parsed[0];
                } else {
                    imageSrc = room.images;
                }
            } catch (e) {
                console.warn('Failed to parse room images', e);
            }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Image" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap block md:table-cell text-right md:text-left">
                <span class="md:hidden font-bold mr-2 text-gray-500 float-left">Image:</span>
                <img src="${imageSrc}" class="h-10 w-10 md:h-12 md:w-16 object-cover rounded shadow-sm inline-block" onerror="this.src='https://placehold.co/60x40?text=Room'">
            </td>
            <td data-label="Number" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap font-medium text-xs md:text-sm text-gray-900 block md:table-cell text-right md:text-left"><span class="md:hidden font-bold mr-2 text-gray-500 float-left">Number:</span>${room.roomNumber || room.number || 'N/A'}</td>
            <td data-label="Type" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm block md:table-cell text-right md:text-left"><span class="md:hidden font-bold mr-2 text-gray-500 float-left">Type:</span>${room.type}</td>
            <td data-label="Price" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm block md:table-cell text-right md:text-left"><span class="md:hidden font-bold mr-2 text-gray-500 float-left">Price:</span>
                <div class="inline-block">
                    ${room.discount > 0 ? `<span class="line-through text-gray-400 text-xs">₦${(room.pricePerNight || room.price).toLocaleString()}</span><br><span class="text-green-700 font-semibold">₦${Math.round((room.pricePerNight || room.price) * (1 - room.discount / 100)).toLocaleString()}</span> <span class="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">${room.discount}% OFF</span>` : `₦${(room.pricePerNight || room.price).toLocaleString()}`}
                </div>
            </td>
            <td data-label="Status" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap block md:table-cell text-right md:text-left">
                <span class="md:hidden font-bold mr-2 text-gray-500 float-left">Status:</span>
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${room.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${room.available ? 'Available' : 'Booked'}
                </span>
            </td>
            <td data-label="Actions" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-right text-xs md:text-sm font-medium block md:table-cell">
                <button onclick="openEditRoomModal(${room.id})" class="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                <button onclick="deleteRoom(${room.id})" class="text-red-600 hover:text-red-900">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- LIVE ROOM TRACKER ---

window.fetchRoomsForTracker = async function() {
    const grid = document.getElementById('roomTrackerGrid');
    if(grid) grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">Refreshing tracker...</div>';

    const token = localStorage.getItem('superAdminToken') || localStorage.getItem('adminToken');
    try {
        const [roomsRes, bookingsRes] = await Promise.all([
            fetch(`${API_URL}/rooms`),
            fetch(`${API_URL}/bookings`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (roomsRes && roomsRes.ok) {
            const rooms = await roomsRes.json();
            _calRooms = rooms; // keep calendar state in sync
            
            let bookings = [];
            if (bookingsRes && bookingsRes.ok) {
                bookings = await bookingsRes.json();
                _calBookings = bookings;
            }

            renderRoomTracker(rooms, bookings);
            // If calendar view is active, re-render calendar too
            if (_currentTrackerView === 'calendar') {
                renderCalendarView(_calRooms, _calBookings, _calYear, _calMonth);
            }
        } else {
            if(grid) grid.innerHTML = '<div class="col-span-full text-center text-red-500 py-10">Failed to load live tracker.</div>';
        }
    } catch (err) {
        console.error(err);
        if(grid) grid.innerHTML = '<div class="col-span-full text-center text-red-500 py-10">Failed to load live tracker.</div>';
    }
};

function renderRoomTracker(rooms, bookings = []) {
    const grid = document.getElementById('roomTrackerGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (rooms.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">No rooms available to track.</div>';
        return;
    }

    // Sort rooms by number
    rooms.sort((a, b) => {
        const numA = parseInt(a.roomNumber || a.number) || 0;
        const numB = parseInt(b.roomNumber || b.number) || 0;
        return numA - numB;
    });

    rooms.forEach(room => {
        const card = document.createElement('div');
        
        let statusColorClass = 'bg-green-500';
        let statusTextClass = 'text-green-800 bg-green-100';
        let displayStatus = 'Available';
        let statusIcon = '✅';
        let currentStatus = 'available';

        // Use UTC date boundaries to avoid WAT (+01:00) timezone shift issues
        const nowUtc = new Date();
        const todayStartUtc = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate(), 0, 0, 0, 0));
        const todayEndUtc   = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate(), 23, 59, 59, 999));
        const activeBooking = bookings.find(b => {
            if (b.roomId !== room.id) return false;
            if (['cancelled', 'checked-out'].includes(b.status)) return false;
            const start = new Date(b.startDate);
            const end   = new Date(b.endDate);
            return start <= todayEndUtc && end >= todayStartUtc;
        });

        if (room.status === 'maintenance') {
            statusColorClass = 'bg-yellow-400';
            statusTextClass = 'text-yellow-800 bg-yellow-100';
            displayStatus = 'Maintenance';
            statusIcon = '⚠️';
            currentStatus = 'maintenance';
        } else if (activeBooking || room.status === 'booked' || room.status === 'checked-in' || room.status === 'occupied' || room.status === 'reserved' || !room.available) {
            statusColorClass = 'bg-red-500';
            statusTextClass = 'text-red-800 bg-red-100';
            displayStatus = 'Occupied';
            statusIcon = '🔒';
            currentStatus = 'occupied';
        }

        let guestHtml = '';
        if (currentStatus === 'occupied' && activeBooking && activeBooking.guest) {
            guestHtml = `<div class="mt-1 mb-2 px-2 py-1 bg-gray-50 rounded border border-gray-100"><p class="text-[11px] text-gray-700 font-semibold truncate" title="${activeBooking.guest.name}">👤 ${activeBooking.guest.name}</p></div>`;
        }

        card.className = `bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col`;
        
        card.innerHTML = `
            <div class="absolute top-0 left-0 w-full h-1.5 ${statusColorClass}"></div>
            <div class="flex justify-between items-start mb-1 mt-1">
                <span class="text-2xl font-black text-gray-800 tracking-tight">${room.roomNumber || room.number || 'N/A'}</span>
                <span class="text-lg">${statusIcon}</span>
            </div>
            <p class="text-xs text-gray-500 font-medium mb-2 truncate" title="${room.type}">${room.type}</p>
            <div class="mb-3">
                <span class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${statusTextClass}">
                    ${displayStatus}
                </span>
            </div>
            ${guestHtml}
            <div class="mt-auto pt-2 border-t border-gray-100">
                <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Change Status</p>
                <div class="flex gap-1">
                    <button onclick="updateRoomStatusFromTracker(${room.id}, 'available')" 
                        class="flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${ currentStatus === 'available' ? 'bg-green-500 text-white shadow-sm' : 'bg-green-50 text-green-700 hover:bg-green-100'}">
                        Free
                    </button>
                    <button onclick="updateRoomStatusFromTracker(${room.id}, 'occupied')" 
                        class="flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${ currentStatus === 'occupied' ? 'bg-red-500 text-white shadow-sm' : 'bg-red-50 text-red-700 hover:bg-red-100'}">
                        Booked
                    </button>
                    <button onclick="updateRoomStatusFromTracker(${room.id}, 'maintenance')" 
                        class="flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${ currentStatus === 'maintenance' ? 'bg-yellow-400 text-white shadow-sm' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}">
                        Fix
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.updateRoomStatusFromTracker = async function(roomId, newStatus) {
    const token = localStorage.getItem('adminToken');
    const formData = new FormData();
    formData.append('status', newStatus);

    const response = await fetch(`${API_URL}/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });

    if (response && response.ok) {
        // Re-fetch tracker — this will re-render grid AND calendar if active
        fetchRoomsForTracker();
    } else {
        alert('Failed to update room status. Please try again.');
    }
};

// =====================================================
// LIVE TRACKER — CALENDAR VIEW
// =====================================================

let _calYear  = new Date().getFullYear();
let _calMonth = new Date().getMonth();
let _calRooms    = [];
let _calBookings = [];
let _currentTrackerView = 'grid';
let _trackerPollingTimer = null;

window.refreshTracker = function() {
    fetchRoomsForTracker();
    if (_currentTrackerView === 'calendar') fetchCalendarData();
};

window.switchTrackerView = function(view) {
    _currentTrackerView = view;
    const gridView = document.getElementById('trackerGridView');
    const calView  = document.getElementById('trackerCalendarView');
    const gridBtn  = document.getElementById('trackerViewGridBtn');
    const calBtn   = document.getElementById('trackerViewCalBtn');
    if (view === 'grid') {
        gridView && gridView.classList.remove('hidden');
        calView  && calView.classList.add('hidden');
        gridBtn  && (gridBtn.classList.add('active'),   calBtn && calBtn.classList.remove('active'));
    } else {
        gridView && gridView.classList.add('hidden');
        calView  && calView.classList.remove('hidden');
        calBtn   && (calBtn.classList.add('active'),   gridBtn && gridBtn.classList.remove('active'));
        fetchCalendarData();
    }
};

window.prevMonth = function() {
    _calMonth--;
    if (_calMonth < 0) { _calMonth = 11; _calYear--; }
    renderCalendarView(_calRooms, _calBookings, _calYear, _calMonth);
};
window.nextMonth = function() {
    _calMonth++;
    if (_calMonth > 11) { _calMonth = 0; _calYear++; }
    renderCalendarView(_calRooms, _calBookings, _calYear, _calMonth);
};
window.goToToday = function() {
    const now = new Date();
    _calYear = now.getFullYear();
    _calMonth = now.getMonth();
    renderCalendarView(_calRooms, _calBookings, _calYear, _calMonth);
};

async function fetchCalendarData() {
    const token = localStorage.getItem('adminToken');
    try {
        const [roomsRes, bookingsRes] = await Promise.all([
            fetch(`${API_URL}/rooms`),
            fetch(`${API_URL}/bookings`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        if (roomsRes && roomsRes.ok)    _calRooms    = await roomsRes.json();
        if (bookingsRes && bookingsRes.ok) _calBookings = await bookingsRes.json();
        renderCalendarView(_calRooms, _calBookings, _calYear, _calMonth);
    } catch (err) {
        console.error('Calendar data fetch error:', err);
        const cells = document.getElementById('calendarCells');
        if (cells) cells.innerHTML = '<div class="col-span-7 text-center text-red-500 py-12">Failed to load calendar data.</div>';
    }
}

function roomStatusOnDate(room, date, bookings) {
    const d = new Date(date);
    const dDay = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); // YYYYMMDD local

    // Maintenance overrides everything
    if (room.status === 'maintenance') return 'maintenance';

    // Calendar shows occupancy history — exclude ONLY cancelled bookings.
    // checked-out = stay is complete but the room WAS booked; must still show as occupied.
    const isBooked = (bookings || []).some(b => {
        if (b.roomId != room.id) return false;          // loose equality: handles string/int mismatch
        if (b.status === 'cancelled') return false;     // only skip cancelled
        const start = new Date(b.startDate);
        const end   = new Date(b.endDate);
        const startDay = start.getFullYear() * 10000 + start.getMonth() * 100 + start.getDate();
        const endDay   = end.getFullYear()   * 10000 + end.getMonth()   * 100 + end.getDate();
        return dDay >= startDay && dDay <= endDay;
    });

    return isBooked ? 'occupied' : 'available';
}

function renderCalendarView(rooms, bookings, year, month) {
    const cells   = document.getElementById('calendarCells');
    const titleEl = document.getElementById('calMonthTitle');
    if (!cells) return;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;
    cells.innerHTML = '';

    const today = new Date(); today.setHours(0,0,0,0);
    const firstDay = new Date(year, month, 1);
    let startOffset = firstDay.getDay();
    startOffset = (startOffset === 0) ? 6 : startOffset - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const sortedRooms = [...rooms].sort((a,b) => (parseInt(a.roomNumber||a.number)||0) - (parseInt(b.roomNumber||b.number)||0));
    const MAX_CHIPS = 6;

    for (let i = 0; i < startOffset; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-cell empty';
        cells.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, month, day);
        const isToday  = cellDate.getTime() === today.getTime();
        const cell = document.createElement('div');
        cell.className = `cal-cell${isToday ? ' today' : ''}`;

        const dayNum = document.createElement('div');
        dayNum.className = 'cal-day-num';
        dayNum.textContent = day;
        cell.appendChild(dayNum);

        const chipsContainer = document.createElement('div');
        chipsContainer.className = 'cal-room-chips';
        const visibleRooms = sortedRooms.slice(0, MAX_CHIPS);
        const hiddenCount  = sortedRooms.length - visibleRooms.length;
        visibleRooms.forEach(room => {
            const status = roomStatusOnDate(room, cellDate, bookings);
            const chip = document.createElement('span');
            chip.className = `cal-chip ${status}`;
            chip.title = `Room ${room.roomNumber || room.number} — ${status.charAt(0).toUpperCase()+status.slice(1)}`;
            chip.textContent = `R${room.roomNumber || room.number || '?'}`;
            chipsContainer.appendChild(chip);
        });
        cell.appendChild(chipsContainer);
        if (hiddenCount > 0) {
            const ov = document.createElement('div');
            ov.className = 'cal-overflow';
            ov.textContent = `+${hiddenCount} more`;
            cell.appendChild(ov);
        }

        // Clickable: open day bookings modal
        cell.addEventListener('click', () => openDayModal(cellDate, rooms, bookings));
        cells.appendChild(cell);
    }
}

// --- Day Bookings Modal ---
window.openDayModal = function(date, rooms, bookings) {
    const modal      = document.getElementById('dayBookingsModal');
    const titleEl    = document.getElementById('dayModalTitle');
    const subtitleEl = document.getElementById('dayModalSubtitle');
    const contentEl  = document.getElementById('dayModalContent');
    if (!modal) return;

    const dateLabel = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (titleEl)    titleEl.textContent    = dateLabel;
    if (subtitleEl) subtitleEl.textContent = 'Room occupancy on this day';

    const d = new Date(date); d.setHours(12,0,0,0);
    const sortedRooms = [...(rooms||[])].sort((a,b) => (parseInt(a.roomNumber||a.number)||0) - (parseInt(b.roomNumber||b.number)||0));

    const rows = sortedRooms.map(room => {
        const status = roomStatusOnDate(room, d, bookings);
        // Find matching booking for detail
        const booking = (bookings||[]).find(b => {
            if (b.roomId !== room.id) return false;
            if (['cancelled','checked-out'].includes(b.status)) return false;
            const start = new Date(b.startDate); start.setHours(0,0,0,0);
            const end   = new Date(b.endDate);   end.setHours(23,59,59,999);
            return d >= start && d <= end;
        });

        const statusBadge = status === 'available'
            ? '<span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">Available</span>'
            : status === 'maintenance'
            ? '<span class="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">Maintenance</span>'
            : '<span class="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">Booked</span>';

        const guestInfo = booking && booking.guest
            ? `<p class="text-xs text-gray-500 mt-0.5">Guest: <span class="font-medium text-gray-700">${booking.guest.name || 'N/A'}</span></p>
               <p class="text-xs text-gray-400">Check-in: ${new Date(booking.startDate).toLocaleDateString('en-GB')} &rarr; Check-out: ${new Date(booking.endDate).toLocaleDateString('en-GB')}</p>`
            : booking
            ? `<p class="text-xs text-gray-400">Check-in: ${new Date(booking.startDate).toLocaleDateString('en-GB')} &rarr; Check-out: ${new Date(booking.endDate).toLocaleDateString('en-GB')}</p>`
            : '';

        return `<div class="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
            <div>
                <p class="text-sm font-bold text-gray-800">Room ${room.roomNumber || room.number} <span class="text-xs font-normal text-gray-500">${room.type}</span></p>
                ${guestInfo}
            </div>
            <div class="ml-3 flex-shrink-0">${statusBadge}</div>
        </div>`;
    }).join('');

    if (contentEl) contentEl.innerHTML = rows || '<p class="text-center text-gray-400 py-8">No rooms found.</p>';
    // Move to body so it renders above any broken nesting/stacking context, then force visibility
    document.body.appendChild(modal);
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.zIndex = '99999';
};

window.closeDayModal = function() {
    const modal = document.getElementById('dayBookingsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = '';
    }
};

// Close modal on backdrop click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('dayBookingsModal');
    if (modal && e.target === modal) modal.classList.add('hidden');
});

// --- 30s Polling ---
function startTrackerPolling() {
    if (_trackerPollingTimer) clearInterval(_trackerPollingTimer);
    _trackerPollingTimer = setInterval(() => {
        const sec = document.getElementById('section-tracker');
        if (sec && !sec.classList.contains('hidden')) {
            fetchRoomsForTracker();
            if (_currentTrackerView === 'calendar') fetchCalendarData();
        }
    }, 30000);
}
window._startTrackerPolling = startTrackerPolling;

async function handleAddRoom(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    // Note: 'status' is not in Add form, backend defaults to available.

    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (response && response.ok) {
        closeModal('roomModal');
        e.target.reset();
        fetchRooms();
    } else {
        const err = await response.json().catch(() => ({}));
        alert('Failed to add room: ' + (err.error || 'Unknown error'));
    }
}

window.deleteRoom = async function (id) {
    if (!confirm('Are you sure you want to delete this room?')) return;

    const response = await authFetch(`/rooms/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        fetchRooms();
    } else {
        try {
            const errData = await response.json();
            alert(errData.error || 'Failed to delete room');
        } catch {
            alert('Failed to delete room');
        }
    }
};

window.openEditRoomModal = function (roomId) {
    const room = window.currentRooms.find(r => r.id === roomId);
    if (!room) return;

    document.getElementById('editRoomId').value = room.id;
    document.getElementById('editRoomNumber').value = room.roomNumber || room.number || '';
    document.getElementById('editRoomType').value = room.type;
    document.getElementById('editRoomPrice').value = room.pricePerNight || room.price || 0;
    document.getElementById('editRoomDescription').value = room.description || '';
    const discountInput = document.getElementById('editRoomDiscount');
    if (discountInput) discountInput.value = room.discount || 0;

    // Parse existing JSON string of amenities into a comma-separated string for the textarea
    let amenitiesStr = '';
    if (room.amenities) {
        try {
            const arr = JSON.parse(room.amenities);
            if (Array.isArray(arr)) amenitiesStr = arr.join(', ');
            else amenitiesStr = room.amenities;
        } catch(e) {
            amenitiesStr = room.amenities;
        }
    }
    const editAmenitiesInput = document.getElementById('editRoomAmenities');
    if (editAmenitiesInput) {
        editAmenitiesInput.value = amenitiesStr;
    }
    const statusSelect = document.getElementById('editRoomStatus');
    if (statusSelect) {
        if (room.status) {
            statusSelect.value = (room.status === 'occupied' || room.status === 'reserved') ? 'booked' : room.status;
        } else {
            statusSelect.value = room.available ? 'available' : 'booked';
        }
    }

    openModal('editRoomModal');
};

async function handleEditRoom(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const id = formData.get('id');

    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/rooms/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (response && response.ok) {
        closeModal('editRoomModal');
        fetchRooms();
    } else {
        const err = await response.json().catch(() => ({}));
        alert('Failed to update room: ' + (err.error || 'Unknown error'));
    }
}

// --- MENU MANAGEMENT ---

async function fetchMenu() {
    const tbody = document.getElementById('menuTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center">Loading...</td></tr>';

    const response = await fetch(`${API_URL}/menu`);
    if (response && response.ok) {
        const items = await response.json();
        // Store items globally to easily find them later for editing
        window.currentMenuItems = items;
        renderMenu(items);
    } else {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Failed to load menu</td></tr>';
    }
}

function renderMenu(items) {
    const tbody = document.getElementById('menuTableBody');
    tbody.innerHTML = '';

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center">No menu items found.</td></tr>';
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Image" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap block md:table-cell text-right md:text-left">
                <span class="md:hidden font-bold mr-2 text-gray-500 float-left">Image:</span>
                <img src="${item.image || 'images/placeholder-food.jpg'}" class="h-10 w-10 md:h-10 md:w-10 rounded-full object-cover inline-block" onerror="this.src='https://placehold.co/40x40?text=Food'">
            </td>
            <td data-label="Name" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap font-medium text-xs md:text-sm block md:table-cell text-right md:text-left"><span class="md:hidden font-bold mr-2 text-gray-500 float-left">Name:</span>${item.name}</td>
            <td data-label="Category" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm block md:table-cell text-right md:text-left"><span class="md:hidden font-bold mr-2 text-gray-500 float-left">Category:</span>${item.category}</td>
            <td data-label="Price" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm block md:table-cell text-right md:text-left"><span class="md:hidden font-bold mr-2 text-gray-500 float-left">Price:</span>₦${item.price.toLocaleString()}</td>
            <td data-label="Available" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap block md:table-cell text-right md:text-left">
                <span class="md:hidden font-bold mr-2 text-gray-500 float-left">Available:</span>
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                    ${item.available ? 'Yes' : 'No'}
                </span>
            </td>
            <td data-label="Actions" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-right text-xs md:text-sm font-medium block md:table-cell">
                 <button onclick="openEditMenuModal(${item.id})" class="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                <button onclick="deleteMenuItem(${item.id})" class="text-red-600 hover:text-red-900">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleAddMenu(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Explicitly set available to true if not present (checkbox) or just default
    // Since we don't have a checkbox in the form for available yet, we assume true as per default schema
    // If we added a checkbox, we'd handle it here.
    formData.append('available', 'true');

    // Remove empty file object if user didn't select one? 
    // Multer handles empty file fine (req.file will be undefined).

    // Note: We do NOT set Content-Type header manually for FormData.
    const response = await fetch(`${API_URL}/menu`, {
        method: 'POST',
        body: formData
    });

    if (response && response.ok) {
        closeModal('menuModal');
        e.target.reset();
        fetchMenu();
    } else {
        const err = await response.json().catch(() => ({}));
        alert('Failed to add menu item: ' + (err.error || 'Unknown error'));
    }
}

function openEditMenuModal(menuId) {
    console.log('openEditMenuModal called with ID:', menuId, typeof menuId);

    if (!window.currentMenuItems) {
        console.error('window.currentMenuItems is undefined or empty');
        alert('Error: Menu items not loaded. Try refreshing.');
        return;
    }

    // Try finding by number and string to be safe
    const item = window.currentMenuItems.find(i => i.id == menuId); // Weak equality

    console.log('Found item:', item);

    if (!item) {
        console.error('Item not found in currentMenuItems:', window.currentMenuItems);
        alert('Error: Item not found!');
        return;
    }

    try {
        document.getElementById('editMenuId').value = item.id;
        document.getElementById('editMenuName').value = item.name;
        document.getElementById('editMenuCategory').value = item.category;
        document.getElementById('editMenuPrice').value = item.price;
        document.getElementById('editMenuDescription').value = item.description || '';

        // Status select
        const statusSelect = document.getElementById('editMenuAvailable');
        if (statusSelect) {
            statusSelect.value = item.available ? 'true' : 'false';
        }

        console.log('Opening edit modal...');
        openModal('editMenuModal');
    } catch (e) {
        console.error('Error populating edit modal:', e);
        alert('Error opening edit modal: ' + e.message);
    }
}

async function handleEditMenu(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const id = formData.get('id');

    // Note: server.js expects 'available' as standard param.
    // formData.get('available') will be "true" or "false" string from select

    // Auth check? Server uses upload.single so maybe tricky with authFetch helper if it enforces JSON.
    // We should use fetch with Authorization header manually for FormData
    const token = localStorage.getItem('adminToken');

    const response = await fetch(`${API_URL}/menu/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
            // Don't set Content-Type, letting browser set boundary
        },
        body: formData
    });

    if (response && response.ok) {
        closeModal('editMenuModal');
        fetchMenu();
    } else {
        alert('Failed to update menu item');
    }
}

window.deleteMenuItem = async function (id) {
    if (!confirm('Delete this item?')) return;
    const response = await authFetch(`/menu/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        fetchMenu();
    } else {
        alert('Failed to delete item');
    }
};

// --- ORDERS MANAGEMENT ---

async function fetchOrders() {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '<div class="text-center py-10">Loading transactions...</div>';

    try {
        const [ordersRes, bookingsRes] = await Promise.all([
            authFetch('/orders'),
            authFetch('/bookings')
        ]);

        let allTransactions = [];

        if (ordersRes && ordersRes.ok) {
            const orders = await ordersRes.json();
            // Tag them
            orders.forEach(o => o.type = 'order');
            allTransactions = [...allTransactions, ...orders];
        }

        if (bookingsRes && bookingsRes.ok) {
            const bookings = await bookingsRes.json();
            // Tag them
            bookings.forEach(b => b.type = 'booking');
            allTransactions = [...allTransactions, ...bookings];
        }

        // Sort by date desc
        allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Store globally for search filtering
        window.allTransactions = allTransactions;

        renderOrders(allTransactions);
        // Reset search UI
        const searchInput = document.getElementById('bookingSearchInput');
        if (searchInput) searchInput.value = '';
        const typeFilter = document.getElementById('bookingTypeFilter');
        if (typeFilter) typeFilter.value = 'all';
        const statusFilter = document.getElementById('bookingStatusFilter');
        if (statusFilter) statusFilter.value = 'all';
        const countEl = document.getElementById('searchResultCount');
        if (countEl) countEl.textContent = `Showing ${allTransactions.length} transaction(s)`;

    } catch (error) {
        console.error("Error fetching transactions:", error);
        container.innerHTML = '<div class="text-center py-10 text-red-500">Failed to load transactions</div>';
    }
}

function renderOrders(items) {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-gray-500">No active orders or bookings found.</div>';
        return;
    }

    // Show/hide the bulk toolbar based on whether there are items
    const toolbar = document.getElementById('bulkToolbar');
    if (toolbar) toolbar.classList.toggle('hidden', items.length === 0);
    window._bulkAllSelected = false;

    items.forEach(item => {
        const isBooking = item.type === 'booking';

        const card = document.createElement('div');
        const borderColor = isBooking ? 'border-blue-500' : getStatusColor(item.status);
        card.className = `bg-white rounded-lg shadow p-6 border-l-4 ${borderColor} relative`;
        card.dataset.id   = item.id;
        card.dataset.type = item.type;

        const date = new Date(item.createdAt || Date.now()).toLocaleString();

        let itemsListHtml = '';
        let title = '';
        let statusBadge = '';

        if (isBooking) {
            title = `Booking #${item.id}`;
            const nights = Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24));
            itemsListHtml = `
                <li><strong>Room Booking</strong></li>
                <li>Room: ${item.room ? item.room.number + ' (' + item.room.type + ')' : 'N/A'}</li>
                <li>Check-in: ${new Date(item.startDate).toLocaleDateString()}</li>
                <li>Duration: ${nights} night(s)</li>
            `;
            statusBadge = `<span class="inline-block px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 uppercase mt-1">${item.status}</span>`;
        } else {
            title = `Order #${item.id}`;
            itemsListHtml = item.orderItems ? item.orderItems.map(i =>
                `<li>${i.quantity}x ${i.menuItem?.name || 'Item'} - ₦${i.unitPrice}</li>`
            ).join('') : '<li>No details</li>';
            statusBadge = `<span class="inline-block px-2 py-1 text-xs font-semibold rounded bg-gray-100 uppercase mt-1">${item.status}</span>`;
        }

        card.innerHTML = `
            <!-- Bulk select checkbox -->
            <label class="absolute top-4 right-4 flex items-center gap-1.5 cursor-pointer select-none z-10">
                <input type="checkbox" class="bulk-checkbox w-4 h-4 accent-red-600 rounded"
                    data-id="${item.id}" data-type="${item.type}"
                    onchange="updateBulkCount()">
                <span class="text-xs text-gray-400">Select</span>
            </label>

            <div class="flex justify-between items-start mb-4 pr-20">
                <div>
                    <h3 class="text-lg font-bold flex items-center">
                        ${isBooking ? '<span class="mr-2">📅</span>' : '<span class="mr-2">🍽️</span>'}
                        ${title}
                    </h3>
                    <p class="text-sm text-gray-500">${date}</p>
                    <p class="text-sm font-medium mt-1">
                        ${item.guest ? item.guest.name : 'Unknown Guest'} 
                        ${item.room && !isBooking ? '(Room ' + item.room.roomNumber + ')' : ''}
                    </p>
                </div>
                <div class="text-right">
                    <p class="text-xl font-bold text-blue-600">₦${item.totalAmount?.toLocaleString()}</p>
                    ${statusBadge}
                </div>
            </div>
            <div class="border-t border-b border-gray-100 py-3 my-3">
                <ul class="list-disc list-inside text-sm text-gray-700">
                    ${itemsListHtml}
                </ul>
            </div>
            <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                <div class="flex items-center gap-3">
                    <button onclick="editTransaction(${item.id}, '${item.type}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                    <button onclick="deleteTransaction(${item.id}, '${item.type}')" class="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
                    <button onclick="printReceipt(${item.id}, '${item.type}')" class="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm font-medium border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 transition">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                        Receipt
                    </button>
                </div>
                <div class="flex space-x-2">
                     ${!isBooking && item.status !== 'completed' && item.status !== 'cancelled' ? `
                        <button onclick="updateOrderStatus(${item.id}, 'completed')" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition">Mark Completed</button>
                        <button onclick="updateOrderStatus(${item.id}, 'cancelled')" class="bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200 transition">Cancel</button>
                     ` : ''}
                     ${isBooking && item.status === 'pending' ? `
                        <button onclick="confirmBooking(${item.id})" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">Confirm Payment</button>
                        <button onclick="cancelBooking(${item.id})" class="bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200 transition">Cancel</button>
                     ` : ''}
                     ${isBooking && item.status === 'confirmed' ? `
                        <button onclick="checkInBooking(${item.id})" class="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition">Check In</button>
                     ` : ''}
                     ${isBooking && item.status === 'checked-in' ? `
                        <button onclick="openCheckoutModal(${item.id})" class="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700 transition">Check Out</button>
                     ` : ''}
                     ${isBooking && !['pending', 'confirmed', 'checked-in'].includes(item.status) ? `<span class="text-xs text-gray-400 capitalize font-medium">Status: ${item.status}</span>` : ''}
                     ${!isBooking && (item.status === 'completed' || item.status === 'cancelled') ? '<span class="text-gray-400 text-sm">No actions available</span>' : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- BULK SELECTION HELPERS ---
window.updateBulkCount = function () {
    const checked = document.querySelectorAll('.bulk-checkbox:checked');
    const all     = document.querySelectorAll('.bulk-checkbox');
    const countEl = document.getElementById('bulkCount');
    const btn     = document.getElementById('bulkSelectAllBtn');
    if (countEl) countEl.textContent = `${checked.length} selected`;
    if (btn) btn.textContent = checked.length === all.length ? '✓ Deselect All' : '✓ Select All';
};

window.bulkSelectAll = function () {
    const all     = document.querySelectorAll('.bulk-checkbox');
    const checked = document.querySelectorAll('.bulk-checkbox:checked');
    const shouldCheck = checked.length < all.length;
    all.forEach(cb => cb.checked = shouldCheck);
    updateBulkCount();
};

window.bulkClearSelection = function () {
    document.querySelectorAll('.bulk-checkbox').forEach(cb => cb.checked = false);
    updateBulkCount();
};

// --- BULK DELETE ---
window.bulkDeleteTransactions = async function () {
    const checked = Array.from(document.querySelectorAll('.bulk-checkbox:checked'));
    if (checked.length === 0) { alert('No items selected.'); return; }

    const bookings = checked.filter(cb => cb.dataset.type === 'booking');
    const orders   = checked.filter(cb => cb.dataset.type === 'order');

    const confirmMsg = [
        `You are about to permanently delete ${checked.length} record(s):`,
        bookings.length ? `  • ${bookings.length} Room Booking(s)` : '',
        orders.length   ? `  • ${orders.length} Food Order(s)` : '',
        '',
        'This also removes associated payment records. Continue?'
    ].filter(Boolean).join('\n');

    if (!confirm(confirmMsg)) return;

    const btn = document.getElementById('bulkDeleteBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Deleting…'; }

    const results = await Promise.allSettled(
        checked.map(cb => {
            const endpoint = cb.dataset.type === 'booking' ? `/bookings/${cb.dataset.id}` : `/orders/${cb.dataset.id}`;
            return authFetch(endpoint, { method: 'DELETE' });
        })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length;
    const failed    = results.length - succeeded;

    if (btn) { btn.disabled = false; btn.textContent = '🗑 Delete Selected'; }

    if (failed === 0) {
        alert(`✅ ${succeeded} record(s) deleted successfully.`);
    } else {
        alert(`⚠️ ${succeeded} deleted, ${failed} failed (they may have linked data).`);
    }

    fetchOrders();
};

window.confirmBooking = async function (id) {
    if (!confirm('Confirm payment for this booking? This will send the confirmation email to the guest.')) return;

    const response = await authFetch(`/bookings/${id}/confirm`, {
        method: 'PUT'
    });

    if (response && response.ok) {
        alert('Booking confirmed and email sent!');
        fetchOrders();
    } else {
        const err = await response.json().catch(() => ({}));
        alert('Failed to confirm booking: ' + (err.error || 'Unknown error'));
    }
};

window.cancelBooking = async function (id) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    const response = await authFetch(`/bookings/${id}/cancel`, {
        method: 'PUT'
    });

    if (response && response.ok) {
        alert('Booking cancelled.');
        fetchOrders();
    } else {
        alert('Failed to cancel booking.');
    }
};

// --- TRANSACTION SEARCH / FILTER ---
window.filterTransactions = function () {
    if (!window.allTransactions) return;

    const query = (document.getElementById('bookingSearchInput')?.value || '').toLowerCase().trim();
    const typeVal = document.getElementById('bookingTypeFilter')?.value || 'all';
    const statusVal = document.getElementById('bookingStatusFilter')?.value || 'all';
    const dateFrom = document.getElementById('dateFrom')?.value || '';  // 'YYYY-MM-DD'
    const dateTo = document.getElementById('dateTo')?.value || '';

    // Build date boundaries (start of day / end of day)
    const fromDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const toDate   = dateTo   ? new Date(dateTo   + 'T23:59:59') : null;

    const filtered = window.allTransactions.filter(item => {
        // Type filter
        if (typeVal !== 'all' && item.type !== typeVal) return false;

        // Status filter
        if (statusVal !== 'all' && item.status !== statusVal) return false;

        // Date range filter
        // For bookings: match createdAt OR startDate (check-in)
        // For orders: match createdAt
        if (fromDate || toDate) {
            const created  = item.createdAt  ? new Date(item.createdAt)  : null;
            const checkIn  = item.startDate  ? new Date(item.startDate)  : null;

            // A transaction passes if ANY relevant date falls in range
            const inRange = (d) => d && (!fromDate || d >= fromDate) && (!toDate || d <= toDate);

            if (!inRange(created) && !inRange(checkIn)) return false;
        }

        // Text search
        if (query) {
            const guestName  = (item.guest?.name  || '').toLowerCase();
            const guestEmail = (item.guest?.email || '').toLowerCase();
            const bookingId  = String(item.id);
            const roomNum    = String(item.room?.number || item.room?.roomNumber || '');
            const roomType   = (item.room?.type || '').toLowerCase();

            if (
                !guestName.includes(query)  &&
                !guestEmail.includes(query) &&
                !bookingId.includes(query)  &&
                !roomNum.includes(query)    &&
                !roomType.includes(query)
            ) return false;
        }

        return true;
    });

    renderOrders(filtered);

    const countEl = document.getElementById('searchResultCount');
    if (countEl) {
        const isFiltered = query || typeVal !== 'all' || statusVal !== 'all' || dateFrom || dateTo;
        countEl.textContent = isFiltered
            ? `${filtered.length} result(s) found`
            : `Showing ${filtered.length} transaction(s)`;
    }
};

window.clearTransactionFilters = function () {
    const searchInput = document.getElementById('bookingSearchInput');
    if (searchInput) searchInput.value = '';
    const typeFilter = document.getElementById('bookingTypeFilter');
    if (typeFilter) typeFilter.value = 'all';
    const statusFilter = document.getElementById('bookingStatusFilter');
    if (statusFilter) statusFilter.value = 'all';
    const dateFrom = document.getElementById('dateFrom');
    if (dateFrom) dateFrom.value = '';
    const dateTo = document.getElementById('dateTo');
    if (dateTo) dateTo.value = '';

    if (window.allTransactions) {
        renderOrders(window.allTransactions);
        const countEl = document.getElementById('searchResultCount');
        if (countEl) countEl.textContent = `Showing ${window.allTransactions.length} transaction(s)`;
    }
};

function getStatusColor(status) {
    switch (status) {
        case 'pending': return 'border-yellow-500';
        case 'completed': return 'border-green-500';
        case 'cancelled': return 'border-red-500';
        default: return 'border-gray-500';
    }
}

window.updateOrderStatus = async function (id, status) {
    if (!confirm(`Mark order #${id} as ${status}?`)) return;

    const response = await fetch(`${API_URL}/orders/${id}`, { // Note: PUT orders might not be auth protected in snippet, but likely is. Let's try raw fetch if snippet said no auth, or authFetch if yes.
        // Checking snippet: app.put("/api/orders/:id", async... ) -> NO AUTH shown in snippet line 717.
        // User might have added it, but strictly following snippet.
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });

    if (response && response.ok) {
        fetchOrders();
    } else {
        alert('Failed to update order');
    }
};

// --- MODAL UTILS ---

// --- WALK-IN MANAGEMENT ---

async function fetchAvailableRoomsForWalkIn() {
    const select = document.getElementById('walkInRoomSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Loading available rooms...</option>';

    try {
        const response = await fetch(`${API_URL}/rooms`);
        if (response && response.ok) {
            const rooms = await response.json();
            const availableRooms = rooms.filter(r => r.available);

            if (availableRooms.length === 0) {
                select.innerHTML = '<option value="">No rooms currently available</option>';
                return;
            }

            let optionsHtml = '<option value="">-- Select a Room --</option>';
            optionsHtml += availableRooms.map(r =>
                `<option value="${r.id}">${r.roomNumber || r.number} - ${r.type} (₦${(r.pricePerNight || r.price).toLocaleString()})</option>`
            ).join('');
            
            select.innerHTML = optionsHtml;
        } else {
            select.innerHTML = '<option value="">Failed to load rooms. Try refreshing.</option>';
        }
    } catch (error) {
        console.error("Error fetching rooms for walk-in:", error);
        select.innerHTML = '<option value="">Error loading rooms</option>';
    }
}

async function handleWalkInSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Processing...';

    const formData = new FormData(e.target);

    try {
        // 1. Create Guest
        const idType   = formData.get('idType')   || '';
        const idNumber = formData.get('idNumber')  || '';
        const address  = formData.get('guestAddress') || '';

        const guestData = {
            name:  formData.get('guestName'),
            phone: formData.get('guestPhone'),
            email: formData.get('guestEmail'),
            ...(address  && { address }),
            ...(idNumber && { idNumber: idType ? `${idType}: ${idNumber}` : idNumber })
        };

        const guestResponse = await fetch(`${API_URL}/guests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(guestData)
        });

        if (!guestResponse.ok) {
            const errData = await guestResponse.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to create guest record');
        }
        const guestResult = await guestResponse.json();
        const guestId = guestResult.guest.id;

        // 2. Create Booking
        const paymentStatus = formData.get('paymentStatus'); // 'paid' or 'pending'
        const staffNotes    = formData.get('staffNotes') || '';
        const discountPct   = parseFloat(formData.get('bookingDiscount') || '0') || 0;
        
        const bookingData = {
            guestId: guestId,
            roomId: formData.get('roomId'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            checkInTime: formData.get('checkInTime'),
            checkOutTime: formData.get('checkOutTime'),
            bookedBy: formData.get('bookedBy'),
            status: paymentStatus === 'paid' ? 'confirmed' : 'pending',
            ...(staffNotes && { specialRequests: staffNotes }),
            ...(discountPct > 0 && { discountPct })
        };

        const bookingResponse = await authFetch('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });

        if (bookingResponse && bookingResponse.ok) {
            const bookingResult = await bookingResponse.json();
            let successMsg = paymentStatus === 'paid' 
                ? 'Guest successfully registered and payment confirmed!' 
                : 'Guest registered! Booking is PENDING payment verification.';
            if (discountPct > 0) {
                successMsg += `\n\nDiscount of ${discountPct}% applied.`;
            }
            if (staffNotes) {
                successMsg += `\n\n📝 Staff notes saved.`;
            }
            alert(successMsg);
            e.target.reset();
            if (paymentStatus === 'paid') {
                switchTab('rooms'); 
            } else {
                switchTab('orders'); // Admin can confirm it here
            }
        } else {
            const err = await bookingResponse.json();
            throw new Error(err.error || 'Failed to create booking');
        }

    } catch (error) {
        console.error(error);
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

 
// --- GUEST MANAGEMENT ---
 
async function fetchGuests() {
    const tbody = document.getElementById('guestsTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center">Loading guests...</td></tr>';
 
    const response = await authFetch('/guests');
    if (response && response.ok) {
        const guests = await response.json();
        window.allGuests = guests;
        renderGuests(guests);
        // Reset search
        const searchInput = document.getElementById('guestSearchInput');
        if (searchInput) searchInput.value = '';
        const countEl = document.getElementById('guestResultCount');
        if (countEl) countEl.textContent = `Showing ${guests.length} guest(s)`;
    } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Failed to load guests</td></tr>';
    }
}
 
function renderGuests(guests) {
    const tbody = document.getElementById('guestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
 
    if (guests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center">No guests found.</td></tr>';
        return;
    }
 
    guests.forEach(guest => {
        const tr = document.createElement('tr');
        const bookingCount = guest.bookings ? guest.bookings.length : 0;
        const blacklistBadge = guest.isBlacklisted 
            ? '<span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Blacklisted</span>' 
            : '';
        
        tr.innerHTML = `
            <td data-label="Guest" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap block md:table-cell text-right md:text-left">
                <span class="md:hidden font-bold mr-2 text-gray-500 float-left">Guest:</span>
                <div class="font-medium text-gray-900">${guest.name} ${blacklistBadge}</div>
            </td>
            <td data-label="Contact" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap block md:table-cell text-right md:text-left">
                <span class="md:hidden font-bold mr-2 text-gray-500 float-left">Contact:</span>
                <div class="text-sm text-gray-900">${guest.email}</div>
                <div class="text-sm text-gray-500">${guest.phone}</div>
            </td>
            <td data-label="History" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap block md:table-cell text-right md:text-left text-sm text-gray-500">
                <span class="md:hidden font-bold mr-2 text-gray-500 float-left">Stays:</span>
                ${bookingCount} Booking(s)
            </td>
            <td data-label="Actions" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-right text-sm font-medium block md:table-cell">
                <button onclick="editGuest(${guest.id})" class="text-indigo-600 hover:text-indigo-900 font-medium mr-3">Edit</button>
                <button onclick="viewGuestHistory(${guest.id})" class="text-blue-600 hover:text-blue-900 font-medium mr-3">View History</button>
                <button onclick="deleteGuest(${guest.id}, '${guest.name.replace(/'/g, "\\'")}')"
                    class="text-red-600 hover:text-red-900 font-medium">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
 
// --- EDIT GUEST LOGIC ---
window.editGuest = function(id) {
    const guest = window.allGuests.find(g => g.id === id);
    if (!guest) return;
    
    document.getElementById('editGuestId').value = guest.id;
    document.getElementById('editGuestName').value = guest.name || '';
    document.getElementById('editGuestEmail').value = guest.email || '';
    document.getElementById('editGuestPhone').value = guest.phone || '';
    document.getElementById('editGuestIdNumber').value = guest.idNumber || '';
    document.getElementById('editGuestAddress').value = guest.address || '';
    document.getElementById('editGuestBlacklisted').value = guest.isBlacklisted ? "true" : "false";

    openModal('editGuestModal');
};

document.addEventListener('DOMContentLoaded', () => {
    const editGuestForm = document.getElementById('editGuestForm');
    if (editGuestForm) {
        editGuestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editGuestId').value;
            const data = {
                name: document.getElementById('editGuestName').value,
                email: document.getElementById('editGuestEmail').value,
                phone: document.getElementById('editGuestPhone').value,
                idNumber: document.getElementById('editGuestIdNumber').value,
                address: document.getElementById('editGuestAddress').value,
                isBlacklisted: document.getElementById('editGuestBlacklisted').value === 'true'
            };

            try {
                const response = await authFetch(`/guests/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    closeModal('editGuestModal');
                    showToast('Guest details updated successfully.', 'success');
                    fetchGuests(); // Refresh table
                } else {
                    const result = await response.json();
                    showToast(result.error || 'Failed to update guest.', 'error');
                }
            } catch (error) {
                console.error("Error updating guest:", error);
                showToast('Error updating guest details.', 'error');
            }
        });
    }
});

// --- GUEST SEARCH FILTER ---
window.filterGuests = function () {
    if (!window.allGuests) return;
    const query = (document.getElementById('guestSearchInput')?.value || '').toLowerCase().trim();

    const filtered = query
        ? window.allGuests.filter(g =>
            (g.name || '').toLowerCase().includes(query) ||
            (g.email || '').toLowerCase().includes(query) ||
            (g.phone || '').toLowerCase().includes(query)
          )
        : window.allGuests;

    renderGuests(filtered);

    const countEl = document.getElementById('guestResultCount');
    if (countEl) {
        countEl.textContent = query
            ? `${filtered.length} result(s) found`
            : `Showing ${filtered.length} guest(s)`;
    }
};

// --- DELETE GUEST ---
window.deleteGuest = async function(id, name) {
    if (!confirm(`Are you sure you want to delete guest "${name}"?\n\nThis will soft-delete them and move their record to the Vault.`)) return;
    
    try {
        const response = await authFetch(`/guests/${id}`, { method: 'DELETE' });
        if (response && response.ok) {
            showToast(`Guest "${name}" deleted successfully.`, 'success');
            fetchGuests();
        } else {
            const err = await response.json().catch(() => ({}));
            showToast(err.error || 'Failed to delete guest.', 'error');
        }
    } catch (error) {
        console.error('Error deleting guest:', error);
        showToast('An error occurred while deleting the guest.', 'error');
    }
};
 
// --- SETTINGS MANAGEMENT ---

async function fetchSettings() {
    try {
        const response = await authFetch('/settings');
        if (response && response.ok) {
            const data = await response.json();
            document.getElementById('settingTaxRate').value = data.taxRate || 8.5;
            document.getElementById('settingRoomServiceFee').value = data.roomServiceFee || 1000;
            const roomDiscEl = document.getElementById('settingRoomDiscount');
            if (roomDiscEl) roomDiscEl.value = data.roomDiscount || 0;
            const foodDiscEl = document.getElementById('settingFoodDiscount');
            if (foodDiscEl) foodDiscEl.value = data.foodDiscount || 0;
            document.getElementById('saveSettingsBtn').classList.remove('hidden');
        }
    } catch (e) {
        console.error("Failed to fetch settings:", e);
    }
}

// --- REVIEW MANAGEMENT ---

async function fetchAdminReviews() {
    const container = document.getElementById('reviewsContainer');
    container.innerHTML = '<div class="text-center py-10">Loading reviews...</div>';

    const response = await authFetch('/admin/reviews');
    if (response && response.ok) {
        const reviews = await response.json();
        renderAdminReviews(reviews);
    } else {
        container.innerHTML = '<div class="text-center py-10 text-red-500">Failed to load reviews</div>';
    }
}

function renderAdminReviews(reviews) {
    const container = document.getElementById('reviewsContainer');
    container.innerHTML = '';

    if (reviews.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-gray-500">No reviews found.</div>';
        return;
    }

    reviews.forEach(review => {
        const card = document.createElement('div');
        const isPending = review.status === 'pending';
        const borderColor = isPending ? 'border-yellow-500' : (review.status === 'approved' ? 'border-green-500' : 'border-red-500');

        card.className = `bg-white rounded-lg shadow p-6 border-l-4 ${borderColor}`;

        const stars = '⭐'.repeat(review.rating);
        const date = new Date(review.createdAt).toLocaleDateString();

        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-lg">${review.guestName}</span>
                        <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">${review.guestType || 'Guest'}</span>
                    </div>
                    <div class="text-sm text-gray-500">${date}</div>
                </div>
                <div class="text-xl">${stars}</div>
            </div>
            
            <div class="mb-4">
                <p class="text-gray-800 italic">"${review.content}"</p>
            </div>
            
            <div class="flex justify-between items-center mt-4 border-t pt-4">
                <span class="text-xs font-semibold uppercase tracking-wide ${isPending ? 'text-yellow-600' : (review.status === 'approved' ? 'text-green-600' : 'text-red-600')}">
                    Status: ${review.status}
                </span>
                <div class="space-x-2">
                    ${review.status !== 'approved' ? `
                        <button onclick="approveReview(${review.id})" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition">Approve</button>
                    ` : ''}
                    ${review.status !== 'rejected' && isPending ? `
                        <button onclick="rejectReview(${review.id})" class="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 transition">Reject</button>
                    ` : ''}
                    <button onclick="deleteReview(${review.id})" class="bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200 transition">Delete</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

window.approveReview = async function (id) {
    if (!confirm('Approve this review for public display?')) return;
    const response = await authFetch(`/reviews/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'approved' })
    });
    if (response && response.ok) fetchAdminReviews();
    else alert('Failed to approve review');
};

window.rejectReview = async function (id) {
    if (!confirm('Reject this review?')) return;
    const response = await authFetch(`/reviews/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'rejected' })
    });
    if (response && response.ok) fetchAdminReviews();
    else alert('Failed to reject review');
};

// --- TRANSACTION DELETE/EDIT ---

window.deleteTransaction = async function (id, type) {
    const typeLabel = type === 'booking' ? 'Booking' : 'Food Order';
    if (!confirm(`DANGER: Are you sure you want to permanently delete this ${typeLabel} #${id}? This will also delete associated payment records.`)) return;

    const endpoint = type === 'booking' ? `/bookings/${id}` : `/orders/${id}`;
    const response = await authFetch(endpoint, { method: 'DELETE' });

    if (response && response.ok) {
        alert(`${typeLabel} deleted successfully.`);
        fetchOrders();
    } else {
        alert(`Failed to delete ${typeLabel.toLowerCase()}.`);
    }
};

window.editTransaction = async function (id, type) {
    if (type === 'booking') {
        window.openEditBookingModal(id);
        return;
    }
    const isBooking = type === 'booking';
    const typeLabel = isBooking ? 'Booking' : 'Food Order';
    
    // Simple prompt-based editing for testing purposes
    const newStatus = prompt(`Enter new status for ${typeLabel} #${id} (e.g., pending, confirmed, cancelled, completed, checked-in):`);
    if (newStatus === null) return; // User cancelled

    const newAmount = prompt(`Enter new total amount (optional, leave blank to keep current):`);
    
    const data = { status: newStatus };
    if (newAmount) data.totalAmount = parseFloat(newAmount);

    const endpoint = isBooking ? `/bookings/${id}` : `/orders/${id}`;
    const response = await authFetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

    if (response && response.ok) {
        alert(`${typeLabel} updated successfully.`);
        fetchOrders();
    } else {
        alert(`Failed to update ${typeLabel.toLowerCase()}.`);
    }
};

window.deleteReview = async function (id) {
    if (!confirm('Permanently delete this review?')) return;
    const response = await authFetch(`/reviews/${id}`, { method: 'DELETE' });
    if (response && response.ok) fetchAdminReviews();
    else alert('Failed to delete review');
};

// --- GUEST HISTORY MODAL ---

window.handleHistoryModalClick = function (e) {
    // Close modal if backdrop clicked
    if (e.target.id === 'guestHistoryModal') {
        closeModal('guestHistoryModal');
    }
};

window.viewGuestHistory = async function (guestId) {
    // Show the modal in loading state
    document.getElementById('historyGuestName').textContent = 'Loading…';
    document.getElementById('historyGuestContact').textContent = '';
    const metaEl = document.getElementById('historyGuestMeta');
    if (metaEl) metaEl.innerHTML = '';
    document.getElementById('historyStats').innerHTML = '';
    document.getElementById('historyBookingList').innerHTML = '<p class="text-center text-gray-400 py-6">Loading history…</p>';
    openModal('guestHistoryModal');

    // Fetch full guest detail via dedicated endpoint
    const res = await authFetch(`/guests/${guestId}`);
    if (!res || !res.ok) {
        document.getElementById('historyBookingList').innerHTML = '<p class="text-center text-red-500 py-6">Failed to load guest data.</p>';
        return;
    }

    const guest = await res.json();

    // Store globally for blacklist toggle action
    window.currentHistoryGuest = guest;

    // Populate header
    document.getElementById('historyGuestName').textContent = guest.name;
    if (guest.isBlacklisted) {
        document.getElementById('historyGuestName').innerHTML += ' <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Blacklisted</span>';
    }
    document.getElementById('historyGuestContact').textContent = `${guest.email}  •  ${guest.phone || 'No phone recorded'}`;

    // Meta pills (member since, ID, address)
    if (metaEl) {
        const since = guest.createdAt ? new Date(guest.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : null;
        let pills = '';
        if (since) pills += `<span class="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">📅 Member since ${since}</span>`;
        if (guest.idNumber) pills += `<span class="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">🪪 ID: ${guest.idNumber}</span>`;
        if (guest.address)  pills += `<span class="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">📍 ${guest.address}</span>`;
        metaEl.innerHTML = pills;
    }

    // Configure Blacklist Button
    const blacklistBtn = document.getElementById('toggleBlacklistBtn');
    if (guest.isBlacklisted) {
        blacklistBtn.textContent = 'Remove from Blacklist';
        blacklistBtn.className = 'px-4 py-2 text-sm font-medium rounded-lg transition bg-gray-100 text-gray-700 hover:bg-gray-200';
    } else {
        blacklistBtn.textContent = 'Blacklist Guest';
        blacklistBtn.className = 'px-4 py-2 text-sm font-medium rounded-lg transition bg-red-50 text-red-600 hover:bg-red-100';
    }

    const bookings = guest.bookings || [];
    const orders = guest.orders || [];

    // Calculate stats
    const totalSpent = [
        ...bookings.map(b => b.totalAmount || 0),
        ...orders.map(o => o.totalAmount || 0)
    ].reduce((a, c) => a + c, 0);

    const confirmedBookings = bookings.filter(b => ['confirmed', 'checked-in', 'completed'].includes(b.status)).length;

    document.getElementById('historyStats').innerHTML = `
        <div class="text-center px-2 py-4 bg-gray-50">
            <p class="text-2xl font-bold text-blue-600">${bookings.length}</p>
            <p class="text-xs text-gray-500 mt-1">Room Bookings</p>
        </div>
        <div class="text-center px-2 py-4 bg-gray-50">
            <p class="text-2xl font-bold text-green-600">${confirmedBookings}</p>
            <p class="text-xs text-gray-500 mt-1">Confirmed Stays</p>
        </div>
        <div class="text-center px-2 py-4 bg-gray-50">
            <p class="text-2xl font-bold text-orange-500">${orders.length}</p>
            <p class="text-xs text-gray-500 mt-1">Food Orders</p>
        </div>
        <div class="text-center px-2 py-4 bg-gray-50">
            <p class="text-xl font-bold text-purple-600">₦${totalSpent.toLocaleString()}</p>
            <p class="text-xs text-gray-500 mt-1">Total Spent</p>
        </div>
    `;

    if (bookings.length === 0 && orders.length === 0) {
        document.getElementById('historyBookingList').innerHTML = '<p class="text-center text-gray-400 py-6">No transactions on record for this guest.</p>';
        return;
    }

    // Combine & sort descending
    window._historyItems = [
        ...bookings.map(b => ({ ...b, _type: 'booking' })),
        ...orders.map(o => ({ ...o, _type: 'order' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Render via tab filter (defaults to "All")
    filterHistoryTab('all', true);
};

// --- HISTORY TAB FILTER ---
window.filterHistoryTab = function (tab, silent) {
    // Update tab styles
    const tabs = { all: 'historyTabAll', booking: 'historyTabBooking', order: 'historyTabOrder' };
    Object.entries(tabs).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (key === tab) {
            el.className = 'px-4 py-2.5 text-sm font-semibold border-b-2 border-blue-600 text-blue-600 transition mr-1';
        } else {
            el.className = 'px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition mr-1';
        }
    });

    const items = window._historyItems || [];
    const filtered = tab === 'all' ? items : items.filter(i => i._type === tab);
    renderHistoryItems(filtered);
};

function renderHistoryItems(items) {
    const listEl = document.getElementById('historyBookingList');
    if (!listEl) return;

    if (items.length === 0) {
        listEl.innerHTML = '<p class="text-center text-gray-400 py-8">No records in this category.</p>';
        return;
    }

    const statusColors = {
        pending:      'bg-yellow-100 text-yellow-700',
        confirmed:    'bg-blue-100 text-blue-700',
        'checked-in': 'bg-indigo-100 text-indigo-700',
        'checked-out': 'bg-purple-100 text-purple-700',
        completed:    'bg-green-100 text-green-700',
        cancelled:    'bg-red-100 text-red-700',
    };

    listEl.innerHTML = items.map(item => {
        const isBooking = item._type === 'booking';
        const date = new Date(item.createdAt).toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
        const badgeClass = statusColors[item.status] || 'bg-gray-100 text-gray-700';

        if (isBooking) {
            const nights = item.startDate && item.endDate
                ? Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / 86400000)
                : '?';
            const checkIn  = item.startDate ? new Date(item.startDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : 'N/A';
            const checkOut = item.endDate   ? new Date(item.endDate).toLocaleDateString('en-GB',   { day:'numeric', month:'short', year:'numeric' }) : 'N/A';
            const roomLabel = item.room ? `${item.room.number || item.room.roomNumber} – ${item.room.type}` : 'N/A';
            const pricePerNight = item.room?.pricePerNight ? `₦${Number(item.room.pricePerNight).toLocaleString()}/night` : '';

            // Payment rows
            let paymentHtml = '';
            if (item.payments && item.payments.length > 0) {
                paymentHtml = `
                <div class="mt-3 pt-3 border-t border-blue-200">
                    <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Payments</p>
                    <div class="space-y-1">
                    ${item.payments.map(p => `
                        <div class="flex justify-between text-xs text-gray-700">
                            <span>${p.method || 'N/A'}${p.reference ? ' · Ref: ' + p.reference : ''}</span>
                            <span class="font-medium">₦${Number(p.amount || 0).toLocaleString()} <span class="text-gray-400">(${p.status})</span></span>
                        </div>
                    `).join('')}
                    </div>
                </div>`;
            }

            return `
            <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-sm font-bold text-gray-800">📅 Booking #GL-${item.id}</span>
                            <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass} uppercase">${item.status}</span>
                        </div>
                        <p class="text-xs text-gray-400">${date}</p>
                    </div>
                    <p class="text-base font-bold text-blue-700">₦${Number(item.totalAmount || 0).toLocaleString()}</p>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-700">
                    <div><span class="font-semibold text-gray-500">Room:</span> ${roomLabel}</div>
                    <div><span class="font-semibold text-gray-500">Rate:</span> ${pricePerNight}</div>
                    <div><span class="font-semibold text-gray-500">Check-in:</span> ${checkIn}</div>
                    <div><span class="font-semibold text-gray-500">Check-out:</span> ${checkOut}</div>
                    <div><span class="font-semibold text-gray-500">Duration:</span> ${nights} night(s)</div>
                </div>
                ${item.specialRequests ? `
                <div class="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p class="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">📝 Staff Notes</p>
                    <p class="text-xs text-amber-900 whitespace-pre-wrap">${item.specialRequests}</p>
                </div>` : ''}
                ${paymentHtml}
            </div>`;


        } else {
            // Food order
            const roomLabel = item.room ? `Room ${item.room.number || item.room.roomNumber}` : 'N/A';
            const itemRows = (item.orderItems || []).map(i => {
                const subtotal = Number(i.unitPrice || 0) * Number(i.quantity || 1);
                return `<div class="flex justify-between text-xs text-gray-700">
                    <span>${i.quantity}× ${i.menuItem?.name || 'Item'}</span>
                    <span>₦${Number(i.unitPrice || 0).toLocaleString()} × ${i.quantity} = <span class="font-medium">₦${subtotal.toLocaleString()}</span></span>
                </div>`;
            }).join('') || '<div class="text-xs text-gray-400">No item details</div>';

            let paymentHtml = '';
            if (item.payments && item.payments.length > 0) {
                paymentHtml = `
                <div class="mt-3 pt-3 border-t border-orange-200">
                    <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Payments</p>
                    <div class="space-y-1">
                    ${item.payments.map(p => `
                        <div class="flex justify-between text-xs text-gray-700">
                            <span>${p.method || 'N/A'}${p.reference ? ' · Ref: ' + p.reference : ''}</span>
                            <span class="font-medium">₦${Number(p.amount || 0).toLocaleString()} <span class="text-gray-400">(${p.status})</span></span>
                        </div>
                    `).join('')}
                    </div>
                </div>`;
            }

            return `
            <div class="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-sm font-bold text-gray-800">🍽️ Order #${item.id}</span>
                            <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass} uppercase">${item.status}</span>
                        </div>
                        <p class="text-xs text-gray-400">${date}</p>
                    </div>
                    <p class="text-base font-bold text-orange-600">₦${Number(item.totalAmount || 0).toLocaleString()}</p>
                </div>
                <div class="mt-2 text-xs text-gray-500 mb-2"><span class="font-semibold">Delivery:</span> ${roomLabel}</div>
                <div class="space-y-1 border-t border-orange-200 pt-2">
                    ${itemRows}
                </div>
                ${paymentHtml}
            </div>`;
        }
    }).join('');
}

window.toggleGuestBlacklist = async function() {
    const guest = window.currentHistoryGuest;
    if (!guest) return;

    const action = guest.isBlacklisted ? 'remove from blacklist' : 'blacklist';
    if (!confirm(`Are you sure you want to ${action} ${guest.name}?`)) return;

    const newStatus = !guest.isBlacklisted;
    
    // Disable button while processing
    const btn = document.getElementById('toggleBlacklistBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
        const response = await authFetch(`/guests/${guest.id}/blacklist`, {
            method: 'PATCH',
            body: JSON.stringify({ isBlacklisted: newStatus })
        });

        if (response && response.ok) {
            alert(`Guest successfully ${newStatus ? 'blacklisted' : 'removed from blacklist'}.`);
            // Refresh data
            fetchGuests(); 
            viewGuestHistory(guest.id); 
        } else {
            const err = await response.json();
            alert(err.error || 'Failed to update guest status');
        }
    } catch (e) {
        console.error(e);
        alert('An error occurred.');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
};

// --- PRINT & PDF HELPERS ---

function openPrintWindow(html) {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) { alert('Please allow popups for this site to print/download.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
}

function printStyles() {
    return `
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; font-size: 14px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #8b1d30; padding-bottom: 20px; margin-bottom: 28px; gap: 20px; }
            .logo-area { display: flex; align-items: center; gap: 18px; }
            .hotel-logo { height: 95px; width: auto; display: block; object-fit: contain; }
            .hotel-info { display: flex; flex-direction: column; justify-content: center; }
            .hotel-name-new { font-size: 19px; font-weight: 700; color: #1a1a2e; letter-spacing: -0.3px; line-height: 1.2; }
            .hotel-sub  { font-size: 11px; color: #666; margin-top: 2px; }
            .doc-title  { font-size: 20px; font-weight: 700; color: #1a1a2e; text-align: right; }
            .doc-date   { font-size: 12px; color: #888; text-align: right; margin-top: 4px; }
            .guest-info { background: #f8f8f8; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
            .guest-info h2 { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
            .guest-info p  { font-size: 13px; color: #555; margin-top: 2px; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
            .stat { background: #f4f6fb; border-radius: 8px; padding: 12px; text-align: center; }
            .stat-num { font-size: 22px; font-weight: 800; }
            .stat-lbl { font-size: 11px; color: #888; margin-top: 2px; }
            .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin: 20px 0 10px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; margin-bottom: 14px; page-break-inside: avoid; }
            .card.booking { border-left: 4px solid #3b82f6; }
            .card.order   { border-left: 4px solid #f97316; }
            .card-header  { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
            .card-title   { font-size: 15px; font-weight: 700; }
            .card-date    { font-size: 11px; color: #888; margin-top: 2px; }
            .card-amount  { font-size: 16px; font-weight: 800; }
            .badge        { display: inline-block; padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-left: 6px; }
            .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-top: 10px; }
            .grid2 span.lbl { font-weight: 600; color: #888; }
            .item-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px dotted #eee; }
            .pay-row  { display: flex; justify-content: space-between; font-size: 12px; color: #555; padding: 3px 0; }
            .footer   { margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; font-size: 11px; color: #aaa; text-align: center; }
            @media print {
                body { padding: 16px; }
                .no-print { display: none !important; }
                a { text-decoration: none; color: inherit; }
            }
        </style>`;
}

function hotelHeader(docTitle) {
    const now = new Date().toLocaleString('en-GB', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
    return `
    <div class="header">
        <div class="logo-area">
            <img src="images/logo.png" class="hotel-logo" alt="Grand Lynks Logo">
            <div class="hotel-info">
                <div class="hotel-name-new">Grand Lynks Homes & Apartments Ltd</div>
                <div class="hotel-sub">80 Pa Michael Imoudu Ave, Gwarinpa, Abuja &bull; +234 814 223 4691</div>
                <div class="hotel-sub">grandlynkshomesandapartments.com</div>
            </div>
        </div>
        <div>
            <div class="doc-title">${docTitle}</div>
            <div class="doc-date">Generated: ${now}</div>
        </div>
    </div>`;
}

function statusBadgeHtml(status) {
    const colors = { pending:'background:#fef3c7;color:#92400e', confirmed:'background:#dbeafe;color:#1e40af',
        'checked-in':'background:#e0e7ff;color:#3730a3', completed:'background:#d1fae5;color:#065f46',
        cancelled:'background:#fee2e2;color:#991b1b' };
    const style = colors[status] || 'background:#f3f4f6;color:#374151';
    return `<span class="badge" style="${style}">${status}</span>`;
}

// --- PRINT GUEST HISTORY ---
window.printGuestHistory = function(autoDownload) {
    const guest = window.currentHistoryGuest;
    const items = window._historyItems || [];
    if (!guest) { alert('No guest data loaded.'); return; }

    const bookings = items.filter(i => i._type === 'booking');
    const orders   = items.filter(i => i._type === 'order');
    const totalSpent = items.reduce((a, i) => a + (i.totalAmount || 0), 0);
    const confirmed  = bookings.filter(b => ['confirmed','checked-in','completed'].includes(b.status)).length;

    const bookingCards = bookings.map(b => {
        const nights = b.startDate && b.endDate ? Math.ceil((new Date(b.endDate) - new Date(b.startDate)) / 86400000) : '?';
        const payRows = (b.payments||[]).map(p => `<div class="pay-row"><span>${p.method||'N/A'}${p.reference ? ' · ' + p.reference : ''}</span><span>₦${Number(p.amount||0).toLocaleString()} (${p.status})</span></div>`).join('');
        return `<div class="card booking">
            <div class="card-header">
                <div><div class="card-title">📅 Booking #GL-${b.id}${statusBadgeHtml(b.status)}</div><div class="card-date">${new Date(b.createdAt).toLocaleString('en-GB')}</div></div>
                <div class="card-amount" style="color:#1d4ed8">₦${Number(b.totalAmount||0).toLocaleString()}</div>
            </div>
            <div class="grid2">
                <div><span class="lbl">Room:</span> ${b.room ? (b.room.number||b.room.roomNumber)+' – '+b.room.type : 'N/A'}</div>
                <div><span class="lbl">Rate:</span> ${b.room?.pricePerNight ? '₦'+Number(b.room.pricePerNight).toLocaleString()+'/night' : 'N/A'}</div>
                <div><span class="lbl">Check-in:</span> ${b.startDate ? new Date(b.startDate).toLocaleDateString('en-GB') : 'N/A'}</div>
                <div><span class="lbl">Check-out:</span> ${b.endDate ? new Date(b.endDate).toLocaleDateString('en-GB') : 'N/A'}</div>
                <div><span class="lbl">Duration:</span> ${nights} night(s)</div>
            </div>
            ${payRows ? `<div style="margin-top:8px;padding-top:6px;border-top:1px dashed #ddd">${payRows}</div>` : ''}
        </div>`;
    }).join('');

    const orderCards = orders.map(o => {
        const roomLabel = o.room ? `Room ${o.room.number||o.room.roomNumber}` : 'N/A';
        const itemRows  = (o.orderItems||[]).map(i => {
            const sub = Number(i.unitPrice||0) * Number(i.quantity||1);
            return `<div class="item-row"><span>${i.quantity}× ${i.menuItem?.name||'Item'}</span><span>₦${Number(i.unitPrice||0).toLocaleString()} × ${i.quantity} = ₦${sub.toLocaleString()}</span></div>`;
        }).join('');
        const payRows = (o.payments||[]).map(p => `<div class="pay-row"><span>${p.method||'N/A'}${p.reference ? ' · '+p.reference : ''}</span><span>₦${Number(p.amount||0).toLocaleString()} (${p.status})</span></div>`).join('');
        return `<div class="card order">
            <div class="card-header">
                <div><div class="card-title">🍽️ Order #${o.id}${statusBadgeHtml(o.status)}</div><div class="card-date">${new Date(o.createdAt).toLocaleString('en-GB')} &bull; ${roomLabel}</div></div>
                <div class="card-amount" style="color:#c2410c">₦${Number(o.totalAmount||0).toLocaleString()}</div>
            </div>
            <div style="margin-top:6px">${itemRows || '<div style="color:#aaa;font-size:11px">No item details</div>'}</div>
            ${payRows ? `<div style="margin-top:8px;padding-top:6px;border-top:1px dashed #ddd">${payRows}</div>` : ''}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Guest History – ${guest.name}</title>${printStyles()}</head><body>
        ${hotelHeader('Guest History Report')}
        <div class="guest-info">
            <h2>${guest.name}${guest.isBlacklisted ? ' <span style="background:#fee2e2;color:#991b1b;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700">BLACKLISTED</span>' : ''}</h2>
            <p>${guest.email} &bull; ${guest.phone||'No phone'}</p>
            ${guest.idNumber ? `<p>ID: ${guest.idNumber}</p>` : ''}
            ${guest.address  ? `<p>Address: ${guest.address}</p>` : ''}
            ${guest.createdAt ? `<p>Member since: ${new Date(guest.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>` : ''}
        </div>
        <div class="stats">
            <div class="stat"><div class="stat-num" style="color:#2563eb">${bookings.length}</div><div class="stat-lbl">Room Bookings</div></div>
            <div class="stat"><div class="stat-num" style="color:#16a34a">${confirmed}</div><div class="stat-lbl">Confirmed Stays</div></div>
            <div class="stat"><div class="stat-num" style="color:#ea580c">${orders.length}</div><div class="stat-lbl">Food Orders</div></div>
            <div class="stat"><div class="stat-num" style="color:#7c3aed">₦${totalSpent.toLocaleString()}</div><div class="stat-lbl">Total Spent</div></div>
        </div>
        ${bookings.length > 0 ? `<div class="section-title">Room Bookings (${bookings.length})</div>${bookingCards}` : ''}
        ${orders.length > 0   ? `<div class="section-title">Food Orders (${orders.length})</div>${orderCards}` : ''}
        ${items.length === 0  ? '<p style="color:#aaa;text-align:center;padding:24px">No transaction history on record.</p>' : ''}
        <div class="footer">Grand Lynks Homes &amp; Apartments &bull; This document is computer-generated and requires no signature.</div>
    </body></html>`;

    openPrintWindow(html);
};

window.downloadGuestHistoryPDF = function() {
    window.printGuestHistory(true);
};

// --- PRINT RECEIPT (Orders section) ---
window.printReceipt = function(id, type) {
    const allTx = window.allTransactions || [];
    const item = allTx.find(t => t.id == id && t.type === type);
    if (!item) { alert('Transaction data not found. Try refreshing the page.'); return; }

    const isBooking = type === 'booking';
    const guestName = item.guest?.name || 'Unknown Guest';
    const guestEmail = item.guest?.email || '';
    const guestPhone = item.guest?.phone || '';

    let bodyHtml = '';
    if (isBooking) {
        const nights = item.startDate && item.endDate ? Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / 86400000) : '?';
        const payRows = (item.payments||[]).map(p => `<div class="pay-row"><span>${p.method||'N/A'}${p.reference ? ' · Ref: '+p.reference : ''}</span><span>₦${Number(p.amount||0).toLocaleString()} <span style="color:#bbb">(${p.status})</span></span></div>`).join('');
        bodyHtml = `
        <div class="card booking" style="margin-bottom:0">
            <div class="grid2">
                <div><span class="lbl">Booking Ref:</span> #GL-${item.id}</div>
                <div><span class="lbl">Status:</span> ${statusBadgeHtml(item.status)}</div>
                <div><span class="lbl">Room:</span> ${item.room ? (item.room.number||item.room.roomNumber)+' – '+item.room.type : 'N/A'}</div>
                <div><span class="lbl">Rate:</span> ${item.room?.pricePerNight ? '₦'+Number(item.room.pricePerNight).toLocaleString()+'/night' : 'N/A'}</div>
                <div><span class="lbl">Check-in:</span> ${item.startDate ? new Date(item.startDate).toLocaleDateString('en-GB') : 'N/A'}</div>
                <div><span class="lbl">Check-out:</span> ${item.endDate ? new Date(item.endDate).toLocaleDateString('en-GB') : 'N/A'}</div>
                <div><span class="lbl">Duration:</span> ${nights} night(s)</div>
            </div>
            ${payRows ? `<div class="section-title" style="margin-top:14px">Payment Details</div>${payRows}` : ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding:12px 14px;background:#f0f4ff;border-radius:8px;border:1px solid #c7d2fe">
            <span style="font-weight:700;font-size:14px">Total Amount</span>
            <span style="font-size:18px;font-weight:800;color:#1d4ed8">₦${Number(item.totalAmount||0).toLocaleString()}</span>
        </div>`;
    } else {
        const roomLabel = item.room ? `Room ${item.room.number||item.room.roomNumber}` : 'N/A';
        const itemRows  = (item.orderItems||[]).map(i => {
            const sub = Number(i.unitPrice||0) * Number(i.quantity||1);
            return `<div class="item-row"><span>${i.quantity}× ${i.menuItem?.name||'Item'}</span><span>₦${Number(i.unitPrice||0).toLocaleString()} × ${i.quantity} = <strong>₦${sub.toLocaleString()}</strong></span></div>`;
        }).join('') || '<div style="color:#aaa;font-size:11px;padding:6px 0">No item details</div>';
        const payRows = (item.payments||[]).map(p => `<div class="pay-row"><span>${p.method||'N/A'}${p.reference ? ' · Ref: '+p.reference : ''}</span><span>₦${Number(p.amount||0).toLocaleString()} <span style="color:#bbb">(${p.status})</span></span></div>`).join('');
        bodyHtml = `
        <div class="card order" style="margin-bottom:0">
            <div class="grid2" style="margin-bottom:10px">
                <div><span class="lbl">Order #:</span> ${item.id}</div>
                <div><span class="lbl">Status:</span> ${statusBadgeHtml(item.status)}</div>
                <div><span class="lbl">Delivery:</span> ${roomLabel}</div>
            </div>
            <div class="section-title">Items Ordered</div>
            ${itemRows}
            ${payRows ? `<div class="section-title" style="margin-top:14px">Payment Details</div>${payRows}` : ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding:12px 14px;background:#fff7ed;border-radius:8px;border:1px solid #fed7aa">
            <span style="font-weight:700;font-size:14px">Total Amount</span>
            <span style="font-size:18px;font-weight:800;color:#c2410c">₦${Number(item.totalAmount||0).toLocaleString()}</span>
        </div>`;
    }

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${isBooking ? 'Booking Receipt' : 'Order Receipt'} – #${item.id}</title>${printStyles()}</head><body>
        ${hotelHeader(isBooking ? 'Booking Receipt' : 'Food Order Receipt')}
        <div class="guest-info">
            <h2>${guestName}</h2>
            ${guestEmail ? `<p>${guestEmail}</p>` : ''}
            ${guestPhone ? `<p>${guestPhone}</p>` : ''}
        </div>
        ${bodyHtml}
        <div class="footer">Grand Lynks Homes &amp; Apartments &bull; Thank you for choosing us! &bull; +234 814 223 4691</div>
    </body></html>`;

    openPrintWindow(html);
};

// --- EVENT LISTENERS ---

loginForm.addEventListener('submit', handleLogin);
document.getElementById('addRoomForm').addEventListener('submit', handleAddRoom);
document.getElementById('editRoomForm').addEventListener('submit', handleEditRoom);
const addMenuForm = document.getElementById('addMenuForm');
if (addMenuForm) {
    addMenuForm.addEventListener('submit', handleAddMenu);
}
const editMenuForm = document.getElementById('editMenuForm');
if (editMenuForm) {
    editMenuForm.addEventListener('submit', handleEditMenu);
}
document.getElementById('walkInForm').addEventListener('submit', handleWalkInSubmit);

// Save Settings
const settingsForm = document.getElementById('settingsForm');
if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveSettingsBtn');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        const payload = {
            taxRate: document.getElementById('settingTaxRate').value,
            roomServiceFee: document.getElementById('settingRoomServiceFee').value,
            roomDiscount: document.getElementById('settingRoomDiscount')?.value || '0',
            foodDiscount: document.getElementById('settingFoodDiscount')?.value || '0'
        };

        try {
            const response = await authFetch('/settings', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            
            if (response && response.ok) {
                alert('Settings saved successfully!');
            } else {
                alert('Failed to save settings.');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('An error occurred.');
        } finally {
            btn.textContent = 'Save Settings';
            btn.disabled = false;
        }
    });
}

console.log('All functions successfully defined and attached to window.');

// Init
function bootstrap() {
    init();
    initPullToRefresh();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

// --- PULL-TO-REFRESH ---
function initPullToRefresh() {
    const mainEl = document.getElementById('admin-main');
    if (!mainEl) return;

    // Only activate on touch devices
    if (!('ontouchstart' in window)) return;

    const THRESHOLD = 80; // px to pull before triggering reload
    let startY = 0;
    let pulling = false;
    let triggered = false;

    // Create the visual indicator
    const indicator = document.createElement('div');
    indicator.id = 'ptr-indicator';
    Object.assign(indicator.style, {
        position: 'fixed',
        top: '72px',
        left: '50%',
        transform: 'translateX(-50%) translateY(-80px)',
        background: '#1a1a2e',
        color: '#fff',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
        transition: 'transform 0.15s ease',
        zIndex: '200',
        pointerEvents: 'none',
        willChange: 'transform',
    });
    indicator.innerHTML = '↓';
    document.body.appendChild(indicator);

    window.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            pulling = true;
            triggered = false;
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!pulling || window.scrollY > 0) return;
        const delta = e.touches[0].clientY - startY;
        if (delta <= 0) return;

        const progress = Math.min(delta / THRESHOLD, 1);
        // Slide indicator down as user pulls
        const translateY = -80 + (progress * 96);
        indicator.style.transform = `translateX(-50%) translateY(${translateY}px)`;
        indicator.innerHTML = progress >= 1 ? '↺' : '↓';
        if (progress >= 1 && !triggered) triggered = true;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if (!pulling) return;
        pulling = false;

        if (triggered) {
            // Show spinning state then reload
            indicator.innerHTML = '↺';
            indicator.style.transform = 'translateX(-50%) translateY(16px)';
            setTimeout(() => location.reload(), 400);
        } else {
            // Snap back
            indicator.style.transform = 'translateX(-50%) translateY(-80px)';
        }
    }, { passive: true });
}

// Mobile Safari Scroll Restoration Fix (Aggressive)
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

const forceTop = () => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    const main = document.getElementById('admin-main');
    if (main) {
        main.scrollTop = 0;
    }
};

window.addEventListener('load', () => {
    forceTop();
    requestAnimationFrame(forceTop);
    setTimeout(forceTop, 100);
    setTimeout(forceTop, 300);
    setTimeout(forceTop, 600);
});

// --- SUPER ADMIN VAULT LOGIC ---

async function pollNotifications() {
    try {
        const response = await authFetch('/super/notifications');
        if (response && response.ok) {
            const data = await response.json();
            const badge = document.getElementById('vaultBadge');
            if (badge) {
                if (data.unreadCount > 0) {
                    badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        }
    } catch (e) {
        console.error('Error polling notifications', e);
    }
}

let cachedVaultRecords = [];

async function fetchVaultRecords() {
    const tbody = document.getElementById('vaultTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center">Loading vault records...</td></tr>';

    try {
        // Mark as read when opening vault
        await authFetch('/super/mark-read', { method: 'POST' });
        pollNotifications(); // update badge instantly

        const response = await authFetch('/super/deleted-records');
        if (response && response.ok) {
            const records = await response.json();
            cachedVaultRecords = records;
            renderVaultRecords(records);
        } else {
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Failed to load vault records</td></tr>';
        }
    } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error loading vault records</td></tr>';
    }
}

function renderVaultRecords(records) {
    const tbody = document.getElementById('vaultTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Vault is empty.</td></tr>';
        return;
    }

    records.forEach(record => {
        let detailsText = 'No details';
        try {
            const snap = JSON.parse(record.snapshot);
            const typeLower = record.recordType.toLowerCase();
            if (typeLower === 'booking') {
                detailsText = `Booking #${snap.id} - ${snap.guest?.name || 'Unknown'} (Room ${snap.room?.roomNumber || snap.roomId || 'Unknown'})`;
            } else if (typeLower === 'order') {
                detailsText = `Order #${snap.id} - ₦${(snap.totalAmount || snap.total_price || 0).toLocaleString()}`;
            } else if (typeLower === 'room') {
                detailsText = `Room ${snap.roomNumber || snap.number || 'Unknown'} (${snap.type})`;
            } else if (typeLower === 'menuitem') {
                detailsText = `Menu Item: ${snap.name}`;
            } else if (typeLower === 'guest') {
                detailsText = `Guest: ${snap.name || 'Unknown'} (${snap.email || 'No Email'})`;
            } else if (typeLower === 'review') {
                detailsText = `Review by ${snap.guestName || 'Unknown'} - ${snap.rating} Stars`;
            } else {
                detailsText = `${record.recordType} ID: ${record.recordId}`;
            }
        } catch (e) {
            detailsText = 'Invalid Snapshot Data';
        }

        const statusBadge = record.purgedAt 
            ? '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Purged</span>'
            : record.restoredAt 
            ? '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Restored</span>'
            : '<span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Archived</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${record.recordType}</td>
            <td class="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title="${detailsText}">${detailsText}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${record.deletedBy || 'System'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="viewVaultDetails(${record.id})" class="text-blue-600 hover:text-blue-900 mr-3">Details</button>
                ${!record.purgedAt && !record.restoredAt ? `
                    <button onclick="restoreRecord(${record.id})" class="text-green-600 hover:text-green-900 mr-3">Restore</button>
                    <button onclick="promptPurge(${record.id})" class="text-red-600 hover:text-red-900 font-bold">Purge</button>
                ` : '<span class="text-gray-400">No actions</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function formatSnapshotVal(val) {
    if (val === null || val === undefined) return '<em class="text-gray-400">None</em>';
    if (typeof val === 'object') {
        if (Array.isArray(val)) {
            if (val.length === 0) return '[]';
            return `<ul class="list-disc pl-4 space-y-1 font-mono text-xs">
                ${val.map(item => `<li>${formatObjectInline(item)}</li>`).join('')}
            </ul>`;
        }
        return `<div class="bg-gray-50 border border-gray-200 rounded-lg p-2.5 font-mono text-xs max-h-40 overflow-y-auto">
            ${Object.entries(val).map(([k, v]) => `<div><strong>${k}:</strong> ${typeof v === 'object' ? JSON.stringify(v) : v}</div>`).join('')}
        </div>`;
    }
    if (typeof val === 'string' && val.startsWith('http')) {
        return `<a href="${val}" target="_blank" class="text-blue-600 hover:underline break-all">${val}</a>`;
    }
    if (typeof val === 'number' && (val > 1000 || val < -1000)) {
        return `₦${val.toLocaleString()}`;
    }
    if (typeof val === 'string' && val.includes('T') && !isNaN(Date.parse(val)) && val.length > 10) {
        return new Date(val).toLocaleString();
    }
    return val.toString();
}

function formatObjectInline(obj) {
    if (typeof obj !== 'object' || obj === null) return String(obj);
    if (obj.name) return obj.name;
    if (obj.menuItem?.name) return `${obj.menuItem.name} x${obj.quantity || 1}`;
    return JSON.stringify(obj);
}

window.viewVaultDetails = function(recordId) {
    const record = cachedVaultRecords.find(r => r.id === recordId);
    if (!record) {
        alert('Error: Record details not found in cache.');
        return;
    }

    document.getElementById('vaultDetailsRecordType').textContent = record.recordType;
    document.getElementById('vaultDetailsDeletedBy').textContent = record.deletedBy || 'System';
    document.getElementById('vaultDetailsDeletedAt').textContent = new Date(record.deletedAt).toLocaleString();
    document.getElementById('vaultDetailsRecordId').textContent = record.recordId;
    
    const statusText = record.purgedAt ? 'Purged' : (record.restoredAt ? 'Restored' : 'Archived');
    document.getElementById('vaultDetailsStatus').textContent = statusText;

    const tbody = document.getElementById('vaultDetailsTableBody');
    tbody.innerHTML = '';

    try {
        const snap = JSON.parse(record.snapshot);
        Object.entries(snap).forEach(([key, val]) => {
            const humanizedKey = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase());

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-gray-700 bg-gray-50/50 w-1/3">${humanizedKey}</td>
                <td class="px-4 py-3 text-gray-600">${formatSnapshotVal(val)}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="2" class="px-4 py-3 text-center text-red-500">Failed to parse snapshot JSON data</td></tr>';
    }

    const actionsDiv = document.getElementById('vaultDetailsActions');
    actionsDiv.innerHTML = '';
    
    if (!record.purgedAt && !record.restoredAt) {
        actionsDiv.innerHTML = `
            <button onclick="closeModal('vaultDetailsModal'); restoreRecord(${record.id})" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition shadow-sm">Restore Record</button>
            <button onclick="closeModal('vaultDetailsModal'); promptPurge(${record.id})" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition shadow-sm font-bold">Purge Record</button>
        `;
    }
    actionsDiv.innerHTML += `<button onclick="closeModal('vaultDetailsModal')" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition border border-gray-200">Close</button>`;

    openModal('vaultDetailsModal');
};

window.restoreRecord = async function(id) {
    if (!confirm('Are you sure you want to restore this record back to the live database?')) return;
    
    const response = await authFetch(`/super/restore/${id}`, { method: 'POST' });
    if (response && response.ok) {
        alert('Record restored successfully!');
        fetchVaultRecords();
    } else {
        const err = await response.json().catch(()=>({}));
        alert(err.error || 'Failed to restore record');
    }
};

let currentPurgeId = null;

window.promptPurge = function(id) {
    currentPurgeId = id;
    document.getElementById('superAdminPin').value = '';
    document.getElementById('pinError').classList.add('hidden');
    openModal('pinModal');
};

window.handlePinSubmit = async function(e) {
    e.preventDefault();
    if (!currentPurgeId) return;

    const pin = document.getElementById('superAdminPin').value;
    const btn = document.querySelector('#pinForm button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Verifying...';
    btn.disabled = true;

    try {
        const response = await authFetch(`/super/purge/${currentPurgeId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
        });

        if (response && response.ok) {
            closeModal('pinModal');
            alert('Record permanently purged.');
            fetchVaultRecords();
        } else {
            document.getElementById('pinError').classList.remove('hidden');
            document.getElementById('superAdminPin').value = '';
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
};

// ============================================================
// --- STATISTICS & ANALYTICS ---
// ============================================================

// Cache for Chart.js instances so we can destroy & recreate on refresh
const _charts = {};

function destroyChart(key) {
    if (_charts[key]) {
        _charts[key].destroy();
        delete _charts[key];
    }
}

function fmtCurrency(n) {
    if (n >= 1_000_000) return '₦' + (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return '₦' + (n / 1_000).toFixed(1) + 'K';
    return '₦' + Math.round(n).toLocaleString();
}

function fmtCurrencyFull(n) {
    return '₦' + Math.round(n).toLocaleString();
}

async function fetchStatistics() {
    const yearInput = document.getElementById('statsYearInput');
    const year = yearInput ? parseInt(yearInput.value) || new Date().getFullYear() : new Date().getFullYear();
    if (yearInput) yearInput.value = year;

    const loading = document.getElementById('statsLoading');
    const errorEl = document.getElementById('statsError');
    const content = document.getElementById('statsContent');

    if (loading) loading.classList.remove('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (content) content.classList.add('hidden');

    try {
        const res = await authFetch(`/statistics?year=${year}`);
        if (!res || !res.ok) throw new Error('API error');
        const data = await res.json();

        if (loading) loading.classList.add('hidden');
        if (content) content.classList.remove('hidden');

        renderStatistics(data);
    } catch (err) {
        console.error('Statistics fetch error:', err);
        if (loading) loading.classList.add('hidden');
        if (errorEl)  errorEl.classList.remove('hidden');
    }
}

function renderStatistics(data) {
    const { kpi, months, monthlyBookingRevenue, monthlyOrderRevenue,
            monthlyBookingCount, monthlyOrderCount, monthlyGuestCount,
            monthlyTotals, topMonths, bookingStatusCount,
            revenueBySource, yearlyRevenue, year, roomPerformance } = data;

    // ---- KPI Cards ----
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    setText('kpiRevenueMonth',   fmtCurrency(kpi.revenueThisMonth));
    setText('kpiRevenueYear',    fmtCurrency(kpi.revenueThisYear));
    setText('kpiBookingsMonth',  kpi.bookingsThisMonth);
    setText('kpiOrdersMonth',    kpi.ordersThisMonth);
    setText('kpiGuests',         kpi.totalGuests.toLocaleString());
    setText('kpiOccupancy',      kpi.occupancyRate + '%');
    setText('kpiOccupancyDetail', kpi.occupiedRooms + '/' + kpi.totalRooms);

    // Year labels
    ['chartBarYearLabel','topMonthsYearLabel','activityYearLabel','roomPerformanceYearLabel'].forEach(id => setText(id, year));

    // ---- Chart 1: Monthly Revenue Grouped Bar ----
    destroyChart('monthlyRevenue');
    const ctxBar = document.getElementById('chartMonthlyRevenue');
    if (ctxBar) {
        _charts.monthlyRevenue = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Room Bookings',
                        data: monthlyBookingRevenue,
                        backgroundColor: 'rgba(99, 102, 241, 0.85)',
                        borderRadius: 4,
                        borderSkipped: false,
                    },
                    {
                        label: 'Food Orders',
                        data: monthlyOrderRevenue,
                        backgroundColor: 'rgba(16, 185, 129, 0.85)',
                        borderRadius: 4,
                        borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${fmtCurrencyFull(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: {
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                            font: { size: 10 },
                            callback: v => fmtCurrency(v)
                        }
                    }
                }
            }
        });
    }

    // ---- Chart 2: 5-Year Trend Line ----
    destroyChart('yearlyTrend');
    const ctxLine = document.getElementById('chartYearlyTrend');
    if (ctxLine && yearlyRevenue && yearlyRevenue.length) {
        _charts.yearlyTrend = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: yearlyRevenue.map(y => y.year),
                datasets: [{
                    label: 'Annual Revenue',
                    data: yearlyRevenue.map(y => y.revenue),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.1)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#6366f1',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.35
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: ctx => ` Revenue: ${fmtCurrencyFull(ctx.raw)}` }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: {
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { font: { size: 10 }, callback: v => fmtCurrency(v) }
                    }
                }
            }
        });
    }

    // ---- Chart 3: Booking Status Doughnut ----
    destroyChart('bookingStatus');
    const ctxDoughnut = document.getElementById('chartBookingStatus');
    const statusColors = {
        pending:    '#f59e0b',
        confirmed:  '#3b82f6',
        'checked-in': '#10b981',
        'checked-out': '#8b5cf6',
        completed:  '#6366f1',
        cancelled:  '#ef4444'
    };
    if (ctxDoughnut && bookingStatusCount) {
        const statusLabels = Object.keys(bookingStatusCount);
        const statusData   = statusLabels.map(k => bookingStatusCount[k]);
        const statusBg     = statusLabels.map(k => statusColors[k] || '#9ca3af');

        _charts.bookingStatus = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: statusLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
                datasets: [{
                    data: statusData,
                    backgroundColor: statusBg,
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.label}: ${ctx.raw} (${Math.round(ctx.parsed / statusData.reduce((a,b)=>a+b,0)*100)||0}%)`
                        }
                    }
                }
            }
        });

        // Custom legend
        const legendEl = document.getElementById('statusLegend');
        if (legendEl) {
            legendEl.innerHTML = statusLabels.map((k, i) => `
                <span class="flex items-center gap-1">
                    <span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${statusBg[i]}"></span>
                    ${k.charAt(0).toUpperCase() + k.slice(1)}: <strong>${statusData[i]}</strong>
                </span>
            `).join('');
        }
    }

    // ---- Chart 4: Revenue by Source Pie ----
    destroyChart('revenueSource');
    const ctxPie = document.getElementById('chartRevenueSource');
    if (ctxPie && revenueBySource) {
        const sourceLabels = ['Room Bookings', 'Food Orders'];
        const sourceData   = [revenueBySource.rooms, revenueBySource.food];
        const sourceBg     = ['#6366f1', '#10b981'];

        _charts.revenueSource = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: sourceLabels,
                datasets: [{
                    data: sourceData,
                    backgroundColor: sourceBg,
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.label}: ${fmtCurrencyFull(ctx.raw)}`
                        }
                    }
                }
            }
        });

        const srcLegend = document.getElementById('sourceLegend');
        if (srcLegend) {
            const total = sourceData.reduce((a,b) => a+b, 0);
            srcLegend.innerHTML = sourceLabels.map((l, i) => `
                <span class="flex items-center gap-1">
                    <span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${sourceBg[i]}"></span>
                    ${l}: <strong>${total > 0 ? Math.round(sourceData[i]/total*100) : 0}%</strong>
                </span>
            `).join('');
        }
    }

    // ---- Top Months Table ----
    const topBody = document.getElementById('topMonthsTableBody');
    if (topBody && topMonths) {
        topBody.innerHTML = topMonths.map((m, idx) => `
            <tr class="border-b border-gray-50 hover:bg-gray-50 transition">
                <td class="py-2 text-gray-400 font-medium">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx+1}</td>
                <td class="py-2 font-semibold text-gray-700">${m.month}</td>
                <td class="py-2 text-right text-indigo-600">${fmtCurrency(m.bookingRevenue)}</td>
                <td class="py-2 text-right text-emerald-600">${fmtCurrency(m.orderRevenue)}</td>
                <td class="py-2 text-right font-bold text-gray-800">${fmtCurrency(m.totalRevenue)}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="py-4 text-center text-gray-400">No revenue data for this year</td></tr>';
    }

    // ---- Monthly Activity Table ----
    const actBody = document.getElementById('monthlyActivityTableBody');
    if (actBody && monthlyTotals) {
        actBody.innerHTML = monthlyTotals.map((m, i) => {
            const isCurrentMonth = new Date().getMonth() === i && new Date().getFullYear() === year;
            return `
                <tr class="${isCurrentMonth ? 'bg-indigo-50' : 'hover:bg-gray-50'} transition">
                    <td class="py-2 pr-4 font-medium text-gray-700 ${isCurrentMonth ? 'text-indigo-700' : ''}">${m.month}${isCurrentMonth ? ' <span class="text-xs text-indigo-500">(current)</span>' : ''}</td>
                    <td class="py-2 px-2 text-right text-indigo-600">${m.bookingRevenue > 0 ? fmtCurrencyFull(m.bookingRevenue) : '<span class="text-gray-300">—</span>'}</td>
                    <td class="py-2 px-2 text-right text-emerald-600">${m.orderRevenue > 0 ? fmtCurrencyFull(m.orderRevenue) : '<span class="text-gray-300">—</span>'}</td>
                    <td class="py-2 px-2 text-right font-semibold text-gray-800">${m.totalRevenue > 0 ? fmtCurrencyFull(m.totalRevenue) : '<span class="text-gray-300">—</span>'}</td>
                    <td class="py-2 px-2 text-right text-gray-600">${m.bookingCount || '<span class="text-gray-300">0</span>'}</td>
                    <td class="py-2 px-2 text-right text-gray-600">${m.orderCount || '<span class="text-gray-300">0</span>'}</td>
                    <td class="py-2 pl-2 text-right text-gray-600">${monthlyGuestCount[i] || '<span class="text-gray-300">0</span>'}</td>
                </tr>
            `;
        }).join('');
    }

    // ---- Room Performance Table ----
    const rpBody = document.getElementById('roomPerformanceTableBody');
    if (rpBody && roomPerformance) {
        rpBody.innerHTML = roomPerformance.map((r, i) => {
            return `
                <tr class="hover:bg-gray-50 transition">
                    <td class="py-2 pr-4 font-medium text-gray-700">Room ${r.number}</td>
                    <td class="py-2 px-2 text-gray-600">${r.type || 'Standard'}</td>
                    <td class="py-2 px-2 text-right text-gray-600">${r.bookings || '<span class="text-gray-300">0</span>'}</td>
                    <td class="py-2 pl-2 text-right font-semibold ${r.revenue > 0 ? 'text-indigo-600' : 'text-gray-300'}">${r.revenue > 0 ? fmtCurrencyFull(r.revenue) : '—'}</td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="4" class="py-4 text-center text-gray-400">No room performance data</td></tr>';
    }
}

// Initialize year input when Statistics section first loads
document.addEventListener('DOMContentLoaded', () => {
    const yearInput = document.getElementById('statsYearInput');
    if (yearInput) yearInput.value = new Date().getFullYear();

    // Allow Enter key on year input to refresh
    if (yearInput) {
        yearInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') fetchStatistics();
        });
        yearInput.addEventListener('change', fetchStatistics);
    }
});

// ==========================================
// CHECK IN, CHECK OUT & EDIT BOOKING SYSTEM
// ==========================================

window.checkInBooking = async function (id) {
    if (!confirm("Are you sure you want to check in this guest?")) return;
    
    const response = await authFetch(`/bookings/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'checked-in' })
    });

    if (response && response.ok) {
        alert("Guest checked in successfully.");
        if (typeof fetchOrders === 'function') fetchOrders();
    } else {
        alert("Failed to check in guest.");
    }
};

window.openCheckoutModal = async function (id) {
    try {
        const response = await authFetch(`/bookings/${id}`);
        if (!response || !response.ok) {
            alert("Failed to retrieve booking details.");
            return;
        }
        const booking = await response.json();
        
        window._currentCheckoutBooking = booking;

        document.getElementById('checkoutBookingId').value = booking.id;
        document.getElementById('checkoutGuestName').textContent = booking.guest ? booking.guest.name : 'Unknown Guest';
        document.getElementById('checkoutRoomNum').textContent = booking.room ? booking.room.number + ' (' + booking.room.type + ')' : 'N/A';
        document.getElementById('checkoutRoomRate').value = booking.room ? booking.room.pricePerNight : 0;
        document.getElementById('checkoutScheduledEnd').textContent = new Date(booking.endDate).toLocaleDateString();
        
        const now = new Date();
        const formattedNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById('checkoutActualTime').value = formattedNow;
        document.getElementById('checkoutNotes').value = '';

        calculateLateCheckoutFee();
        window.openModal('checkoutModal');
    } catch (error) {
        console.error("Error opening checkout modal:", error);
        alert("An error occurred while opening checkout: " + error.message);
    }
};

window.calculateLateCheckoutFee = function () {
    const booking = window._currentCheckoutBooking;
    if (!booking) return;

    const actualTimeInput = document.getElementById('checkoutActualTime').value;
    if (!actualTimeInput) return;

    const actualCheckoutTime = new Date(actualTimeInput);
    
    const scheduledEnd = new Date(booking.endDate);
    const deadlineTime = new Date(scheduledEnd.getFullYear(), scheduledEnd.getMonth(), scheduledEnd.getDate(), 12, 0, 0);

    const isLate = actualCheckoutTime > deadlineTime;

    const lateNotice = document.getElementById('lateCheckoutNotice');
    const earlyNotice = document.getElementById('earlyCheckoutNotice');
    const feeInput = document.getElementById('checkoutLateFeeInput');
    const applyCheckbox = document.getElementById('applyLateFeeCheckbox');

    if (isLate) {
        lateNotice.classList.remove('hidden');
        earlyNotice.classList.add('hidden');
        
        const roomRate = parseFloat(document.getElementById('checkoutRoomRate').value) || 0;
        const calculatedFee = roomRate * 0.5;
        
        feeInput.value = calculatedFee;
        applyCheckbox.checked = true;
        feeInput.disabled = false;
    } else {
        lateNotice.classList.add('hidden');
        earlyNotice.classList.remove('hidden');
        feeInput.value = 0;
        applyCheckbox.checked = false;
        feeInput.disabled = true;
    }

    updateCheckoutTotal();
};

window.toggleLateFeeCheckbox = function () {
    const applyCheckbox = document.getElementById('applyLateFeeCheckbox');
    const feeInput = document.getElementById('checkoutLateFeeInput');
    
    if (applyCheckbox.checked) {
        const roomRate = parseFloat(document.getElementById('checkoutRoomRate').value) || 0;
        feeInput.value = roomRate * 0.5;
        feeInput.disabled = false;
    } else {
        feeInput.value = 0;
        feeInput.disabled = true;
    }
    updateCheckoutTotal();
};

window.updateCheckoutTotal = function () {
    const booking = window._currentCheckoutBooking;
    if (!booking) return;

    const originalTotal = parseFloat(booking.totalAmount) || 0;
    const applyCheckbox = document.getElementById('applyLateFeeCheckbox');
    const feeInput = document.getElementById('checkoutLateFeeInput');
    
    let lateFee = 0;
    if (applyCheckbox && applyCheckbox.checked) {
        lateFee = parseFloat(feeInput.value) || 0;
    }

    const newTotal = originalTotal + lateFee;
    document.getElementById('checkoutTotalAmount').textContent = newTotal.toLocaleString();
    
    const notice = document.getElementById('checkoutOriginalTotalNotice');
    if (lateFee > 0) {
        notice.textContent = `(includes ₦${originalTotal.toLocaleString()} original + ₦${lateFee.toLocaleString()} late fee)`;
    } else {
        notice.textContent = '';
    }
};

window.processCheckout = async function (event) {
    event.preventDefault();
    const id = document.getElementById('checkoutBookingId').value;
    const actualCheckOutTime = document.getElementById('checkoutActualTime').value;
    const applyCheckbox = document.getElementById('applyLateFeeCheckbox');
    const feeInput = document.getElementById('checkoutLateFeeInput');
    const notes = document.getElementById('checkoutNotes').value;
    const booking = window._currentCheckoutBooking;

    let lateFee = null;
    if (applyCheckbox && applyCheckbox.checked) {
        lateFee = parseFloat(feeInput.value) || 0;
    }

    const originalTotal = parseFloat(booking.totalAmount) || 0;
    const newTotal = originalTotal + (lateFee || 0);

    const payload = {
        status: 'checked-out',
        actualCheckOutTime: new Date(actualCheckOutTime).toISOString(),
        lateCheckoutFee: lateFee,
        checkoutNotes: notes,
        totalAmount: newTotal
    };

    const response = await authFetch(`/bookings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });

    if (response && response.ok) {
        alert("Checkout completed successfully.");
        window.closeModal('checkoutModal');
        if (typeof fetchOrders === 'function') fetchOrders();
    } else {
        alert("Failed to complete checkout.");
    }
};

window.openEditBookingModal = async function (id) {
    try {
        const roomsRes = await authFetch('/rooms');
        if (!roomsRes || !roomsRes.ok) {
            alert("Failed to load rooms list.");
            return;
        }
        const rooms = await roomsRes.json();
        
        const roomSelect = document.getElementById('editBookingRoomSelect');
        roomSelect.innerHTML = '';
        rooms.forEach(room => {
            const opt = document.createElement('option');
            opt.value = room.id;
            opt.textContent = `Room ${room.number} (${room.type}) - ₦${room.pricePerNight}/night`;
            roomSelect.appendChild(opt);
        });

        const response = await authFetch(`/bookings/${id}`);
        if (!response || !response.ok) {
            alert("Failed to load booking details.");
            return;
        }
        const booking = await response.json();

        document.getElementById('editBookingId').value = booking.id;
        document.getElementById('editBookingGuestName').value = booking.guest ? booking.guest.name : '';
        document.getElementById('editBookingGuestPhone').value = booking.guest ? booking.guest.phone : '';
        document.getElementById('editBookingGuestEmail').value = booking.guest ? booking.guest.email : '';
        
        document.getElementById('editBookingRoomSelect').value = booking.roomId;
        document.getElementById('editBookingStatusSelect').value = booking.status;
        
        document.getElementById('editBookingStartDate').value = new Date(booking.startDate).toISOString().split('T')[0];
        document.getElementById('editBookingEndDate').value = new Date(booking.endDate).toISOString().split('T')[0];
        
        document.getElementById('editBookingCheckInTime').value = booking.checkInTime || '';
        document.getElementById('editBookingCheckOutTime').value = booking.checkOutTime || '12:00';
        document.getElementById('editBookingTotalAmount').value = booking.totalAmount || 0;
        document.getElementById('editBookingSpecialRequests').value = booking.specialRequests || '';

        const checkoutFields = document.getElementById('editBookingCheckoutFields');
        if (booking.status === 'checked-out') {
            checkoutFields.classList.remove('hidden');
            
            if (booking.actualCheckOutTime) {
                const actualDate = new Date(booking.actualCheckOutTime);
                const formattedActual = new Date(actualDate.getTime() - actualDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                document.getElementById('editBookingActualCheckoutTime').value = formattedActual;
            } else {
                document.getElementById('editBookingActualCheckoutTime').value = '';
            }
            
            document.getElementById('editBookingLateFee').value = booking.lateCheckoutFee || 0;
            document.getElementById('editBookingCheckoutNotes').value = booking.checkoutNotes || '';
        } else {
            checkoutFields.classList.add('hidden');
        }

        document.getElementById('editBookingStatusSelect').onchange = function () {
            if (this.value === 'checked-out') {
                checkoutFields.classList.remove('hidden');
                if (!document.getElementById('editBookingActualCheckoutTime').value) {
                    const now = new Date();
                    const formattedNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    document.getElementById('editBookingActualCheckoutTime').value = formattedNow;
                }
            } else {
                checkoutFields.classList.add('hidden');
            }
        };

        window.openModal('editBookingModal');
    } catch (error) {
        console.error("Error loading edit booking modal:", error);
        alert("An error occurred: " + error.message);
    }
};

window.saveEditedBooking = async function (event) {
    event.preventDefault();
    const id = document.getElementById('editBookingId').value;
    const status = document.getElementById('editBookingStatusSelect').value;

    const payload = {
        guestName: document.getElementById('editBookingGuestName').value,
        guestPhone: document.getElementById('editBookingGuestPhone').value,
        guestEmail: document.getElementById('editBookingGuestEmail').value,
        roomId: document.getElementById('editBookingRoomSelect').value,
        status: status,
        startDate: document.getElementById('editBookingStartDate').value,
        endDate: document.getElementById('editBookingEndDate').value,
        checkInTime: document.getElementById('editBookingCheckInTime').value,
        checkOutTime: document.getElementById('editBookingCheckOutTime').value,
        totalAmount: parseFloat(document.getElementById('editBookingTotalAmount').value) || 0,
        specialRequests: document.getElementById('editBookingSpecialRequests').value
    };

    if (status === 'checked-out') {
        const actualVal = document.getElementById('editBookingActualCheckoutTime').value;
        payload.actualCheckOutTime = actualVal ? new Date(actualVal).toISOString() : null;
        payload.lateCheckoutFee = parseFloat(document.getElementById('editBookingLateFee').value) || 0;
        payload.checkoutNotes = document.getElementById('editBookingCheckoutNotes').value;
    }

    const response = await authFetch(`/bookings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });

    if (response && response.ok) {
        alert("Booking updated successfully.");
        window.closeModal('editBookingModal');
        if (typeof fetchOrders === 'function') fetchOrders();
    } else {
        alert("Failed to update booking.");
    }
};

