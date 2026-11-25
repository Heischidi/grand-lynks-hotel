// =============================================================================
// SERENITY SPA & WELLNESS MODULE — Routes & Controllers
// =============================================================================

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const DEFAULT_SPA_SERVICES = [
  {
    name: "Swedish Relaxation Massage",
    category: "Relaxation",
    duration: "60 mins",
    price: 25000,
    description: "Gentle, rhythmic gliding strokes with organic essential oils to release everyday tension, increase blood flow, and calm the central nervous system.",
    targetFocus: "Full Body & Stress Relief"
  },
  {
    name: "Deep Tissue Massage",
    category: "Therapeutic",
    duration: "60 mins",
    price: 35000,
    description: "Firm, targeted acupressure addressing the sub-layers of musculature and fascia to eliminate chronic muscle knots, neck stiffness, and lower back tightness.",
    targetFocus: "Neck, Back & Shoulder Knots"
  },
  {
    name: "Aromatherapy Deluxe Massage",
    category: "Aromatherapy",
    duration: "75 mins",
    price: 30000,
    description: "Curated bespoke botanical extracts paired with soothing fluid massage sequences to harmonize mind, body, and senses.",
    targetFocus: "Full Body, Mind & Senses"
  },
  {
    name: "Hot Stone Therapy Massage",
    category: "Specialty",
    duration: "90 mins",
    price: 40000,
    description: "Heated basalt river stones glide gracefully along key energetic meridian points, melting away deep-seated fatigue and muscular stiffness.",
    targetFocus: "Deep Muscle Warming & Circulation"
  },
  {
    name: "Couples Rejuvenation Massage",
    category: "Couples Experience",
    duration: "90 mins",
    price: 60000,
    description: "A dual sanctuary experience in our private couple's suite with complementary aromatherapy and personalized pressure for both guests.",
    targetFocus: "Shared Relaxation for Two"
  },
  {
    name: "Executive Express Neck & Shoulder Relief",
    category: "Express Relief",
    duration: "30 mins",
    price: 18000,
    description: "Targeted quick relief tailored for travel fatigue, computer neck strains, and busy schedules to restore physical vitality quickly.",
    targetFocus: "Upper Back, Neck & Shoulders"
  }
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
      console.log("✅ Seeded default spa massage treatments.");
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
      return res.json({ token, username: "spaadmin", role: "spa_admin", name: "Serenity Spa Manager" });
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

      res.json({ token, username: admin.username, role: admin.role, name: "Serenity Spa Manager" });
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

  // Public: Get all available massage services
  app.get("/spa/services", async (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    try {
      const services = await prisma.spaService.findMany({
        where: {
          deletedAt: null,
          available: true
        },
        orderBy: { price: "asc" }
      });
      res.json(services);
    } catch (error) {
      console.error("Error fetching spa services:", error);
      res.status(500).json({ error: "Failed to load spa services" });
    }
  });

  // Spa Admin: Get all massage services (including inactive)
  app.get("/spa/admin/services", authenticateSpaAdmin, async (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    try {
      const services = await prisma.spaService.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" }
      });
      res.json(services);
    } catch (error) {
      console.error("Error fetching admin spa services:", error);
      res.status(500).json({ error: "Failed to load spa services" });
    }
  });

  // Spa Admin: Create new massage treatment (NO PICTURES)
  app.post("/spa/services", authenticateSpaAdmin, async (req, res) => {
    const { name, category, duration, price, description, targetFocus, available } = req.body;
    if (!name || price === undefined || price === null) {
      return res.status(400).json({ error: "Massage name and price are required." });
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: "Price must be a valid non-negative number." });
    }

    try {
      const service = await prisma.spaService.create({
        data: {
          name: name.trim(),
          category: category ? category.trim() : "Massage",
          duration: duration ? duration.trim() : "60 mins",
          price: numPrice,
          description: description ? description.trim() : null,
          targetFocus: targetFocus ? targetFocus.trim() : null,
          available: available !== undefined ? Boolean(available) : true
        }
      });
      res.status(201).json({ message: "Massage treatment created successfully", service });
    } catch (error) {
      console.error("Error creating spa service:", error);
      res.status(500).json({ error: "Failed to create massage treatment." });
    }
  });

  // Spa Admin: Update massage treatment details, price, duration, availability (NO PICTURES)
  app.put("/spa/services/:id", authenticateSpaAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid service ID" });

    const { name, category, duration, price, description, targetFocus, available } = req.body;

    try {
      const existing = await prisma.spaService.findUnique({ where: { id } });
      if (!existing || existing.deletedAt) {
        return res.status(404).json({ error: "Massage treatment not found." });
      }

      const data = {};
      if (name !== undefined) data.name = name.trim();
      if (category !== undefined) data.category = category.trim();
      if (duration !== undefined) data.duration = duration.trim();
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

      res.json({ message: "Massage treatment updated successfully", service: updated });
    } catch (error) {
      console.error("Error updating spa service:", error);
      res.status(500).json({ error: "Failed to update massage treatment." });
    }
  });

  // Spa Admin: Delete massage treatment
  app.delete("/spa/services/:id", authenticateSpaAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid service ID" });

    try {
      await prisma.spaService.update({
        where: { id },
        data: { deletedAt: new Date(), available: false }
      });
      res.json({ message: "Massage treatment removed from catalog." });
    } catch (error) {
      console.error("Error deleting spa service:", error);
      res.status(500).json({ error: "Failed to delete massage treatment." });
    }
  });

  // ---------------------------------------------------------------------------
  // SPA APPOINTMENTS & BOOKINGS
  // ---------------------------------------------------------------------------

  // Public: Guest books a massage
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
      const finalServiceName = resolvedService ? resolvedService.name : (serviceName ? serviceName.trim() : "Signature Massage");

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
        message: "Your massage appointment has been booked and confirmed!",
        booking
      });
    } catch (error) {
      console.error("Error saving spa booking:", error);
      res.status(500).json({
        error: "Unable to process massage booking. Please contact Grand Lynks reception."
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
          serviceName: serviceName ? serviceName.trim() : "Custom Massage",
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
