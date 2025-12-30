// Booking Integration with Backend
class BookingIntegration {
  constructor() {
    this.API_URL = window.APP_CONFIG?.API_URL || "http://localhost:5000/api";
    this.currentBooking = null; // { room, checkin, checkout, guests }
    this.availableRooms = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupDateValidation();
    this.checkUrlParams();
  }

  setupEventListeners() {
    // Check availability button
    const btnCheck = document.getElementById("btnCheck");
    if (btnCheck) {
      btnCheck.addEventListener("click", () => this.checkAvailability());
    }

    // Confirm Booking button
    const btnPay = document.getElementById("btnPay");
    if (btnPay) {
      btnPay.addEventListener("click", () => this.processBooking()); // Rename to processBooking
    }

    // Terms checkbox
    const acceptTerms = document.getElementById("acceptTerms");
    if (acceptTerms) {
      acceptTerms.addEventListener("change", () => this.validateForm());
    }

    // Inputs
    ["fullName", "email", "phone", "guests"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", () => {
        if (id === 'guests') this.updateBooking(); // Update booking state on guest change
        this.validateForm();
      });
    });

    // Dates
    ["checkin", "checkout"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", () => {
        this.updateBooking(); // Recalculate nights/price
        this.validateForm();
      });
    });
  }

  setupDateValidation() {
    const checkin = document.getElementById("checkin");
    const checkout = document.getElementById("checkout");

    if (checkin && checkout) {
      const today = new Date().toISOString().split("T")[0];
      checkin.min = today;
      checkout.min = today;

      checkin.addEventListener("change", () => {
        if (checkin.value) {
          const checkinDate = new Date(checkin.value);
          const nextDay = new Date(checkinDate);
          nextDay.setDate(nextDay.getDate() + 1);
          checkout.min = nextDay.toISOString().split("T")[0];

          if (checkout.value && new Date(checkout.value) <= checkinDate) {
            checkout.value = nextDay.toISOString().split("T")[0];
          }
        }
      });
    }
  }

  async checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const roomType = params.get('room');
    const price = params.get('price');
    const roomId = params.get('roomId');

    if (roomType && price) {
      console.log("Found URL params:", { roomType, price, roomId });

      // Mock a room object since we trust the URL (or double check via API if critical)
      const room = {
        id: roomId ? parseInt(roomId) : Date.now(), // Fallback ID if missing
        type: roomType,
        price: parseFloat(price),
        description: "Selected via direct link"
      };

      // Pre-select dates if missing (e.g. today + tomorrow)
      const checkinEl = document.getElementById("checkin");
      const checkoutEl = document.getElementById("checkout");
      if (!checkinEl.value) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        checkinEl.value = today.toISOString().split("T")[0];
        checkoutEl.value = tomorrow.toISOString().split("T")[0];

        // Trigger min-date logic
        const event = new Event('change');
        checkinEl.dispatchEvent(event);
      }

      // Set state
      this.selectRoom(room);

      // Reveal Details Panel immediately
      document.getElementById("detailsPanel").classList.remove("hidden");
    }
  }

  async checkAvailability() {
    const checkin = document.getElementById("checkin").value;
    const checkout = document.getElementById("checkout").value;
    const guests = document.getElementById("guests").value;

    if (!checkin || !checkout || !guests) {
      this.showError("Please fill in all required fields");
      return;
    }

    this.showLoading("btnCheck", "Checking...");

    try {
      const response = await fetch(`${this.API_URL}/check-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkIn: checkin, checkOut: checkout })
      });

      if (!response.ok) throw new Error("Network response was not ok");
      const available = await response.json(); // Array of available rooms

      if (Array.isArray(available) && available.length > 0) {
        this.showAvailableRooms(available);
      } else {
        this.showNoAvailability();
      }

    } catch (error) {
      console.error("Error checking availability:", error);
      this.showError("Error checking availability. Please try again.");
    } finally {
      this.hideLoading("btnCheck", "Check Availability");
    }
  }

  showAvailableRooms(rooms) {
    const roomsPanel = document.getElementById("roomsPanel");
    const roomsList = document.getElementById("roomsList");
    const availabilityPanel = document.getElementById("availabilityPanel");

    // Keep availability panel visible but maybe collapse it? 
    // For now, let's just show results below.
    roomsPanel.classList.remove("hidden");
    roomsList.innerHTML = "";

    rooms.forEach((room) => {
      const price = room.pricePerNight || room.price;
      const roomCard = document.createElement("div");
      roomCard.className = "room-card room-option"; // reuse room-option style
      roomCard.innerHTML = `
            <div class="room-info">
                <h4>${room.type}</h4>
                <div class="room-price">₦${price.toLocaleString()}/night</div>
            </div>
            <button class="btn-select-room btn btn-primary btn-sm">Select</button>
      `;

      roomCard.querySelector(".btn-select-room").addEventListener("click", () => {
        this.selectRoom(room);
        // Scroll to details
        document.getElementById("detailsPanel").scrollIntoView({ behavior: 'smooth' });
      });

      roomsList.appendChild(roomCard);
    });
  }

  showNoAvailability() {
    const container = document.getElementById("roomsList");
    container.innerHTML = `<p class="error-message">No rooms available for these dates.</p>`;
    document.getElementById("roomsPanel").classList.remove("hidden");
  }

  selectRoom(room) {
    this.currentBooking = {
      room: room,
      checkin: document.getElementById("checkin").value,
      checkout: document.getElementById("checkout").value,
      guests: document.getElementById("guests").value || "1"
    };

    // Show details
    document.getElementById("detailsPanel").classList.remove("hidden");

    // Update summary
    this.updateBookingSummary();
    this.validateForm();
  }

  updateBooking() {
    // Called when dates or guests change
    if (!this.currentBooking) return;

    this.currentBooking.checkin = document.getElementById("checkin").value;
    this.currentBooking.checkout = document.getElementById("checkout").value;
    this.currentBooking.guests = document.getElementById("guests").value;

    this.updateBookingSummary();
  }

  updateBookingSummary() {
    if (!this.currentBooking) return;

    const { room, checkin, checkout, guests } = this.currentBooking;

    // Calculate nights
    const start = new Date(checkin);
    const end = new Date(checkout);
    const ms = end - start;
    const nights = ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;

    const price = room.pricePerNight || room.price || 0;
    const total = price * nights;

    // Update Sidebar Elements (Specific IDs)
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const money = n => "₦" + n.toLocaleString();

    set("sumRoom", room.type);
    set("sumCheckin", checkin || "—");
    set("sumCheckout", checkout || "—");
    set("sumGuests", guests || "—");
    set("sumPrice", money(price));
    set("sumNights", nights);
    set("sumTotal", money(total));
  }

  validateForm() {
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const acceptTerms = document.getElementById("acceptTerms").checked;

    const hasBooking = !!this.currentBooking && this.currentBooking.checkin && this.currentBooking.checkout;

    const btnPay = document.getElementById("btnPay");
    if (btnPay) {
      btnPay.disabled = !(fullName && email && phone && acceptTerms && hasBooking);
    }
  }

  async processBooking() {
    // Manual Bank Transfer Logic
    const btnPay = document.getElementById("btnPay");
    this.showLoading("btnPay", "Processing...");

    try {
      const guestData = {
        name: document.getElementById("fullName").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
      };

      // 1. Create/Get Guest
      const guestRes = await fetch(`${this.API_URL}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guestData),
      });
      const guestResponse = await guestRes.json();
      const guestId = guestResponse.guest ? guestResponse.guest.id : guestResponse.id; // Handle varied response structure

      // 2. Create Booking
      const bookingData = {
        guestId: guestId,
        roomId: this.currentBooking.room.id,
        startDate: this.currentBooking.checkin,
        endDate: this.currentBooking.checkout,
        status: "pending", // Pending transfer
      };

      const bookingRes = await fetch(`${this.API_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      if (!bookingRes.ok) throw new Error("Booking creation failed");

      // Success
      window.location.href = "thankyou.html?payment=transfer";

    } catch (error) {
      console.error(error);
      this.showError("Booking failed. Please try again.");
      this.hideLoading("btnPay", "Confirm Booking");
    }
  }

  showLoading(btnId, text) {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.dataset.originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = text;
    }
  }

  hideLoading(btnId, defaultText) {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = defaultText || btn.dataset.originalText || "Submit";
    }
  }

  showError(msg) {
    alert(msg); // simple fallback
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  new BookingIntegration();
});
