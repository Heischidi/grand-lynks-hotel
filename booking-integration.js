// Booking Integration with Backend
class BookingIntegration {
  constructor() {
    this.API_URL =
      (window.APP_CONFIG && window.APP_CONFIG.API_URL) ||
      "http://localhost:5000/api";
    this.PAYSTACK_KEY =
      (window.APP_CONFIG && window.APP_CONFIG.PAYSTACK_PUBLIC_KEY) ||
      "pk_test_51b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8";
    this.currentBooking = null;
    this.availableRooms = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupDateValidation();
  }

  setupEventListeners() {
    // Check availability button
    const btnCheck = document.getElementById("btnCheck");
    if (btnCheck) {
      btnCheck.addEventListener("click", () => this.checkAvailability());
    }

    // Pay button
    const btnPay = document.getElementById("btnPay");
    if (btnPay) {
      btnPay.addEventListener("click", () => this.processPayment());
    }

    // Terms checkbox
    const acceptTerms = document.getElementById("acceptTerms");
    if (acceptTerms) {
      acceptTerms.addEventListener("change", () => this.validateForm());
    }

    // Form inputs validation
    const inputs = ["fullName", "email", "phone"];
    inputs.forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener("input", () => this.validateForm());
      }
    });
  }

  setupDateValidation() {
    const checkin = document.getElementById("checkin");
    const checkout = document.getElementById("checkout");

    if (checkin && checkout) {
      // Set minimum date to today
      const today = new Date().toISOString().split("T")[0];
      checkin.min = today;
      checkout.min = today;

      // Update checkout minimum when checkin changes
      checkin.addEventListener("change", () => {
        const checkinDate = new Date(checkin.value);
        const nextDay = new Date(checkinDate);
        nextDay.setDate(nextDay.getDate() + 1);
        checkout.min = nextDay.toISOString().split("T")[0];

        if (checkout.value && new Date(checkout.value) <= checkinDate) {
          checkout.value = nextDay.toISOString().split("T")[0];
        }
      });

      // Validate checkout is after checkin
      checkout.addEventListener("change", () => {
        if (checkin.value && checkout.value) {
          const checkinDate = new Date(checkin.value);
          const checkoutDate = new Date(checkout.value);

          if (checkoutDate <= checkinDate) {
            this.showError("Check-out date must be after check-in date");
            checkout.value = "";
          }
        }
      });
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

    this.showLoading("btnCheck", "Checking availability...");
    console.log("BookingIntegration: Checking availability for:", {
      checkin,
      checkout,
      guests,
    });

    try {
      // Get all rooms from backend
      console.log(
        "BookingIntegration: Fetching rooms from:",
        `${this.API_URL}/rooms`
      );
      const response = await fetch(`${this.API_URL}/rooms`);
      console.log("BookingIntegration: Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "BookingIntegration: Failed to fetch rooms, response text:",
          errorText
        );
        throw new Error(`Failed to fetch rooms: ${response.statusText}`);
      }

      const rooms = await response.json();
      console.log("BookingIntegration: Fetched rooms:", rooms);

      // Filter available rooms - handle both old and new data structures
      this.availableRooms = rooms.filter((room) => {
        // Check if room is available (new structure) or has available property (old structure)
        const isAvailable =
          room.status === "available" || room.available === true;
        console.log(
          `BookingIntegration: Room ${room.id} (${room.type}): status=${room.status}, available=${room.available}, isAvailable=${isAvailable}`
        );
        return isAvailable;
      });

      console.log(
        "BookingIntegration: Available rooms after filtering:",
        this.availableRooms
      );

      if (this.availableRooms.length === 0) {
        this.showNoAvailability();
      } else {
        this.showAvailableRooms();
      }
    } catch (error) {
      console.error("BookingIntegration: Error checking availability:", error);
      this.showError("Failed to check availability. Please try again.");
    } finally {
      this.hideLoading("btnCheck", "Check Availability");
      console.log("BookingIntegration: Availability check finished.");
    }
  }

  showAvailableRooms() {
    const roomsPanel = document.getElementById("roomsPanel");
    const roomsList = document.getElementById("roomsList");
    const availabilityPanel = document.getElementById("availabilityPanel");

    // Hide availability panel, show rooms panel
    availabilityPanel.classList.add("hidden");
    roomsPanel.classList.remove("hidden");

    // Clear previous rooms
    roomsList.innerHTML = "";

    // Create room cards
    this.availableRooms.forEach((room) => {
      const roomCard = document.createElement("div");
      roomCard.className = "room-card";
      roomCard.innerHTML = `
                <div class="room-info">
                    <h4>${room.type}</h4>
                    <p>${room.description}</p>
                    <div class="room-price">₦${(
                      room.pricePerNight ||
                      room.price ||
                      0
                    ).toLocaleString()}/night</div>
                </div>
                <button class="btn-select-room" data-room-id="${room.id}">
                    Select Room
                </button>
            `;

      // Add click event
      const selectBtn = roomCard.querySelector(".btn-select-room");
      selectBtn.addEventListener("click", () => this.selectRoom(room));

      roomsList.appendChild(roomCard);
    });
  }

  selectRoom(room) {
    this.currentBooking = {
      room: room,
      checkin: document.getElementById("checkin").value,
      checkout: document.getElementById("checkout").value,
      guests: document.getElementById("guests").value,
    };

    // Show guest details panel
    const roomsPanel = document.getElementById("roomsPanel");
    const detailsPanel = document.getElementById("detailsPanel");
    const summaryPanel = document.getElementById("bookingSummaryPanel");

    roomsPanel.classList.add("hidden");
    detailsPanel.classList.remove("hidden");
    summaryPanel.classList.remove("hidden");

    // Update summary
    this.updateBookingSummary();
  }

  updateBookingSummary() {
    const summary = document.getElementById("bookingSummary");
    if (summary && this.currentBooking) {
      const { room, checkin, checkout, guests } = this.currentBooking;
      const checkinDate = new Date(checkin);
      const checkoutDate = new Date(checkout);
      const nights = Math.ceil(
        (checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)
      );
      const totalPrice = (room.pricePerNight || room.price || 0) * nights;

      summary.innerHTML = `
                <h4>Booking Summary</h4>
                <div class="summary-item">
                    <span>Room:</span>
                    <span>${room.type}</span>
                </div>
                <div class="summary-item">
                    <span>Check-in:</span>
                    <span>${new Date(checkin).toLocaleDateString()}</span>
                </div>
                <div class="summary-item">
                    <span>Check-out:</span>
                    <span>${new Date(checkout).toLocaleDateString()}</span>
                </div>
                <div class="summary-item">
                    <span>Guests:</span>
                    <span>${guests}</span>
                </div>
                <div class="summary-item">
                    <span>Nights:</span>
                    <span>${nights}</span>
                </div>
                <div class="summary-item total">
                    <span>Total:</span>
                    <span>₦${totalPrice.toLocaleString()}</span>
                </div>
            `;
    }
  }

  validateForm() {
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const acceptTerms = document.getElementById("acceptTerms").checked;
    const btnPay = document.getElementById("btnPay");

    const isValid = fullName && email && phone && acceptTerms;
    btnPay.disabled = !isValid;

    return isValid;
  }

  async processPayment() {
    if (!this.validateForm()) {
      this.showError("Please fill in all required fields and accept terms");
      return;
    }

    if (!this.currentBooking) {
      this.showError("No room selected");
      return;
    }

    this.showLoading("btnPay", "Processing...");

    try {
      // First create the guest
      const guestData = {
        name: document.getElementById("fullName").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
      };

      const guestResponse = await fetch(`${this.API_URL}/guests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(guestData),
      });

      if (!guestResponse.ok) throw new Error("Failed to create guest");
      const guest = await guestResponse.json();

      // Then create the booking
      const bookingData = {
        guestId: guest.id,
        roomId: this.currentBooking.room.id,
        startDate: this.currentBooking.checkin,
        endDate: this.currentBooking.checkout,
        status: "pending",
      };

      const response = await fetch(`${this.API_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) throw new Error("Failed to create booking");

      const booking = await response.json();

      // Initialize Paystack payment
      this.initializePaystack(booking);
    } catch (error) {
      console.error("Error processing payment:", error);
      this.showError("Failed to process payment. Please try again.");
      this.hideLoading("btnPay", "Pay with Paystack");
    }
  }

  initializePaystack(booking) {
    const { room } = this.currentBooking;
    const checkinDate = new Date(this.currentBooking.checkin);
    const checkoutDate = new Date(this.currentBooking.checkout);
    const nights = Math.ceil(
      (checkoutDate - checkinDate) / (1000 * 60 * 60 * 24)
    );
    const amount = (room.pricePerNight || room.price || 0) * nights * 100; // Paystack expects amount in kobo

    const handler = PaystackPop.setup({
      key: this.PAYSTACK_KEY,
      email: document.getElementById("email").value,
      amount: amount,
      currency: "NGN",
      ref: `GL_${Date.now()}`,
      callback: (response) => this.handlePaymentSuccess(response, booking),
      onClose: () => {
        this.hideLoading("btnPay", "Pay with Paystack");
        this.showError("Payment cancelled");
      },
    });

    handler.openIframe();
  }

  async handlePaymentSuccess(response, booking) {
    try {
      // Update booking with payment info
      const updatedBooking = {
        ...booking,
        status: "confirmed",
      };

      const updateResponse = await fetch(
        `${this.API_URL}/bookings/${booking.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedBooking),
        }
      );

      if (!updateResponse.ok) throw new Error("Failed to update booking");

      // Record payment
      const paymentData = {
        guestId: updatedBooking.guestId,
        amount: updatedBooking.totalAmount,
        method: "Paystack",
        status: "completed",
        reference: response.reference,
        bookingId: updatedBooking.id,
      };

      await fetch(`${this.API_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      // Show success and redirect
      this.showSuccess("Payment successful! Redirecting to confirmation...");
      setTimeout(() => {
        window.location.href = "thankyou.html";
      }, 2000);
    } catch (error) {
      console.error("Error handling payment success:", error);
      this.showError(
        "Payment successful but failed to update booking. Please contact support."
      );
    }
  }

  showNoAvailability() {
    const availabilityNote = document.getElementById("availabilityNote");
    if (availabilityNote) {
      availabilityNote.innerHTML = `
                <div class="error-message">
                    <p>No rooms available for the selected dates. Please try different dates.</p>
                </div>
            `;
    }
  }

  showLoading(buttonId, text) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = true;
      button.innerHTML = `<span class="loading-spinner"></span> ${text}`;
    }
  }

  hideLoading(buttonId, text) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = false;
      button.innerHTML = text;
    }
  }

  showError(message) {
    // Create or update error message
    let errorDiv = document.getElementById("error-message");
    if (!errorDiv) {
      errorDiv = document.createElement("div");
      errorDiv.id = "error-message";
      errorDiv.className = "error-message";
      document
        .querySelector(".booking-content-wrapper")
        .insertBefore(errorDiv, document.querySelector(".wrap"));
    }

    errorDiv.innerHTML = `<p>${message}</p>`;
    errorDiv.style.display = "block";

    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorDiv.style.display = "none";
    }, 5000);
  }

  showSuccess(message) {
    // Create or update success message
    let successDiv = document.getElementById("success-message");
    if (!successDiv) {
      successDiv = document.createElement("div");
      successDiv.id = "success-message";
      successDiv.className = "success-message";
      document
        .querySelector(".booking-content-wrapper")
        .insertBefore(successDiv, document.querySelector(".wrap"));
    }

    successDiv.innerHTML = `<p>${message}</p>`;
    successDiv.style.display = "block";

    // Auto-hide after 5 seconds
    setTimeout(() => {
      successDiv.style.display = "none";
    }, 5000);
  }
}

// Initialize booking integration when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new BookingIntegration();
});
