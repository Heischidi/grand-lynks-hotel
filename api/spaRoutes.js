// =============================================================================
// GRAND SPA & WELLNESS MODULE — Routes & Controllers
// =============================================================================

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

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

module.exports = function registerSpaRoutes(app, prisma, authenticateSpaAdmin, SECRET_KEY, loginLimiter) {
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
        // Create admin entry if it didn't exist in DB
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

      // Date parsing
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

      res.status(201).json({
        message: "Your Grand Spa appointment has been booked and confirmed!",
        booking
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

  // Spa Admin: Update appointment status, payment, or notes
  app.put("/spa/bookings/:id/status", authenticateSpaAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid booking ID" });

    const { status, paymentStatus, paymentMethod, notes } = req.body;

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

      res.json({ message: "Appointment updated successfully", booking: updated });
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

      res.status(201).json({ message: "Walk-in appointment recorded", booking });
    } catch (error) {
      console.error("Error creating walk-in appointment:", error);
      res.status(500).json({ error: "Failed to record walk-in appointment." });
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
