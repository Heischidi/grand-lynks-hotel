// =============================================================================
// GRAND SPA & WELLNESS MODULE — Routes & Controllers
// =============================================================================

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Resend } = require("resend");

const DEFAULT_SPA_SERVICES = [
  // Facials (6)
  { name: "Deep Cleansing Facial", category: "Facials", duration: "", price: 15000, description: null, targetFocus: null },
  { name: "Treatment Facial", category: "Facials", duration: "", price: 20000, description: null, targetFocus: null },
  { name: "Pro-Acne Facial", category: "Facials", duration: "", price: 25000, description: null, targetFocus: null },
  { name: "Hydra Facial", category: "Facials", duration: "", price: 35000, description: null, targetFocus: null },
  { name: "Dermaplaning Facial", category: "Facials", duration: "", price: 30000, description: null, targetFocus: null },
  { name: "Purifying Facial", category: "Facials", duration: "", price: 18000, description: null, targetFocus: null },

  // Massage (8)
  { name: "Swedish Massage", category: "Massage", duration: "", price: 25000, description: null, targetFocus: null },
  { name: "Deep Tissue Massage", category: "Massage", duration: "", price: 30000, description: null, targetFocus: null },
  { name: "Hot Stone Massage", category: "Massage", duration: "", price: 35000, description: null, targetFocus: null },
  { name: "Aromatherapy Massage", category: "Massage", duration: "", price: 28000, description: null, targetFocus: null },
  { name: "Back, Neck and Shoulder Massage", category: "Massage", duration: "", price: 12000, description: null, targetFocus: null },
  { name: "Back, Waist and Shoulder Massage", category: "Massage", duration: "", price: 12000, description: null, targetFocus: null },
  { name: "Head Massage", category: "Massage", duration: "", price: 10000, description: null, targetFocus: null },
  { name: "Foot Massage", category: "Massage", duration: "", price: 10000, description: null, targetFocus: null },

  // Pedicures (4)
  { name: "Classic Pedicure", category: "Pedicures", duration: "", price: 15000, description: null, targetFocus: null },
  { name: "Paraffin Wax Pedicure", category: "Pedicures", duration: "", price: 18000, description: null, targetFocus: null },
  { name: "Jelly Pedicure", category: "Pedicures", duration: "", price: 17000, description: null, targetFocus: null },
  { name: "Dry Pedicure", category: "Pedicures", duration: "", price: 16000, description: null, targetFocus: null },

  // Manicures (3)
  { name: "Classic Manicure", category: "Manicures", duration: "", price: 12000, description: null, targetFocus: null },
  { name: "Paraffin Wax Manicure", category: "Manicures", duration: "", price: 15000, description: null, targetFocus: null },
  { name: "Jelly Manicure", category: "Manicures", duration: "", price: 13000, description: null, targetFocus: null },

  // Waxing (Sugar) (9)
  { name: "Full Body Wax", category: "Waxing (Sugar)", duration: "", price: 20000, description: null, targetFocus: null },
  { name: "Full Body Wax with Underarms and Brazilian", category: "Waxing (Sugar)", duration: "", price: 25000, description: null, targetFocus: null },
  { name: "Brazilian Wax", category: "Waxing (Sugar)", duration: "", price: 10000, description: null, targetFocus: null },
  { name: "Underarms Wax", category: "Waxing (Sugar)", duration: "", price: 5000, description: null, targetFocus: null },
  { name: "Underarms and Brazilian", category: "Waxing (Sugar)", duration: "", price: 15000, description: null, targetFocus: null },
  { name: "Full Legs Wax", category: "Waxing (Sugar)", duration: "", price: 16000, description: null, targetFocus: null },
  { name: "Half Legs Wax", category: "Waxing (Sugar)", duration: "", price: 10000, description: null, targetFocus: null },
  { name: "Full Hands Wax", category: "Waxing (Sugar)", duration: "", price: 15000, description: null, targetFocus: null },
  { name: "Half Hands Wax", category: "Waxing (Sugar)", duration: "", price: 10000, description: null, targetFocus: null },

  // Waxing (Strip) (7)
  { name: "Full Body Wax", category: "Waxing (Strip)", duration: "", price: 25000, description: null, targetFocus: null },
  { name: "Full Body Wax with Underarms and Brazilian", category: "Waxing (Strip)", duration: "", price: 30000, description: null, targetFocus: null },
  { name: "Brazilian Wax", category: "Waxing (Strip)", duration: "", price: 15000, description: null, targetFocus: null },
  { name: "Underarms Wax", category: "Waxing (Strip)", duration: "", price: 10000, description: null, targetFocus: null },
  { name: "Full Legs Wax", category: "Waxing (Strip)", duration: "", price: 18000, description: null, targetFocus: null },
  { name: "Half Legs Wax", category: "Waxing (Strip)", duration: "", price: 15000, description: null, targetFocus: null },
  { name: "Arms Wax", category: "Waxing (Strip)", duration: "", price: 16000, description: null, targetFocus: null }
];

