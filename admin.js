// Configuration
const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:5000/api';

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const adminUsernameDisplay = document.getElementById('adminUsernameDisplay');

// Sections
const sections = {
    rooms: document.getElementById('section-rooms'),
    menu: document.getElementById('section-menu'),
    orders: document.getElementById('section-orders'),
    walkin: document.getElementById('section-walkin')
};

// --- AUTHENTICATION ---

function init() {
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
    Object.values(sections).forEach(sec => sec.classList.add('hidden'));

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

        // Load data
        if (tabName === 'rooms') fetchRooms();
        if (tabName === 'menu') fetchMenu();
        if (tabName === 'orders') fetchOrders();
        if (tabName === 'walkin') fetchAvailableRoomsForWalkIn();
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
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center">No rooms found. Add one!</td></tr>';
        return;
    }

    rooms.forEach(room => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap font-medium">${room.roomNumber || room.number || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">${room.type}</td>
            <td class="px-6 py-4 whitespace-nowrap">₦${(room.pricePerNight || room.price).toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${room.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${room.available ? 'Available' : 'Booked'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
    const data = {
        number: formData.get('number'),
        type: formData.get('type'),
        pricePerNight: parseFloat(formData.get('price')),
        description: formData.get('description'),
        status: 'available'
    };

    const response = await authFetch('/rooms', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (response && response.ok) {
        closeModal('roomModal');
        e.target.reset();
        fetchRooms();
    } else {
        alert('Failed to add room');
    }
}

async function deleteRoom(id) {
    if (!confirm('Are you sure you want to delete this room?')) return;

    const response = await authFetch(`/rooms/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        fetchRooms();
    } else {
        alert('Failed to delete room');
    }
}

function openEditRoomModal(roomId) {
    const room = window.currentRooms.find(r => r.id === roomId);
    if (!room) return;

    document.getElementById('editRoomId').value = room.id;
    document.getElementById('editRoomNumber').value = room.roomNumber || room.number || '';
    document.getElementById('editRoomType').value = room.type;
    document.getElementById('editRoomPrice').value = room.pricePerNight || room.price || 0;
    document.getElementById('editRoomDescription').value = room.description || '';

    const statusSelect = document.getElementById('editRoomStatus');
    if (statusSelect) {
        statusSelect.value = room.available ? 'available' : 'booked';
    }

    openModal('editRoomModal');
}

async function handleEditRoom(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const id = formData.get('id');
    // Basic status mapping logic
    const status = formData.get('status');
    const available = status === 'available';

    const data = {
        number: formData.get('number'),
        type: formData.get('type'),
        pricePerNight: parseFloat(formData.get('price')),
        description: formData.get('description'),
        available: available,
        status: status
    };

    const response = await authFetch(`/rooms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

    if (response && response.ok) {
        closeModal('editRoomModal');
        fetchRooms();
    } else {
        alert('Failed to update room');
    }
}

// --- MENU MANAGEMENT ---

async function fetchMenu() {
    const tbody = document.getElementById('menuTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center">Loading...</td></tr>';

    const response = await fetch(`${API_URL}/menu`);
    if (response && response.ok) {
        const items = await response.json();
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
            <td class="px-6 py-4 whitespace-nowrap">
                <img src="${item.image || 'images/placeholder-food.jpg'}" class="h-10 w-10 rounded-full object-cover" onerror="this.src='https://via.placeholder.com/40'">
            </td>
            <td class="px-6 py-4 whitespace-nowrap font-medium">${item.name}</td>
            <td class="px-6 py-4 whitespace-nowrap">${item.category}</td>
            <td class="px-6 py-4 whitespace-nowrap">₦${item.price.toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                    ${item.available ? 'Yes' : 'No'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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

async function deleteMenuItem(id) {
    if (!confirm('Delete this item?')) return;
    const response = await fetch(`${API_URL}/menu/${id}`, { method: 'DELETE' });
    if (response && response.ok) {
        fetchMenu();
    } else {
        alert('Failed to delete item');
    }
}

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

        renderOrders(allTransactions);

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

    items.forEach(item => {
        const isBooking = item.type === 'booking';

        const card = document.createElement('div');
        // Blue border for bookings, Status color for orders
        const borderColor = isBooking ? 'border-blue-500' : getStatusColor(item.status);
        card.className = `bg-white rounded-lg shadow p-6 border-l-4 ${borderColor}`;

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
            <div class="flex justify-between items-start mb-4">
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
            <div class="flex justify-end space-x-2">
                 ${!isBooking && item.status !== 'completed' && item.status !== 'cancelled' ? `
                    <button onclick="updateOrderStatus(${item.id}, 'completed')" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition">Mark Completed</button>
                    <button onclick="updateOrderStatus(${item.id}, 'cancelled')" class="bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200 transition">Cancel</button>
                 ` : ''}
                 ${isBooking ? '<span class="text-xs text-gray-400">Manage bookings in Rooms tab</span>' : ''}
                 ${!isBooking && (item.status === 'completed' || item.status === 'cancelled') ? '<span class="text-gray-400 text-sm">No actions available</span>' : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

function getStatusColor(status) {
    switch (status) {
        case 'pending': return 'border-yellow-500';
        case 'completed': return 'border-green-500';
        case 'cancelled': return 'border-red-500';
        default: return 'border-gray-500';
    }
}

async function updateOrderStatus(id, status) {
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
}

// --- MODAL UTILS ---

// --- WALK-IN MANAGEMENT ---

async function fetchAvailableRoomsForWalkIn() {
    const select = document.getElementById('walkInRoomSelect');
    select.innerHTML = '<option value="">Loading...</option>';

    const response = await fetch(`${API_URL}/rooms`);
    if (response && response.ok) {
        const rooms = await response.json();
        const availableRooms = rooms.filter(r => r.available);

        if (availableRooms.length === 0) {
            select.innerHTML = '<option value="">No rooms available</option>';
            return;
        }

        select.innerHTML = availableRooms.map(r =>
            `<option value="${r.id}">${r.roomNumber || r.number} - ${r.type} (₦${r.pricePerNight || r.price})</option>`
        ).join('');
    } else {
        select.innerHTML = '<option value="">Failed to load rooms</option>';
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
        const bookingData = {
            guestId: guestId,
            roomId: formData.get('roomId'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            status: 'checked-in' // Walk-ins are usually immediate
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
            alert('Guest successfully registered and checked in!');
            e.target.reset();
            switchTab('rooms'); // Go to rooms to see the status change
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

// --- MODAL UTILS ---

window.openModal = function (id) {
    document.getElementById(id).classList.remove('hidden');
}

window.closeModal = function (id) {
    document.getElementById(id).classList.add('hidden');
}

// --- EVENT LISTENERS ---

loginForm.addEventListener('submit', handleLogin);
document.getElementById('addRoomForm').addEventListener('submit', handleAddRoom);
document.getElementById('editRoomForm').addEventListener('submit', handleEditRoom);
document.getElementById('addMenuForm').addEventListener('submit', handleAddMenu);
document.getElementById('walkInForm').addEventListener('submit', handleWalkInSubmit);

// Init
document.addEventListener('DOMContentLoaded', init);
