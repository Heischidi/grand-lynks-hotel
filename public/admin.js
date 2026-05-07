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
    settings: document.getElementById('section-settings')
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

    const token = localStorage.getItem('adminToken');
    const user = JSON.parse(localStorage.getItem('adminUser') || '{}');

    if (token) {
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
            <td data-label="Price" class="px-3 py-2 md:px-6 md:py-4 whitespace-nowrap text-xs md:text-sm block md:table-cell text-right md:text-left"><span class="md:hidden font-bold mr-2 text-gray-500 float-left">Price:</span>₦${(room.pricePerNight || room.price).toLocaleString()}</td>
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
        // Backend stores 'status' string, but UI often uses 'available' boolean derived status.
        // Let's rely on room.status which is raw.
        // Wait, schema says status: String // available, occupied, maintenance, reserved
        // The select options are: available, booked, maintenance
        // Map 'occupied'/'reserved' to 'booked' for the dropdown if needed?
        // Or just set value directly if it matches.
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
                <div class="space-x-2">
                    <button onclick="editTransaction(${item.id}, '${item.type}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                    <button onclick="deleteTransaction(${item.id}, '${item.type}')" class="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
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
                     ${isBooking && item.status !== 'pending' ? `<span class="text-xs text-gray-400 capitalize">Status: ${item.status}</span>` : ''}
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
        const guestData = {
            name: formData.get('guestName'),
            phone: formData.get('guestPhone'),
            email: formData.get('guestEmail')
        };

        const guestResponse = await fetch(`${API_URL}/guests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(guestData)
        });

        if (!guestResponse.ok) throw new Error('Failed to create guest record');
        const guestResult = await guestResponse.json();
        const guestId = guestResult.guest.id;

        // 2. Create Booking
        const paymentStatus = formData.get('paymentStatus'); // 'paid' or 'pending'
        
        const bookingData = {
            guestId: guestId,
            roomId: formData.get('roomId'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            status: paymentStatus === 'paid' ? 'confirmed' : 'pending'
        };

        // Note: Using authFetch for bookings if required, but server.js POST /bookings is confusingly open or closed.
        // Line 395 in server.js: app.post("/api/bookings", validateBooking, ...) -> NO AUTH middleware listed in the line itself?
        // Wait, other POSTs like /api/rooms have authenticateToken.
        // Safer to use authFetch just in case, but if it fails due to no token (if user not logged in?), wait.
        // Admin dashboard requires login, so authFetch is perfect.

        const bookingResponse = await authFetch('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });

        if (bookingResponse && bookingResponse.ok) {
            const successMsg = paymentStatus === 'paid' 
                ? 'Guest successfully registered and payment confirmed!' 
                : 'Guest registered! Booking is PENDING payment verification.';
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
                <button onclick="viewGuestHistory(${guest.id})" class="text-blue-600 hover:text-blue-900 font-medium">View History</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
 
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
 
// --- SETTINGS MANAGEMENT ---

async function fetchSettings() {
    try {
        const response = await authFetch('/settings');
        if (response && response.ok) {
            const data = await response.json();
            document.getElementById('settingTaxRate').value = data.taxRate || 8.5;
            document.getElementById('settingRoomServiceFee').value = data.roomServiceFee || 1000;
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
        <div class="text-center">
            <p class="text-2xl font-bold text-blue-600">${bookings.length}</p>
            <p class="text-xs text-gray-500 mt-1">Room Bookings</p>
        </div>
        <div class="text-center border-x border-gray-200">
            <p class="text-2xl font-bold text-green-600">${confirmedBookings}</p>
            <p class="text-xs text-gray-500 mt-1">Confirmed Stays</p>
        </div>
        <div class="text-center">
            <p class="text-2xl font-bold text-purple-600">₦${totalSpent.toLocaleString()}</p>
            <p class="text-xs text-gray-500 mt-1">Total Spent</p>
        </div>
    `;

    const listEl = document.getElementById('historyBookingList');

    if (bookings.length === 0 && orders.length === 0) {
        listEl.innerHTML = '<p class="text-center text-gray-400 py-6">No transactions on record for this guest.</p>';
        return;
    }

    // Combine & sort
    const combined = [
        ...bookings.map(b => ({ ...b, _type: 'booking' })),
        ...orders.map(o => ({ ...o, _type: 'order' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    listEl.innerHTML = combined.map(item => {
        const isBooking = item._type === 'booking';
        const date = new Date(item.createdAt).toLocaleString();

        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-700',
            confirmed: 'bg-blue-100 text-blue-700',
            'checked-in': 'bg-indigo-100 text-indigo-700',
            completed: 'bg-green-100 text-green-700',
            cancelled: 'bg-red-100 text-red-700',
        };
        const badgeClass = statusColors[item.status] || 'bg-gray-100 text-gray-700';

        if (isBooking) {
            const nights = item.startDate && item.endDate
                ? Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24))
                : '?';
            return `
                <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-base font-semibold text-gray-800">📅 Room Booking #${item.id}</span>
                                <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass} uppercase">${item.status}</span>
                            </div>
                            <p class="text-xs text-gray-500">${date}</p>
                        </div>
                        <p class="text-lg font-bold text-blue-700">₦${(item.totalAmount || 0).toLocaleString()}</p>
                    </div>
                    <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700">
                        <div><span class="font-medium text-gray-500">Room:</span> ${item.room ? (item.room.number || item.room.roomNumber) + ' – ' + item.room.type : 'N/A'}</div>
                        <div><span class="font-medium text-gray-500">Duration:</span> ${nights} night(s)</div>
                        <div><span class="font-medium text-gray-500">Check-in:</span> ${item.startDate ? new Date(item.startDate).toLocaleDateString() : 'N/A'}</div>
                        <div><span class="font-medium text-gray-500">Check-out:</span> ${item.endDate ? new Date(item.endDate).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    ${item.payments && item.payments.length > 0 ? `
                    <div class="mt-3 pt-3 border-t border-blue-200 text-xs text-gray-500">
                        <span class="font-medium">Payments:</span>
                        ${item.payments.map(p => `${p.method} – ₦${p.amount?.toLocaleString()} (${p.status})`).join(' &nbsp;|&nbsp; ')}
                    </div>` : ''}
                </div>
            `;
        } else {
            // Food order
            const itemsList = (item.orderItems || []).map(i =>
                `${i.quantity}× ${i.menuItem?.name || 'Item'}`
            ).join(', ') || 'No item details';

            return `
                <div class="bg-orange-50 border border-orange-100 rounded-xl p-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-base font-semibold text-gray-800">🍽️ Food Order #${item.id}</span>
                                <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass} uppercase">${item.status}</span>
                            </div>
                            <p class="text-xs text-gray-500">${date}</p>
                        </div>
                        <p class="text-lg font-bold text-orange-600">₦${(item.totalAmount || 0).toLocaleString()}</p>
                    </div>
                    <div class="mt-2 text-sm text-gray-700">
                        <span class="font-medium text-gray-500">Items:</span> ${itemsList}
                    </div>
                </div>
            `;
        }
    }).join('');
};

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
            roomServiceFee: document.getElementById('settingRoomServiceFee').value
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
document.addEventListener('DOMContentLoaded', () => {
    init();
    initPullToRefresh();
});

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

    mainEl.addEventListener('touchstart', (e) => {
        if (mainEl.scrollTop === 0) {
            startY = e.touches[0].clientY;
            pulling = true;
            triggered = false;
        }
    }, { passive: true });

    mainEl.addEventListener('touchmove', (e) => {
        if (!pulling || mainEl.scrollTop > 0) return;
        const delta = e.touches[0].clientY - startY;
        if (delta <= 0) return;

        const progress = Math.min(delta / THRESHOLD, 1);
        // Slide indicator down as user pulls
        const translateY = -80 + (progress * 96);
        indicator.style.transform = `translateX(-50%) translateY(${translateY}px)`;
        indicator.innerHTML = progress >= 1 ? '↺' : '↓';
        if (progress >= 1 && !triggered) triggered = true;
    }, { passive: true });

    mainEl.addEventListener('touchend', (e) => {
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

// Mobile Safari Scroll Restoration Fix
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

document.addEventListener('DOMContentLoaded', () => {
    // Reset window scroll
    window.scrollTo(0, 0);
    
    // Reset admin-main scroll immediately and after a short delay for Safari
    const resetScroll = () => {
        const mainEl = document.getElementById('admin-main');
        if (mainEl) {
            mainEl.scrollTop = 0;
        }
    };
    
    resetScroll();
    setTimeout(resetScroll, 50); // Double-check for iOS Safari painting delays
});