// -----------------------------------------------------------------------------
// EMAIL HELPERS (Resend)
// -----------------------------------------------------------------------------
function formatNaira(amount) {
  return `₦${Number(amount || 0).toLocaleString()}`;
}

function formatPaymentMethodLabel(method, paymentStatus) {
  const m = (method || "").toLowerCase();
  if (m === "transfer") return "Bank Transfer";
  if (m === "pos") return "POS / Card";
  if (m === "cash") return "Cash";
  if (m === "room" || m === "charged-to-room" || paymentStatus === "charged-to-room") return "Charged to Room";
  return method ? method.toUpperCase() : "Approved";
}

function formatAppointmentDate(dateVal) {
  try {
    return new Date(dateVal).toDateString();
  } catch {
    return String(dateVal || "");
  }
}

async function sendSpaBookingReceivedEmail(resend, booking) {
  if (!booking?.email) {
    return { sent: false, reason: "no_email" };
  }

  const refLabel = booking.bookingRef || `SPA-${booking.id}`;
  const formattedDate = formatAppointmentDate(booking.appointmentDate);
  const statusSubtitle = booking.paymentStatus === "charged-to-room"
    ? "Status: Charged to Room (Pending Approval)"
    : "Status: Pending Payment";

  try {
    const { data, error } = await resend.emails.send({
      from: "Grand Spa - Grand Lynks <bookings@grandlynkshomesandapartments.com>",
      replyTo: "reservations@grandlynkshomesandapartments.com",
      to: booking.email,
      subject: `Your Appointment at Grand Spa - Ref #${refLabel}`,
      headers: {
        "List-Unsubscribe": "<mailto:unsubscribe@grandlynkshomesandapartments.com>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-Mailer": "Grand Lynks Reservations System"
      },
      text: `Dear ${booking.guestName},\n\nThank you for choosing Grand Spa at Grand Lynks Homes & Apartments. Your appointment request has been received.\n\nBooking Ref: #${refLabel}\nService: ${booking.serviceName}\nDate: ${formattedDate}\nTime Slot: ${booking.timeSlot}\nGuests: ${booking.numberOfGuests || 1}${booking.roomNumber ? `\nRoom Number: ${booking.roomNumber}` : ""}${booking.specialRequests ? `\nPreferences: ${booking.specialRequests}` : ""}\nTotal Amount: NGN ${Number(booking.price || 0).toLocaleString()}\n\nTo complete payment, please transfer the total amount to:\nBank: Moniepoint\nAccount Name: Grand Lynks Homes and Apartments\nAccount Number: 5015151292\n\nPlease use your name and booking reference (${refLabel}) as the transfer description. Once payment is verified and approved by Grand Spa, you will receive a payment confirmation email.\n\nNeed help? Call us at +234 814 223 4691\n80 Pa Michael Imoudu Ave, Gwarinpa, Abuja\n\nWarm regards,\nThe Grand Spa Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2c6ba; border-radius: 10px; overflow: hidden; background-color: #fffaf7; color: #3a2318;">
          <div style="background-color: #fbf1ec; padding: 24px; border-bottom: 3px solid #462614;">
            <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #7a523c;">Grand Lynks Homes &amp; Apartments</p>
            <h2 style="color: #462614; margin: 0;">Grand Spa — Appointment Received</h2>
            <p style="margin: 6px 0 0; color: #6b4c3b; font-size: 13px;">${statusSubtitle}</p>
          </div>

          <div style="padding: 28px;">
            <p>Dear ${booking.guestName},</p>
            <p>Thank you for choosing <strong>Grand Spa</strong> at Grand Lynks Homes &amp; Apartments. Your spa appointment has been received.</p>

            <div style="background-color: #fbf1ec; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2c6ba;">
              <h3 style="margin-top: 0; color: #462614;">Appointment Details</h3>
              <p style="margin: 6px 0;"><strong>Booking Ref:</strong> #${refLabel}</p>
              <p style="margin: 6px 0;"><strong>Service:</strong> ${booking.serviceName}</p>
              <p style="margin: 6px 0;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 6px 0;"><strong>Time Slot:</strong> ${booking.timeSlot}</p>
              <p style="margin: 6px 0;"><strong>Guests:</strong> ${booking.numberOfGuests || 1}</p>
              ${booking.roomNumber ? `<p style="margin: 6px 0;"><strong>Room Number:</strong> ${booking.roomNumber}</p>` : ""}
              ${booking.specialRequests ? `<p style="margin: 6px 0;"><strong>Preferences:</strong> ${booking.specialRequests}</p>` : ""}
              <p style="margin: 10px 0 0;"><strong>Total Amount:</strong> ${formatNaira(booking.price)}</p>
            </div>

            <div style="border: 2px solid #462614; padding: 20px; border-radius: 8px; margin: 24px 0; background-color: #ffffff;">
              <h3 style="color: #462614; margin-top: 0;">Payment Instructions</h3>
              <p>To confirm payment in advance, please transfer the total amount to the account below (or settle at Grand Spa / via your hotel room bill):</p>
              <div style="background: #fbf1ec; padding: 15px; border-radius: 6px; border: 1px solid #e2c6ba;">
                <p style="margin: 5px 0;"><strong>Bank Name:</strong> Moniepoint</p>
                <p style="margin: 5px 0;"><strong>Account Name:</strong> Grand Lynks Homes and Apartments</p>
                <p style="margin: 5px 0;"><strong>Account Number:</strong> 5015151292</p>
              </div>
              <p style="margin-top: 14px; font-size: 0.9em; color: #6b4c3b;"><em>Please use your name and reference (#${refLabel}) as the transfer description. Once payment is verified and approved by Grand Spa, you will receive a payment confirmation email.</em></p>
            </div>

            <p>Need help? Contact us at +234 814 223 4691.</p>
            <p style="margin: 0;">80 Pa Michael Imoudu Ave, Gwarinpa, Abuja</p>
            <p>Warm regards,<br>The Grand Spa Team</p>
            <p style="margin-top: 28px; font-size: 0.8em; color: #8b6b5a; text-align: center; border-top: 1px solid #e2c6ba; padding-top: 15px;">
              Don't see our emails? Please check your <strong>Spam folder</strong> and mark them as "Not Spam."
            </p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error("Resend delivery failed for Grand Spa booking email:", error);
      return { sent: false, error };
    }
    console.log("Grand Spa booking confirmation email sent via Resend ID:", data?.id);
    return { sent: true, id: data?.id || null };
  } catch (error) {
    console.error("Unexpected error in sendSpaBookingReceivedEmail:", error);
    return { sent: false, error };
  }
}

async function sendSpaPaymentApprovedEmail(resend, booking) {
  if (!booking?.email) {
    return { sent: false, reason: "no_email" };
  }

  const refLabel = booking.bookingRef || `SPA-${booking.id}`;
  const formattedDate = formatAppointmentDate(booking.appointmentDate);
  const methodLabel = formatPaymentMethodLabel(booking.paymentMethod, booking.paymentStatus);

  try {
    const { data, error } = await resend.emails.send({
      from: "Grand Spa - Grand Lynks <bookings@grandlynkshomesandapartments.com>",
      replyTo: "reservations@grandlynkshomesandapartments.com",
      to: booking.email,
      subject: `Payment Approved — Your Grand Spa Appointment is Confirmed (Ref #${refLabel})`,
      headers: {
        "List-Unsubscribe": "<mailto:unsubscribe@grandlynkshomesandapartments.com>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-Mailer": "Grand Lynks Reservations System"
      },
      text: `Dear ${booking.guestName},\n\nGreat news! We have approved your payment and your appointment at Grand Spa (Grand Lynks Homes & Apartments) is now officially confirmed.\n\nBooking Ref: #${refLabel}\nService: ${booking.serviceName}\nDate: ${formattedDate}\nTime Slot: ${booking.timeSlot}\nGuests: ${booking.numberOfGuests || 1}\nAmount Paid: NGN ${Number(booking.price || 0).toLocaleString()}\nPayment Method: ${methodLabel}\nPayment Status: Paid & Approved\n\nPlease arrive 10 minutes prior to your scheduled appointment at Grand Spa, 80 Pa Michael Imoudu Ave, Gwarinpa, Abuja.\n\nWe look forward to welcoming you soon!\n\nWarm regards,\nThe Grand Spa Team\nhttps://grandlynkshomesandapartments.com/spa.html`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2c6ba; border-radius: 10px; overflow: hidden; background-color: #fffaf7; box-shadow: 0 4px 10px rgba(70,38,20,0.06);">
          <div style="background-color: #462614; padding: 28px; text-align: center;">
            <p style="color: #e8c5b8; margin: 0 0 6px; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;">Grand Spa • Grand Lynks</p>
            <h1 style="color: #fbf1ec; margin: 0;">Payment Approved</h1>
          </div>

          <div style="padding: 30px; color: #3a2318;">
            <h2 style="color: #462614; margin-top: 0;">Your Spa Appointment is Finalized!</h2>
            <p>Dear ${booking.guestName},</p>
            <p>We are delighted to inform you that your payment has been received and approved. Your appointment at <strong>Grand Spa</strong> is now officially confirmed.</p>

            <div style="background-color: #fbf1ec; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px dashed #462614;">
              <h3 style="margin-top: 0; color: #462614;">Confirmed Appointment Details</h3>
              <p style="margin: 6px 0;"><strong>Booking Ref:</strong> #${refLabel}</p>
              <p style="margin: 6px 0;"><strong>Service:</strong> ${booking.serviceName}</p>
              <p style="margin: 6px 0;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 6px 0;"><strong>Time Slot:</strong> ${booking.timeSlot}</p>
              <p style="margin: 6px 0;"><strong>Guests:</strong> ${booking.numberOfGuests || 1}</p>
              <p style="margin: 6px 0;"><strong>Amount Paid:</strong> ${formatNaira(booking.price)}</p>
              <p style="margin: 6px 0;"><strong>Payment Method:</strong> ${methodLabel}</p>
              <p style="margin: 6px 0;"><strong>Status:</strong> Paid &amp; Approved</p>
            </div>

            <p>Please arrive 10 minutes before your scheduled session at Grand Spa, 80 Pa Michael Imoudu Ave, Gwarinpa, Abuja. For inquiries, call +234 814 223 4691.</p>
            <p style="margin-top: 20px; font-weight: 500;">We look forward to pampering you soon!</p>

            <div style="text-align: center; margin-top: 28px;">
              <a href="https://grandlynkshomesandapartments.com/spa.html" style="background-color: #462614; color: #fbf1ec; padding: 12px 26px; text-decoration: none; border-radius: 25px; font-weight: bold;">View Grand Spa Menu</a>
            </div>
            <p style="margin-top: 36px; font-size: 0.8em; color: #8b6b5a; text-align: center; border-top: 1px solid #e2c6ba; padding-top: 15px;">
              Don't see our emails? Please check your <strong>Spam folder</strong> and mark them as "Not Spam."
            </p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error("Resend delivery failed for Grand Spa payment approval email:", error);
      return { sent: false, error };
    }
    console.log("Grand Spa payment approval email sent via Resend ID:", data?.id);
    return { sent: true, id: data?.id || null };
  } catch (error) {
    console.error("Unexpected error in sendSpaPaymentApprovedEmail:", error);
    return { sent: false, error };
  }
}

// Helper to seed services if empty
async function ensureDefaultServices(prisma) {
  try {
    const count = await prisma.spaService.count({ where: { deletedAt: null } });
    if (count === 0) {
      for (const s of DEFAULT_SPA_SERVICES) {
        await prisma.spaService.create({
          data: {
            name: s.name,
            category: s.category,
            duration: s.duration,
            price: s.price,
            description: s.description,
            targetFocus: s.targetFocus,
            available: true
          }
        });
      }
      console.log("✅ Seeded official Grand Spa service menu (37 treatments).");
    }
  } catch (err) {
    console.warn("Could not check/seed spa services automatically:", err.message);
  }
}

module.exports = function registerSpaRoutes(app, prisma, authenticateSpaAdmin, SECRET_KEY, loginLimiter, resendClient) {
  const resend = resendClient || new Resend(process.env.RESEND_API_KEY || "re_your_api_key");

  // Ensure default services are seeded on startup
  ensureDefaultServices(prisma);

  // ---------------------------------------------------------------------------
  // SPA ADMIN AUTHENTICATION
  // ---------------------------------------------------------------------------

  // Dedicated Spa Admin Login
  app.post("/spa/auth/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const cleanUsername = username.trim().toLowerCase();
    const spaAdminEnvPassword = process.env.SPA_ADMIN_PASSWORD || "GrandLynksSpa2025!";

    // Allow spaadmin with env password fallback
    if (cleanUsername === "spaadmin" && password === spaAdminEnvPassword) {
      const token = jwt.sign(
        { id: "spaadmin_env", username: "spaadmin", role: "spa_admin" },
        SECRET_KEY,
        { expiresIn: "24h" }
      );
      return res.json({ token, username: "spaadmin", role: "spa_admin", name: "Grand Spa Manager" });
    }

    try {
      const admin = await prisma.admin.findUnique({
        where: { username: cleanUsername }
      });

      if (!admin || (admin.role !== "spa_admin" && admin.role !== "superadmin")) {
        return res.status(401).json({ error: "Invalid Spa Admin credentials" });
      }

      const validPassword = await bcrypt.compare(password, admin.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid Spa Admin credentials" });
      }

      const token = jwt.sign(
        { id: admin.id, username: admin.username, role: admin.role },
        SECRET_KEY,
        { expiresIn: "24h" }
      );

      res.json({ token, username: admin.username, role: admin.role, name: "Grand Spa Manager" });
    } catch (error) {
      console.error("Spa login error:", error);
      res.status(500).json({ error: "Authentication service error" });
    }
  });

  // Spa Admin: Change Password
  app.put("/spa/auth/change-password", authenticateSpaAdmin, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

    try {
      const username = req.user.username;
      const admin = await prisma.admin.findUnique({ where: { username } });

      if (admin) {
        if (oldPassword) {
          const match = await bcrypt.compare(oldPassword, admin.password);
          if (!match && oldPassword !== (process.env.SPA_ADMIN_PASSWORD || "GrandLynksSpa2025!")) {
            return res.status(400).json({ error: "Current password is incorrect." });
          }
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.admin.update({
          where: { username },
          data: { password: hashedPassword }
        });
      } else {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.admin.create({
          data: {
            username: "spaadmin",
            password: hashedPassword,
            role: "spa_admin"
          }
        });
      }

      res.json({ message: "Spa Admin password updated successfully." });
    } catch (error) {
      console.error("Error updating spa password:", error);
      res.status(500).json({ error: "Failed to update password." });
    }
  });

  // ---------------------------------------------------------------------------
  // SPA SERVICES (CATALOG - NO PICTURES)
  // ---------------------------------------------------------------------------

  // Public: Get all available spa services in official menu order
  app.get("/spa/services", async (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    try {
      const services = await prisma.spaService.findMany({
        where: {
          deletedAt: null,
          available: true
        },
        orderBy: { id: "asc" }
      });
      res.json(services);
    } catch (error) {
      console.error("Error fetching spa services:", error);
      res.status(500).json({ error: "Failed to load spa services" });
    }
  });

  // Spa Admin: Get all spa services (including inactive)
  app.get("/spa/admin/services", authenticateSpaAdmin, async (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    try {
      const services = await prisma.spaService.findMany({
        where: { deletedAt: null },
        orderBy: { id: "asc" }
      });
      res.json(services);
    } catch (error) {
      console.error("Error fetching admin spa services:", error);
      res.status(500).json({ error: "Failed to load spa services" });
    }
  });

  // Spa Admin: Create new spa service (NO PICTURES)
  app.post("/spa/services", authenticateSpaAdmin, async (req, res) => {
    const { name, category, duration, price, description, targetFocus, available } = req.body;
    if (!name || price === undefined || price === null) {
      return res.status(400).json({ error: "Service name and price are required." });
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: "Price must be a valid non-negative number." });
    }

    try {
      const service = await prisma.spaService.create({
        data: {
          name: name.trim(),
          category: category ? category.trim() : "Facials",
          duration: duration ? duration.trim() : "",
          price: numPrice,
          description: description ? description.trim() : null,
          targetFocus: targetFocus ? targetFocus.trim() : null,
          available: available !== undefined ? Boolean(available) : true
        }
      });
      res.status(201).json({ message: "Spa service created successfully", service });
    } catch (error) {
      console.error("Error creating spa service:", error);
      res.status(500).json({ error: "Failed to create spa service." });
    }
  });

  // Spa Admin: Update spa service details, price, duration, availability (NO PICTURES)
  app.put("/spa/services/:id", authenticateSpaAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid service ID" });

    const { name, category, duration, price, description, targetFocus, available } = req.body;

    try {
      const existing = await prisma.spaService.findUnique({ where: { id } });
      if (!existing || existing.deletedAt) {
        return res.status(404).json({ error: "Spa service not found." });
      }

      const data = {};
      if (name !== undefined) data.name = name.trim();
      if (category !== undefined) data.category = category.trim();
      if (duration !== undefined) data.duration = duration ? duration.trim() : "";
      if (price !== undefined) {
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice < 0) return res.status(400).json({ error: "Invalid price" });
        data.price = numPrice;
      }
      if (description !== undefined) data.description = description ? description.trim() : null;
      if (targetFocus !== undefined) data.targetFocus = targetFocus ? targetFocus.trim() : null;
      if (available !== undefined) data.available = Boolean(available);

      const updated = await prisma.spaService.update({
        where: { id },
        data
      });

      res.json({ message: "Spa service updated successfully", service: updated });
    } catch (error) {
      console.error("Error updating spa service:", error);
      res.status(500).json({ error: "Failed to update spa service." });
    }
  });

  // Spa Admin: Delete spa service
  app.delete("/spa/services/:id", authenticateSpaAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid service ID" });

    try {
      await prisma.spaService.update({
        where: { id },
        data: { deletedAt: new Date(), available: false }
      });
      res.json({ message: "Spa service removed from menu." });
    } catch (error) {
      console.error("Error deleting spa service:", error);
      res.status(500).json({ error: "Failed to delete spa service." });
    }
  });

  // ---------------------------------------------------------------------------
  // SPA APPOINTMENTS & BOOKINGS
  // ---------------------------------------------------------------------------

  // Public: Guest books a spa service
  app.post("/spa/bookings", async (req, res) => {
    const {
      serviceId,
      serviceName,
      guestName,
      phone,
      email,
      roomNumber,
      appointmentDate,
      timeSlot,
      numberOfGuests,
      specialRequests
    } = req.body;

    if (!guestName || !phone || !appointmentDate || !timeSlot) {
      return res.status(400).json({
        error: "Guest name, phone number, appointment date, and time slot are required."
      });
    }

    try {
      let resolvedService = null;
      if (serviceId) {
        resolvedService = await prisma.spaService.findUnique({
          where: { id: parseInt(serviceId) }
        });
      }
      if (!resolvedService && serviceName) {
        resolvedService = await prisma.spaService.findFirst({
          where: {
            name: { equals: serviceName.trim(), mode: "insensitive" },
            deletedAt: null
          }
        });
      }

      const numGuests = numberOfGuests ? Math.max(1, parseInt(numberOfGuests)) : 1;
      const basePrice = resolvedService ? resolvedService.price : (req.body.price ? parseFloat(req.body.price) : 25000);
      const totalPrice = basePrice * numGuests;

      let finalServiceName = serviceName ? serviceName.trim() : "Grand Spa Treatment";
      if (resolvedService) {
        finalServiceName = resolvedService.category && resolvedService.category.startsWith("Waxing")
          ? `${resolvedService.name} — ${resolvedService.category}`
          : resolvedService.name;
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingRef = `SPA-${randomSuffix}`;

      const parsedDate = new Date(appointmentDate);

      const booking = await prisma.spaBooking.create({
        data: {
          bookingRef,
          serviceId: resolvedService ? resolvedService.id : null,
          serviceName: finalServiceName,
          price: totalPrice,
          guestName: guestName.trim(),
          phone: phone.trim(),
          email: email ? email.trim() : null,
          roomNumber: roomNumber ? roomNumber.trim() : null,
          appointmentDate: parsedDate,
          timeSlot: timeSlot.trim(),
          numberOfGuests: numGuests,
          specialRequests: specialRequests ? specialRequests.trim() : null,
          status: "confirmed",
          paymentStatus: roomNumber ? "charged-to-room" : "unpaid"
        }
      });

      // Await confirmation email before sending response so serverless doesn't exit early
      const emailResult = await sendSpaBookingReceivedEmail(resend, booking);

      res.status(201).json({
        message: "Your Grand Spa appointment has been booked and confirmed!",
        booking,
        emailSent: Boolean(emailResult?.sent)
      });
    } catch (error) {
      console.error("Error saving spa booking:", error);
      res.status(500).json({
        error: "Unable to process spa booking. Please contact Grand Lynks reception."
      });
    }
  });

  // Spa Admin: List bookings with filters
  app.get("/spa/bookings", authenticateSpaAdmin, async (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const { status, date, search } = req.query;

    try {
      const where = { deletedAt: null };

      if (status && status !== "all") {
        where.status = status;
      }

      if (date) {
        const targetDate = new Date(date);
        if (!isNaN(targetDate.getTime())) {
          const nextDay = new Date(targetDate);
          nextDay.setDate(nextDay.getDate() + 1);
          where.appointmentDate = {
            gte: targetDate,
            lt: nextDay
          };
        }
      }

      if (search) {
        const q = search.trim();
        where.OR = [
          { guestName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { bookingRef: { contains: q, mode: "insensitive" } },
          { roomNumber: { contains: q, mode: "insensitive" } },
          { serviceName: { contains: q, mode: "insensitive" } }
        ];
      }

      const bookings = await prisma.spaBooking.findMany({
        where,
        orderBy: [
          { appointmentDate: "desc" },
          { createdAt: "desc" }
        ],
        take: 300
      });

      res.json(bookings);
    } catch (error) {
      console.error("Error retrieving spa bookings:", error);
      res.status(500).json({ error: "Failed to retrieve spa bookings." });
    }
  });

  // Spa Admin: Update appointment status, payment, or notes (sends email on payment approval)
  app.put("/spa/bookings/:id/status", authenticateSpaAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid booking ID" });

    const { status, paymentStatus, paymentMethod, notes, sendPaymentEmail } = req.body;

    try {
      const existing = await prisma.spaBooking.findUnique({ where: { id } });
      if (!existing || existing.deletedAt) {
        return res.status(404).json({ error: "Appointment not found." });
      }

      const data = {};
      if (status) data.status = status;
      if (paymentStatus) data.paymentStatus = paymentStatus;
      if (paymentMethod !== undefined) data.paymentMethod = paymentMethod ? paymentMethod.trim() : null;
      if (notes !== undefined) data.notes = notes ? notes.trim() : null;

      const updated = await prisma.spaBooking.update({
        where: { id },
        data
      });

      const justApprovedPayment =
        (existing.paymentStatus !== "paid" && updated.paymentStatus === "paid") ||
        Boolean(sendPaymentEmail);

      let emailResult = { sent: false };
      if (justApprovedPayment && updated.email) {
        emailResult = await sendSpaPaymentApprovedEmail(resend, updated);
      }

      res.json({
        message: "Appointment updated successfully",
        booking: updated,
        emailSent: Boolean(emailResult?.sent)
      });
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Failed to update appointment status." });
    }
  });

  // Spa Admin: Record in-person or walk-in appointment
  app.post("/spa/admin/bookings", authenticateSpaAdmin, async (req, res) => {
    const {
      serviceId,
      serviceName,
      guestName,
      phone,
      email,
      roomNumber,
      appointmentDate,
      timeSlot,
      numberOfGuests,
      price,
      paymentStatus,
      paymentMethod,
      notes
    } = req.body;

    if (!guestName || !phone || !appointmentDate || !timeSlot) {
      return res.status(400).json({
        error: "Guest name, phone number, appointment date, and time slot are required."
      });
    }

    try {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingRef = `SPA-WALK-${randomSuffix}`;

      const booking = await prisma.spaBooking.create({
        data: {
          bookingRef,
          serviceId: serviceId ? parseInt(serviceId) : null,
          serviceName: serviceName ? serviceName.trim() : "Grand Spa Treatment",
          price: price ? parseFloat(price) : 25000,
          guestName: guestName.trim(),
          phone: phone.trim(),
          email: email ? email.trim() : null,
          roomNumber: roomNumber ? roomNumber.trim() : null,
          appointmentDate: new Date(appointmentDate),
          timeSlot: timeSlot.trim(),
          numberOfGuests: numberOfGuests ? Math.max(1, parseInt(numberOfGuests)) : 1,
          status: "confirmed",
          paymentStatus: paymentStatus || "unpaid",
          paymentMethod: paymentMethod || null,
          notes: notes ? notes.trim() : null
        }
      });

      let emailResult = { sent: false };
      if (booking.email) {
        emailResult = booking.paymentStatus === "paid"
          ? await sendSpaPaymentApprovedEmail(resend, booking)
          : await sendSpaBookingReceivedEmail(resend, booking);
      }

      res.status(201).json({
        message: "Walk-in appointment recorded",
        booking,
        emailSent: Boolean(emailResult?.sent)
      });
    } catch (error) {
      console.error("Error creating walk-in appointment:", error);
      res.status(500).json({ error: "Failed to record walk-in appointment." });
    }
  });

  // Spa Admin: Soft-delete an appointment (walk-in or online)
  app.delete("/spa/bookings/:id", authenticateSpaAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid booking ID" });

    try {
      const existing = await prisma.spaBooking.findUnique({ where: { id } });
      if (!existing || existing.deletedAt) {
        return res.status(404).json({ error: "Appointment not found." });
      }

      await prisma.spaBooking.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      res.json({ message: "Appointment deleted successfully" });
    } catch (error) {
      console.error("Error deleting spa appointment:", error);
      res.status(500).json({ error: "Failed to delete appointment." });
    }
  });

  // ---------------------------------------------------------------------------
  // SPA FINANCES & REVENUE REPORTING
  // ---------------------------------------------------------------------------

  // Spa Admin: Dedicated Spa Finances & Metrics
  app.get("/spa/finances", authenticateSpaAdmin, async (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    try {
      const allBookings = await prisma.spaBooking.findMany({
        where: { deletedAt: null },
        orderBy: { appointmentDate: "desc" }
      });

      const todayStr = new Date().toISOString().slice(0, 10);
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const startOfMonth = new Date(currentYear, currentMonth, 1);

      let totalRevenue = 0;
      let todayRevenue = 0;
      let thisMonthRevenue = 0;
      let pendingRevenue = 0;
      let completedCount = 0;
      let confirmedCount = 0;
      let cancelledCount = 0;

      const byService = {};
      const byPaymentMethod = {
        cash: 0,
        pos: 0,
        transfer: 0,
        "charged-to-room": 0,
        unpaid: 0,
        other: 0
      };

      allBookings.forEach((b) => {
        const isPaid = b.paymentStatus === "paid" || b.paymentStatus === "charged-to-room" || b.status === "completed";
        const bDateStr = b.appointmentDate ? new Date(b.appointmentDate).toISOString().slice(0, 10) : "";

        if (b.status === "completed") completedCount++;
        else if (b.status === "confirmed") confirmedCount++;
        else if (b.status === "cancelled") cancelledCount++;

        if (b.status !== "cancelled") {
          if (isPaid) {
            totalRevenue += b.price;
            if (bDateStr === todayStr) {
              todayRevenue += b.price;
            }
            if (new Date(b.appointmentDate) >= startOfMonth) {
              thisMonthRevenue += b.price;
            }

            const methodKey = (b.paymentMethod || b.paymentStatus || "other").toLowerCase();
            if (byPaymentMethod[methodKey] !== undefined) {
              byPaymentMethod[methodKey] += b.price;
            } else {
              byPaymentMethod.other += b.price;
            }

            if (!byService[b.serviceName]) {
              byService[b.serviceName] = { count: 0, revenue: 0 };
            }
            byService[b.serviceName].count++;
            byService[b.serviceName].revenue += b.price;
          } else {
            pendingRevenue += b.price;
            byPaymentMethod.unpaid += b.price;
          }
        }
      });

      const popularServices = Object.entries(byService)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue);

      res.json({
        totalRevenue,
        todayRevenue,
        thisMonthRevenue,
        pendingRevenue,
        totalBookingsCount: allBookings.length,
        completedCount,
        confirmedCount,
        cancelledCount,
        byPaymentMethod,
        popularServices,
        recentBookings: allBookings.slice(0, 25)
      });
    } catch (error) {
      console.error("Error retrieving spa finances:", error);
      res.status(500).json({ error: "Failed to generate spa finances." });
    }
  });
};
