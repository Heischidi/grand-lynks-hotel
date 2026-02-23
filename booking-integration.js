// Booking Integration with Backend
class BookingIntegration {
  constructor() {
    this.API_URL = window.APP_CONFIG?.API_URL || "http://localhost:5000/api";
    this.currentBooking = null; // { room, checkin, checkout, guests }
    this.availableRooms = [];
    this.init();
  }

  init() {
    console.log("URL Search:", window.location.search);
    this.setupEventListeners();
    this.setupDateValidation();
    this.setupTermsModal();
    this.setupPaymentNoticeModal();
    this.checkUrlParams();
  }

  setupEventListeners() {
    // Confirm Booking button
    const btnPay = document.getElementById("btnPay");
    if (btnPay) {
      btnPay.addEventListener("click", () => this.processBooking());
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
        if (id === 'guests') this.updateBooking();
        this.validateForm();
      });
    });

    // Dates - Auto update summary
    ["checkin", "checkout"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", () => {
        // Just update the booking state locally (nights/price calculation)
        console.log("Date changed, updating summary...");
        this.updateBooking();
        this.validateForm();
      });
    });
  }

  setupTermsModal() {
    const modal = document.getElementById("termsModalBackdrop");
    const openBtn = document.getElementById("openTerms");
    const closeBtn = document.getElementById("closeTerms");
    const acceptBtn = document.getElementById("acceptAndClose");
    const checkbox = document.getElementById("acceptTerms");

    if (!modal || !openBtn) return;

    const open = (e) => {
      if (e) e.preventDefault();
      modal.classList.add("open");
      modal.style.display = "flex"; // Force flex
      modal.style.zIndex = "99999"; // Force top
      document.body.style.overflow = "hidden";
      console.log("Opening terms modal");
    };

    const close = () => {
      modal.classList.remove("open");
      document.body.style.overflow = "";
    };

    openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);

    if (acceptBtn) {
      acceptBtn.addEventListener("click", () => {
        if (checkbox) {
          checkbox.checked = true;
          // Trigger change event for validation
          checkbox.dispatchEvent(new Event('change'));
        }
        close();
      });
    }

    // Close on backdrop click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
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

    if (roomType) {
      console.log("Found URL params:", { roomType, price, roomId });

      // Mock a room object since we trust the URL
      const room = {
        id: roomId ? parseInt(roomId) : Date.now(),
        type: roomType,
        price: parseFloat(price) || 0,
        description: "Selected via direct link"
      };

      this.prefillDates();
      this.selectRoom(room);
      this.showDetails();

    } else {
      // No URL params -> Direct navigation. Show room selector.
      console.log("No URL params - Direct navigation mode");
      this.resetView(); // Ensure details are hidden
      await this.loadRoomsForSelection();
    }
  }

  prefillDates() {
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
  }

  showDetails() {
    const details = document.getElementById("detailsPanel");
    if (details) details.classList.remove("hidden");
  }

  resetView() {
    const details = document.getElementById("detailsPanel");
    const selectSection = document.getElementById("selectRoomSection");
    if (details) details.classList.add("hidden");
    if (selectSection) selectSection.classList.remove("hidden");
  }

  async loadRoomsForSelection() {
    const select = document.getElementById("roomSelect");
    const loading = document.getElementById("roomLoading");
    if (!select) return;

    if (loading) loading.classList.remove("hidden");

    try {
      const res = await fetch(`${this.API_URL}/rooms`);
      if (!res.ok) throw new Error("Failed to load rooms");

      const rooms = await res.json();
      this.availableRooms = rooms; // Cache them

      select.innerHTML = '<option value="">-- Choose a Room --</option>';
      rooms.forEach(room => {
        const price = room.pricePerNight || room.price || 0;
        const option = document.createElement("option");
        option.value = room.id;
        option.textContent = `${room.type} - ₦${price.toLocaleString()}`;
        option.dataset.room = JSON.stringify(room);
        select.appendChild(option);
      });

      // Listen for selection
      select.addEventListener("change", (e) => {
        const selectedId = e.target.value;
        if (selectedId) {
          const room = this.availableRooms.find(r => r.id == selectedId);
          if (room) {
            this.prefillDates();
            this.selectRoom(room);
            this.showDetails();

            // Optional: Hide selector after selection? Or keep it?
            // keeping it allows changing room easily.
          }
        }
      });

    } catch (err) {
      console.error(err);
      select.innerHTML = '<option value="">Error loading rooms</option>';
    } finally {
      if (loading) loading.classList.add("hidden");
    }
  }

  // checkAvailability method deprecated/integrated into initial load or submit check
  async checkAvailability() {
    console.warn("Manual checkAvailability is deprecated. Changes are handled via URL or auto-update.");
  }

  /* 
   * showAvailableRooms removed as we rely on URL pre-selection or full list
   */

  showNoAvailability() {
    const container = document.getElementById("roomsList");
    container.innerHTML = `<p class="error-message">No rooms available for these dates.</p>`;
    document.getElementById("roomsPanel").classList.remove("hidden");
  }

  selectRoom(room) {
    console.log("selectRoom called with:", room);
    this.currentBooking = {
      room: room,
      checkin: document.getElementById("checkin").value,
      checkout: document.getElementById("checkout").value,
      guests: document.getElementById("guests").value || "1"
    };

    // Show details
    document.getElementById("detailsPanel").classList.remove("hidden");

    // Fill the new display input if it exists
    const displayRoomEl = document.getElementById("displayRoom");
    if (displayRoomEl) {
      displayRoomEl.value = room.type;
    }

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

  // Step 1: Show the payment notice modal instead of booking immediately
  processBooking() {
    console.log("processBooking called - showing payment notice");
    this.showPaymentNotice();
  }

  showPaymentNotice() {
    const backdrop = document.getElementById("paymentNoticeBackdrop");
    const step1 = document.getElementById("paymentNoticeStep1");
    const step2 = document.getElementById("paymentNoticeStep2");
    if (!backdrop) return;

    // Reset to step 1
    step1.style.display = "block";
    step2.style.display = "none";
    backdrop.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  setupPaymentNoticeModal() {
    const proceedBtn = document.getElementById("proceedToAccountBtn");
    const confirmBtn = document.getElementById("confirmTransferBtn");
    const backdrop = document.getElementById("paymentNoticeBackdrop");

    if (proceedBtn) {
      proceedBtn.addEventListener("click", () => {
        // Populate total in step 2
        const totalEl = document.getElementById("noticeModalTotal");
        if (totalEl && this.currentBooking) {
          const { room, checkin, checkout } = this.currentBooking;
          const price = room.pricePerNight || room.price || 0;
          const nights = Math.ceil(
            (new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24)
          ) || 0;
          totalEl.textContent = "\u20A6" + (price * nights).toLocaleString();
        }
        document.getElementById("paymentNoticeStep1").style.display = "none";
        document.getElementById("paymentNoticeStep2").style.display = "block";
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        // Close modal and submit booking to API
        if (backdrop) {
          backdrop.style.display = "none";
          document.body.style.overflow = "";
        }
        this.submitBooking();
      });
    }
  }

  // Step 2: Actual API submission (called after modal confirmation)
  async submitBooking() {
    console.log("submitBooking called");
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
      const guestId = guestResponse.guest ? guestResponse.guest.id : guestResponse.id;

      // 2. Create Booking
      const bookingData = {
        guestId: guestId,
        roomId: this.currentBooking.room.id,
        startDate: this.currentBooking.checkin,
        endDate: this.currentBooking.checkout,
        status: "pending",
      };

      const bookingRes = await fetch(`${this.API_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      if (!bookingRes.ok) {
        const errText = await bookingRes.text();
        throw new Error(`Server Error (${bookingRes.status}): ${errText}`);
      }

      // Success
      window.location.href = "thankyou.html?payment=transfer";

    } catch (error) {
      console.error(error);
      this.showError(`Booking failed: ${error.message}`);
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
