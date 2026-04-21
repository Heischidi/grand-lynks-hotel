const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { prisma } = require("./database.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const path = require('path');
const allowedOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "https://grandlynkshomesandapartments.com",
  "https://www.grandlynkshomesandapartments.com",
  "http://grandlynkshomesandapartments.com",
  "http://www.grandlynkshomesandapartments.com",
  "https://grand-lynks-hotel.vercel.app"
];

// CORS Configuration specifically for API routes
const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // Return null, false instead of Error to avoid crashing or 500s
      return callback(null, false);
    }
    return callback(null, true);
  },
  credentials: true
};

// Apply CORS only to API routes
app.use("/api", cors(corsOptions));

app.use(bodyParser.json());

// Middleware to handle both local development (/api/route) and Vercel (/api -> /route)
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    req.url = req.url.replace('/api', '');
  }
  // Ensure we still have a leading slash
  if (!req.url.startsWith('/')) {
    req.url = '/' + req.url;
  }
  next();
});

const { Resend } = require("resend");

// Initialize Resend (Configure with RESEND_API_KEY in .env)
const resend = new Resend(process.env.RESEND_API_KEY || "re_your_api_key");

async function sendConfirmationEmail(booking, guest, room) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Grand Lynks Hotel <bookings@grandlynkshomesandapartments.com>',
      replyTo: 'reservations@grandlynkshomesandapartments.com',
      to: guest.email,
      subject: `Your Reservation at Grand Lynks Hotel - Ref #GL-${booking.id}`,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@grandlynkshomesandapartments.com>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Mailer': 'Grand Lynks Reservations System',
      },
      text: `Dear ${guest.name},\n\nThank you for choosing Grand Lynks Homes & Apartments. Your reservation request has been received.\n\nRoom: ${room.type}\nCheck-in: ${new Date(booking.startDate).toDateString()}\nCheck-out: ${new Date(booking.endDate).toDateString()}\nTotal Amount: NGN ${booking.totalAmount?.toLocaleString()}\n\nTo confirm your reservation, please transfer the total amount to:\nBank: Moniepoint\nAccount Name: Grand Lynks Homes and Apartments\nAccount Number: 5015151292\n\nPlease use your name as the transfer description.\n\nNeed help? Call us at +234 814 223 4691\n80 Pa Michael Imoudu Ave, Gwarinpa, Abuja\n\nWarm regards,\nThe Grand Lynks Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #fcf8f8; padding: 20px; border-bottom: 3px solid #8b1d30;">
            <h2 style="color: #8b1d30; margin: 0;">Booking Received</h2>
            <p style="margin: 5px 0 0; color: #666;">Status: Pending Payment</p>
          </div>
          
          <div style="padding: 30px;">
            <p>Dear ${guest.name},</p>
            <p>Thank you for choosing Grand Lynks Homes & Apartments. Your reservation request has been received.</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Reservation Details</h3>
              <p><strong>Room:</strong> ${room.type}</p>
              <p><strong>Check-in:</strong> ${new Date(booking.startDate).toDateString()}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.endDate).toDateString()}</p>
              <p><strong>Total Amount:</strong> ₦${booking.totalAmount.toLocaleString()}</p>
            </div>

            <div style="border: 2px solid #8b1d30; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #8b1d30; margin-top: 0;">Payment Instructions</h3>
              <p>To confirm your reservation, please transfer the total amount to the account below:</p>
              <div style="background: #fdfdfd; padding: 15px; border-radius: 5px;">
                <p style="margin: 5px 0;"><strong>Bank Name:</strong> Moniepoint</p>
                <p style="margin: 5px 0;"><strong>Account Name:</strong> Grand lynks Homes and Apartments</p>
                <p style="margin: 5px 0;"><strong>Account Number:</strong> 5015151292</p>
              </div>
              <p style="margin-top: 15px; font-size: 0.9em; color: #555;"><em>Please use your name as the transfer description. Once payment is verified, you will receive a final confirmation email.</em></p>
            </div>

            <p>Need help? Contact us at +234 814 223 4691.</p>
            <p style="margin: 0;">80 Pa Michael Imoudu Ave, Gwarinpa, Abuja</p>
            <p>Warm regards,<br>The Grand Lynks Team</p>
            <p style="margin-top: 30px; font-size: 0.8em; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
              Don't see our emails? Please check your <strong>Spam folder</strong> and mark them as "Not Spam."
            </p>
          </div>
        </div>
      `
    });

    if (error) {
       console.error("Resend delivery failed for guest email:", error);
       // Check if it's the 403 error which indicates unverified domain
       if (error.name === 'forbidden' || error.statusCode === 403) {
          console.warn("CRITICAL: Emails to guests are blocked because your domain is not verified in Resend.");
       }
    } else {
       console.log("Initial confirmation email successfully processed via Resend ID:", data.id);
    }
  } catch (error) {
    console.error("Unexpected error in sendConfirmationEmail:", error);
  }
}

async function sendBookingFinalizedEmail(booking, guest, room) {
  console.log(`Attempting to send finalized email to ${guest?.email} for booking #${booking?.id}`);
  try {
    if (!guest?.email) {
      console.error("Cannot send finalized email: Guest email is missing");
      return;
    }

    const { data, error } = await resend.emails.send({
      from: 'Grand Lynks Hotel <bookings@grandlynkshomesandapartments.com>',
      replyTo: 'reservations@grandlynkshomesandapartments.com',
      to: guest.email,
      subject: `Your Stay at Grand Lynks Hotel is Confirmed - Ref #GL-${booking.id}`,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@grandlynkshomesandapartments.com>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Mailer': 'Grand Lynks Reservations System',
      },
      text: `Dear ${guest.name},\n\nGreat news! We have received your payment and your booking at Grand Lynks Homes & Apartments is now officially confirmed.\n\nBooking Ref: #GL-${booking.id}\nRoom: ${room.type}\nCheck-in: ${new Date(booking.startDate).toDateString()}\nCheck-out: ${new Date(booking.endDate).toDateString()}\n\nPlease present a valid ID at reception upon arrival. Check-in is from 2:00 PM.\n\nWe look forward to welcoming you soon!\n\nKind regards,\nThe Grand Lynks Team\nhttps://grandlynkshomesandapartments.com`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #8b1d30; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Payment Confirmed</h1>
          </div>
          
          <div style="padding: 30px; color: #333;">
            <h2 style="color: #8b1d30; margin-top: 0;">Your Stay is Finalized!</h2>
            <p>Dear ${guest.name},</p>
            <p>We are delighted to inform you that we have successfully received your payment. Your booking at <strong>Grand Lynks Homes & Apartments</strong> is now officially confirmed.</p>
            
            <div style="background-color: #fcf8f8; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px dashed #8b1d30;">
              <h3 style="margin-top: 0; color: #8b1d30;">Confirmed Reservation Details</h3>
              <p><strong>Booking Ref:</strong> #GL-${booking.id}</p>
              <p><strong>Room Type:</strong> ${room.type}</p>
              <p><strong>Check-in:</strong> ${new Date(booking.startDate).toDateString()}</p>
              <p><strong>Check-out:</strong> ${new Date(booking.endDate).toDateString()}</p>
            </div>

            <p>Please present a valid ID at the reception upon arrival. You can check in from 2:00 PM onwards.</p>
            
            <p style="margin-top: 20px; font-weight: 500;">We look forward to seeing you soon!</p>

            <div style="text-align: center; margin-top: 30px;">
              <a href="https://grandlynkshomesandapartments.com" style="background-color: #8b1d30; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Visit Our Website</a>
            </div>
            <p style="margin-top: 40px; font-size: 0.8em; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
              Don't see our emails? Please check your <strong>Spam folder</strong> and mark them as "Not Spam."
            </p>
          </div>
        </div>
      `
    });

    if (error) {
       console.error("Resend delivery failed for finalized email:", error);
    } else {
       console.log("Finalized email successfully processed via Resend ID:", data.id);
    }
  } catch (error) {
    console.error("Unexpected error in sendBookingFinalizedEmail:", error);
  }
}

async function sendAdminNotificationEmail({ type, details }) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "grandlynkshomesandapartments@gmail.com";
  const subjectMap = {
    booking: "🛎️ New Pending Booking - Action Required",
    order: "🍽️ New Food Order Received",
    review: "⭐ New Review Pending Approval"
  };

  try {
    const { data, error } = await resend.emails.send({
      from: 'Grand Lynks System <noreply@grandlynkshomesandapartments.com>',
      to: ADMIN_EMAIL,
      subject: subjectMap[type] || "New Hotel Notification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden">
          <div style="background:#8b1d30; padding:20px; color:#fff;">
            <h2 style="margin:0;">${subjectMap[type] || "System Alert"}</h2>
          </div>
          <div style="padding:24px;">
            <p style="font-size:1rem; color:#333; line-height: 1.6;">${details}</p>
            <div style="margin-top: 25px; text-align: center;">
               <a href="https://grandlynkshomesandapartments.com/admin.html" style="background: #1a1a2e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Login to Admin Dashboard</a>
            </div>
          </div>
        </div>
      `
    });

    if (error) {
       console.error("Resend delivery failed for admin alert:", error);
    } else {
       console.log("Admin alert successfully processed via Resend ID:", data.id);
    }
  } catch (error) {
    console.error("Unexpected error in sendAdminNotificationEmail:", error);
  }
}

const SECRET_KEY = process.env.JWT_SECRET || "your_super_secret_key_change_in_production";

const multer = require("multer");
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function uploadToSupabase(file) {
  if (!supabase) throw new Error("Supabase credentials are not configured.");
  
  const fileName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const { data, error } = await supabase.storage
    .from('grand-lynks-images')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
    
  if (error) throw error;
  
  const { data: publicUrlData } = supabase.storage
    .from('grand-lynks-images')
    .getPublicUrl(fileName);
    
  return publicUrlData.publicUrl;
}

// Configure Multer for in-memory image uploads (Serverless friendly)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUTHENTICATION ---
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    res.json({ token, username: admin.username, role: admin.role });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Validation middleware
const validateRoom = (req, res, next) => {
  const { number, type, pricePerNight } = req.body;
  if (!number || !type || !pricePerNight) {
    return res
      .status(400)
      .json({ error: "Missing required fields: number, type, pricePerNight" });
  }
  if (typeof pricePerNight !== "number" || pricePerNight <= 0) {
    return res
      .status(400)
      .json({ error: "pricePerNight must be a positive number" });
  }
  next();
};

const validateGuest = (req, res, next) => {
  const { name, phone, email } = req.body;
  if (!name || !phone || !email) {
    return res
      .status(400)
      .json({ error: "Missing required fields: name, phone, email" });
  }
  if (!email.includes("@")) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  next();
};

const validateBooking = (req, res, next) => {
  const { guestId, roomId, startDate, endDate } = req.body;
  if (!guestId || !roomId || !startDate || !endDate) {
    return res.status(400).json({
      error: "Missing required fields: guestId, roomId, startDate, endDate",
    });
  }
  if (new Date(startDate) >= new Date(endDate)) {
    return res.status(400).json({ error: "End date must be after start date" });
  }
  next();
};

const validateOrder = (req, res, next) => {
  const { guestId, roomId, items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: "Order must contain at least one item" });
  }
  if (!guestId && !roomId) {
    return res
      .status(400)
      .json({ error: "Order must be linked to either a guest or room" });
  }
  next();
};

// --- ROOMS ---
app.get("/rooms", async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        bookings: {
          where: {
            status: { in: ["confirmed", "checked-in"] },
          },
        },
      },
    });

    // Add availability status based on bookings
    const roomsWithAvailability = rooms.map((room) => ({
      ...room,
      available: room.bookings.length === 0 || room.status === "available",
    }));

    res.json(roomsWithAvailability);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

app.post("/rooms", authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file ? await uploadToSupabase(req.file) : null;
    const { number, type, pricePerNight, description } = req.body;

    // Validate manually since Multer parses body
    if (!number || !type || !pricePerNight) {
      return res.status(400).json({ error: "Missing required fields: number, type, pricePerNight" });
    }

    const roomData = {
      number: parseInt(number),
      type,
      pricePerNight: parseFloat(pricePerNight),
      description,
      status: "available"
    };

    if (imagePath) {
      // Store as JSON string array as per schema comment, or just flat string if cleaner?
      // Schema says: images String? // JSON string of image paths
      // Let's stick to the schema convention.
      roomData.images = JSON.stringify([imagePath]);
    }

    const room = await prisma.room.create({
      data: roomData,
    });
    res.json({ message: "Room added", room });
  } catch (error) {
    console.error("Error creating room:", error);
    if (error.code === "P2002") {
      res.status(400).json({ error: "Room number already exists" });
    } else {
      res.status(500).json({ error: "Failed to create room" });
    }
  }
});

app.put("/rooms/:id", authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log("PUT /rooms/:id called");
    console.log("Headers CT:", req.headers['content-type']);
    console.log("Body:", req.body);
    console.log("File:", req.file);

    const imagePath = req.file ? await uploadToSupabase(req.file) : null;
    const { number, type, pricePerNight, description, status } = req.body;

    const updateData = {};

    // Improved validation and parsing
    if (number) {
      const parsedNumber = parseInt(number);
      if (isNaN(parsedNumber)) {
        return res.status(400).json({ error: "Invalid room number" });
      }
      updateData.number = parsedNumber;
    }

    if (type) updateData.type = type;

    if (pricePerNight) {
      const parsedPrice = parseFloat(pricePerNight);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: "Invalid price per night" });
      }
      updateData.pricePerNight = parsedPrice;
    }

    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;

    if (imagePath) {
      updateData.images = JSON.stringify([imagePath]);
    }

    const room = await prisma.room.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });

    res.json({ message: "Room updated", room });
  } catch (error) {
    console.error("Error updating room (FULL):", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Room not found" });
    } else if (error.code === "P2002") {
      // Handle unique constraint violation (e.g., room number already exists)
      const target = error.meta?.target;
      if (target && target.includes('number')) {
        res.status(409).json({ error: "Room number already exists" });
      } else {
        res.status(409).json({ error: "Unique constraint violation" });
      }
    } else {
      res.status(500).json({ error: "Failed to update room: " + error.message });
    }
  }
});

app.delete("/rooms/:id", authenticateToken, async (req, res) => {
  try {
    await prisma.room.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Room deleted" });
  } catch (error) {
    console.error("Error deleting room:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Room not found" });
    } else {
      res.status(500).json({ error: "Failed to delete room" });
    }
  }
});

// --- GUESTS ---
app.get("/guests", authenticateToken, async (req, res) => {
  try {
    const guests = await prisma.guest.findMany({
      include: {
        bookings: true,
        orders: true,
        payments: true,
      },
    });
    res.json(guests);
  } catch (error) {
    console.error("Error fetching guests:", error);
    res.status(500).json({ error: "Failed to fetch guests" });
  }
});

// Full guest history with room, order items, and payments
app.get("/guests/:id", authenticateToken, async (req, res) => {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        bookings: {
          include: {
            room: true,
            payments: true,
          },
          orderBy: { createdAt: "desc" },
        },
        orders: {
          include: {
            orderItems: {
              include: { menuItem: true },
            },
            room: true,
            payments: true,
          },
          orderBy: { createdAt: "desc" },
        },
        payments: true,
      },
    });

    if (!guest) {
      return res.status(404).json({ error: "Guest not found" });
    }

    res.json(guest);
  } catch (error) {
    console.error("Error fetching guest history:", error);
    res.status(500).json({ error: "Failed to fetch guest history" });
  }
});

app.post("/guests", validateGuest, async (req, res) => {
  try {
    const { name, phone, email, idNumber, address } = req.body;

    // Check if blacklisted first
    const existingGuest = await prisma.guest.findUnique({ where: { email } });
    if (existingGuest && existingGuest.isBlacklisted) {
      return res.status(403).json({ error: "Booking rejected. This guest has been blacklisted." });
    }

    // Upsert by email — if guest exists, update their info and return them.
    // If they're new, create a fresh record.
    const guest = await prisma.guest.upsert({
      where: { email },
      update: {
        // Keep the record fresh: update name/phone in case they changed
        name,
        phone,
        ...(idNumber !== undefined && { idNumber }),
        ...(address   !== undefined && { address }),
      },
      create: {
        name,
        phone,
        email,
        ...(idNumber !== undefined && { idNumber }),
        ...(address  !== undefined && { address }),
      },
    });

    const isNew = new Date() - new Date(guest.createdAt) < 5000; // rough check
    res.json({ message: isNew ? "Guest created" : "Guest record found and updated", guest });
  } catch (error) {
    console.error("Error creating/upserting guest:", error);
    res.status(500).json({ error: "Failed to create guest" });
  }
});

app.put("/guests/:id", authenticateToken, validateGuest, async (req, res) => {
  try {
    const guest = await prisma.guest.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json({ message: "Guest updated", guest });
  } catch (error) {
    console.error("Error updating guest:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Guest not found" });
    } else {
      res.status(500).json({ error: "Failed to update guest" });
    }
  }
});

app.patch("/guests/:id/blacklist", authenticateToken, async (req, res) => {
  try {
    const { isBlacklisted } = req.body;
    const guest = await prisma.guest.update({
      where: { id: parseInt(req.params.id) },
      data: { isBlacklisted },
    });
    res.json({ message: `Guest ${isBlacklisted ? 'blacklisted' : 'removed from blacklist'}`, guest });
  } catch (error) {
    console.error("Error toggling blacklist:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Guest not found" });
    } else {
      res.status(500).json({ error: "Failed to update blacklist status" });
    }
  }
});

app.delete("/guests/:id", authenticateToken, async (req, res) => {
  try {
    await prisma.guest.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Guest deleted" });
  } catch (error) {
    console.error("Error deleting guest:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Guest not found" });
    } else {
      res.status(500).json({ error: "Failed to delete guest" });
    }
  }
});

// --- PAYMENTS ---
app.get("/payments", authenticateToken, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        guest: true,
        booking: true,
        order: true,
      },
    });
    res.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

app.post("/payments", async (req, res) => {
  try {
    const { amount, method, reference, status, guestId, bookingId, orderId } =
      req.body;

    if (!amount || !method || !guestId) {
      return res
        .status(400)
        .json({ error: "Missing required fields: amount, method, guestId" });
    }

    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        method,
        reference,
        status: status || "pending",
        guestId: parseInt(guestId),
        bookingId: bookingId ? parseInt(bookingId) : null,
        orderId: orderId ? parseInt(orderId) : null,
      },
    });
    res.json({ message: "Payment recorded", payment });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

app.put("/payments/:id", authenticateToken, async (req, res) => {
  try {
    const payment = await prisma.payment.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json({ message: "Payment updated", payment });
  } catch (error) {
    console.error("Error updating payment:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Payment not found" });
    } else {
      res.status(500).json({ error: "Failed to update payment" });
    }
  }
});

app.delete("/payments/:id", authenticateToken, async (req, res) => {
  try {
    await prisma.payment.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Payment deleted" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Payment not found" });
    } else {
      res.status(500).json({ error: "Failed to delete payment" });
    }
  }
});

// Initialize in-memory arrays for non-database data
let users = [
  {
    id: 1,
    email: "admin@grandlynks.com",
    role: "Administrator",
    lastLogin: new Date().toISOString(),
    status: "active",
  },
  {
    id: 2,
    email: "reception@grandlynks.com",
    role: "Receptionist",
    lastLogin: new Date().toISOString(),
    status: "active",
  },
];

// --- USERS (Security) ---
app.get("/users", authenticateToken, (req, res) => res.json(users));
app.post("/users", authenticateToken, (req, res) => {
  const user = { id: Date.now(), ...req.body };
  users.push(user);
  res.json({ message: "User added", user });
});
app.put("/users/:id", authenticateToken, (req, res) => {
  const idx = users.findIndex((u) => u.id == req.params.id);
  if (idx > -1) {
    users[idx] = { ...users[idx], ...req.body };
    res.json({ message: "User updated", user: users[idx] });
  } else res.status(404).json({ message: "User not found" });
});
app.delete("/users/:id", authenticateToken, (req, res) => {
  users = users.filter((u) => u.id != req.params.id);
  res.json({ message: "User deleted" });
});

// --- BOOKINGS ---
app.get("/bookings", authenticateToken, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        guest: true,
        room: true,
        payments: true,
      },
    });
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

app.post("/bookings", validateBooking, async (req, res) => {
  try {
    const { guestId, roomId, startDate, endDate, status } = req.body;

    // Check for overlapping bookings
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        roomId: parseInt(roomId),
        status: { in: ["confirmed", "checked-in"] },
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(startDate) } },
              { endDate: { gt: new Date(startDate) } },
            ],
          },
          {
            AND: [
              { startDate: { lt: new Date(endDate) } },
              { endDate: { gte: new Date(endDate) } },
            ],
          },
          {
            AND: [
              { startDate: { gte: new Date(startDate) } },
              { endDate: { lte: new Date(endDate) } },
            ],
          },
        ],
      },
    });

    if (overlappingBookings.length > 0) {
      return res.status(400).json({
        error:
          "Room is not available for the selected dates due to overlapping bookings",
      });
    }

    // Calculate total amount based on room price and duration
    const room = await prisma.room.findUnique({
      where: { id: parseInt(roomId) },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalAmount = room.pricePerNight * nights;

    const booking = await prisma.booking.create({
      data: {
        guestId: parseInt(guestId),
        roomId: parseInt(roomId),
        startDate: start,
        endDate: end,
        status: status || "pending",
        totalAmount,
      },
      include: {
        guest: true,
        room: true,
      },
    });

    // Send confirmation email
    sendConfirmationEmail(booking, booking.guest, booking.room);

    // Send Admin Notification
    sendAdminNotificationEmail({
      type: "booking",
      details: `New booking received from <strong>${booking.guest.name}</strong> for room <strong>${booking.room.number}</strong> (${booking.room.type}). <br>Total Amount: ₦${booking.totalAmount.toLocaleString()} <br>Check-in: ${new Date(booking.startDate).toDateString()}`
    });

    res.json({ message: "Booking created successfully", booking });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

app.put("/bookings/:id", authenticateToken, validateBooking, async (req, res) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: {
        guest: true,
        room: true,
      },
    });
    res.json({ message: "Booking updated", booking });
  } catch (error) {
    console.error("Error updating booking:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Booking not found" });
    } else {
      res.status(500).json({ error: "Failed to update booking" });
    }
  }
});

app.delete("/bookings/:id", authenticateToken, async (req, res) => {
  const bookingId = parseInt(req.params.id);
  try {
    // 1. Delete associated payments first
    await prisma.payment.deleteMany({
      where: { bookingId: bookingId }
    });

    // 2. Delete the booking
    await prisma.booking.delete({
      where: { id: bookingId },
    });
    
    res.json({ message: "Booking and associated payments deleted" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Booking not found" });
    } else {
      res.status(500).json({ error: "Failed to delete booking" });
    }
  }
});

app.delete("/orders/:id", authenticateToken, async (req, res) => {
  const orderId = parseInt(req.params.id);
  try {
    // 1. Delete associated order items
    await prisma.orderItem.deleteMany({
      where: { orderId: orderId }
    });

    // 2. Delete associated payments
    await prisma.payment.deleteMany({
      where: { orderId: orderId }
    });

    // 3. Delete the order itself
    await prisma.order.delete({
      where: { id: orderId }
    });

    res.json({ message: "Order and associated items/payments deleted" });
  } catch (error) {
    console.error("Error deleting order:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Order not found" });
    } else {
      res.status(500).json({ error: "Failed to delete order" });
    }
  }
});

// General update endpoint for bookings
app.put("/bookings/:id", authenticateToken, async (req, res) => {
  const bookingId = parseInt(req.params.id);
  const { startDate, endDate, status, roomId, totalAmount } = req.body;
  
  try {
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        roomId,
        totalAmount: totalAmount ? parseFloat(totalAmount) : undefined
      },
      include: { guest: true, room: true }
    });
    res.json({ message: "Booking updated", booking: updated });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// General update endpoint for orders (already exists in some form but ensuring it handles totalAmount)
app.put("/orders/:id", authenticateToken, async (req, res) => {
  const orderId = parseInt(req.params.id);
  const { status, totalAmount, notes } = req.body;
  
  try {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
        notes
      },
      include: { orderItems: { include: { menuItem: true } }, guest: true }
    });
    res.json({ message: "Order updated", order: updated });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// --- BOOKING CONFIRMATION & CANCELLATION ---
app.put("/bookings/:id/confirm", authenticateToken, async (req, res) => {
  const bookingId = parseInt(req.params.id);
  console.log(`Admin requested confirmation for booking #${bookingId}`);
  
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true, room: true }
    });
 
    if (!booking) {
      console.warn(`Confirmation failed: Booking #${bookingId} not found`);
      return res.status(404).json({ error: "Booking not found" });
    }
 
    console.log(`Found booking for ${booking.guest?.name}. Updating status to confirmed...`);
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "confirmed" },
      include: { guest: true, room: true }
    });
 
    // Send the finalized email
    console.log("Triggering sendBookingFinalizedEmail...");
    await sendBookingFinalizedEmail(updatedBooking, updatedBooking.guest, updatedBooking.room);
 
    res.json({ message: "Booking confirmed and email sent", booking: updatedBooking });
  } catch (error) {
    console.error(`Error confirming booking #${bookingId}:`, error);
    res.status(500).json({ error: "Failed to confirm booking" });
  }
});

app.put("/bookings/:id/cancel", authenticateToken, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled" }
    });
    res.json({ message: "Booking cancelled", booking: updatedBooking });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});
// --- CHECK AVAILABILITY ---
app.post("/check-availability", async (req, res) => {
  try {
    const { checkIn, checkOut } = req.body;

    if (!checkIn || !checkOut) {
      return res
        .status(400)
        .json({ error: "Check-in and check-out dates required" });
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    // 1. Find all rooms
    const allRooms = await prisma.room.findMany();

    // 2. Find bookings that overlap with requested range
    const overlapping = await prisma.booking.findMany({
      where: {
        status: { in: ["confirmed", "checked-in"] },
        OR: [
          {
            AND: [{ startDate: { lte: end } }, { endDate: { gte: start } }],
          },
        ],
      },
      include: { room: true },
    });

    // 3. Get IDs of unavailable rooms
    const unavailableRoomIds = overlapping.map((b) => b.roomId);

    // 4. Filter available rooms
    const availableRooms = allRooms.filter(
      (r) => !unavailableRoomIds.includes(r.id)
    );

    res.json(availableRooms);
  } catch (error) {
    console.error("Error checking availability:", error);
    res.status(500).json({ error: "Failed to check availability" });
  }
});



// --- MENU ---
app.get("/menu", async (req, res) => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      where: { available: true },
    });
    res.json(menuItems);
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

app.post("/menu", upload.single('image'), async (req, res) => {
  try {
    // If file uploaded, use Supabase. Otherwise check body (for URL or fallback)
    const imagePath = req.file ? await uploadToSupabase(req.file) : req.body.image;

    const { name, category, price, description, available } = req.body;

    if (!name || !category || !price) {
      return res
        .status(400)
        .json({ error: "Missing required fields: name, category, price" });
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        category,
        price: parseFloat(price),
        description,
        available: available !== undefined ? (available === 'true' || available === true) : true,
        image: imagePath,
      },
    });
    res.json({ message: "Menu item added", menuItem });
  } catch (error) {
    console.error("Error creating menu item:", error);
    res.status(500).json({ error: "Failed to create menu item" });
  }
});

app.put("/menu/:id", upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file ? await uploadToSupabase(req.file) : req.body.image;

    // Note: FormData sends params as strings, so we might need to parse bools/numbers if not handled automatically
    const { name, category, price, description, available } = req.body;

    const updateData = {
      name,
      category,
      price: price !== undefined ? parseFloat(price) : undefined,
      description,
      available: available !== undefined ? (available === 'true' || available === true) : undefined,
    };

    if (imagePath) {
      updateData.image = imagePath;
    }

    const menuItem = await prisma.menuItem.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });
    res.json({ message: "Menu item updated", menuItem });
  } catch (error) {
    console.error("Error updating menu item:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Menu item not found" });
    } else {
      res.status(500).json({ error: "Failed to update menu item" });
    }
  }
});

app.delete("/menu/:id", async (req, res) => {
  try {
    await prisma.menuItem.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Menu item deleted" });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Menu item not found" });
    } else {
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  }
});

// --- ORDERS ---
app.get("/orders", authenticateToken, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        guest: true,
        room: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.post("/orders", validateOrder, async (req, res) => {
  try {
    const { guestId, roomId, items } = req.body;

    // Validate menu items and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: parseInt(item.menuItemId) },
      });

      if (!menuItem) {
        return res
          .status(404)
          .json({ error: `Menu item with id ${item.menuItemId} not found` });
      }

      if (!menuItem.available) {
        return res
          .status(400)
          .json({ error: `Menu item ${menuItem.name} is not available` });
      }

      const itemTotal = menuItem.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        menuItemId: parseInt(item.menuItemId),
        quantity: parseInt(item.quantity),
        unitPrice: menuItem.price,
      });
    }

    // Create order with order items
    const order = await prisma.order.create({
      data: {
        guestId: guestId ? parseInt(guestId) : null,
        roomId: roomId ? parseInt(roomId) : null,
        status: "pending",
        totalAmount,
        orderItems: {
          create: orderItems,
        },
      },
      include: {
        guest: true,
        room: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    res.json({ message: "Order created successfully", order });

    // Send Admin Notification
    sendAdminNotificationEmail({
      type: "order",
      details: `New food order from room <strong>${order.room?.number || 'N/A'}</strong> / Guest <strong>${order.guest?.name || 'Unknown'}</strong>. <br>Total Amount: ₦${order.totalAmount.toLocaleString()}`
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.put("/orders/:id", async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: {
        guest: true,
        room: true,
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });
    res.json({ message: "Order updated", order });
  } catch (error) {
    console.error("Error updating order:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Order not found" });
    } else {
      res.status(500).json({ error: "Failed to update order" });
    }
  }
});

app.delete("/orders/:id", async (req, res) => {
  try {
    await prisma.order.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Order deleted" });
  } catch (error) {
    console.error("Error deleting order:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Order not found" });
    } else {
      res.status(500).json({ error: "Failed to delete order" });
    }
  }
});

// --- REPORTS (Dummy) ---
app.get("/reports", (req, res) => {
  res.json({
    occupancy: "82%",
    revenue: 22500,
    satisfaction: 4.8,
    repeatGuests: "35%",
  });
});

// --- Communication (Dummy) ---
app.post("/communication/email", (req, res) => {
  res.json({ message: "Bulk email sent!" });
});
app.post("/communication/sms", (req, res) => {
  res.json({ message: "SMS sent!" });
});
app.post("/communication/announcement", (req, res) => {
  res.json({ message: "Announcement posted!" });
});

// --- Housekeeping/Maintenance (Dummy) ---
app.post("/housekeeping/task", (req, res) => {
  res.json({ message: "Task assigned!" });
});
app.post("/maintenance/report", (req, res) => {
  res.json({ message: "Maintenance issue reported!" });
});

// --- CONTENT MANAGEMENT ---
app.get("/content", async (req, res) => {
  try {
    const { page, section } = req.query;
    let where = {};

    if (page) where.page = page;
    if (section) where.section = section;

    const content = await prisma.contentSection.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });

    res.json(content);
  } catch (error) {
    console.error("Error fetching content:", error);
    res.status(500).json({ error: "Failed to fetch content" });
  }
});

app.post("/content", async (req, res) => {
  try {
    const content = await prisma.contentSection.create({
      data: req.body,
    });
    res.json({ message: "Content created", content });
  } catch (error) {
    console.error("Error creating content:", error);
    res.status(500).json({ error: "Failed to create content" });
  }
});

app.put("/content/:id", async (req, res) => {
  try {
    const content = await prisma.contentSection.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json({ message: "Content updated", content });
  } catch (error) {
    console.error("Error updating content:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Content not found" });
    } else {
      res.status(500).json({ error: "Failed to update content" });
    }
  }
});

app.delete("/content/:id", async (req, res) => {
  try {
    await prisma.contentSection.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Content deleted" });
  } catch (error) {
    console.error("Error deleting content:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Content not found" });
    } else {
      res.status(500).json({ error: "Failed to delete content" });
    }
  }
});

// --- SITE SETTINGS ---
app.get("/settings", async (req, res) => {
  try {
    const { category } = req.query;
    let where = {};

    if (category) where.category = category;

    const settings = await prisma.siteSettings.findMany({
      where,
      orderBy: { category: "asc" },
    });

    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post("/settings", async (req, res) => {
  try {
    const setting = await prisma.siteSettings.create({
      data: req.body,
    });
    res.json({ message: "Setting created", setting });
  } catch (error) {
    console.error("Error creating setting:", error);
    res.status(500).json({ error: "Failed to create setting" });
  }
});

app.put("/settings/:key", async (req, res) => {
  try {
    const setting = await prisma.siteSettings.update({
      where: { key: req.params.key },
      data: req.body,
    });
    res.json({ message: "Setting updated", setting });
  } catch (error) {
    console.error("Error updating setting:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Setting not found" });
    } else {
      res.status(500).json({ error: "Failed to update setting" });
    }
  }
});

app.delete("/settings/:key", async (req, res) => {
  try {
    await prisma.siteSettings.delete({
      where: { key: req.params.key },
    });
    res.json({ message: "Setting deleted" });
  } catch (error) {
    console.error("Error deleting setting:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Setting not found" });
    } else {
      res.status(500).json({ error: "Failed to delete setting" });
    }
  }
});

// --- REVIEWS ---
// --- REVIEWS ---
app.get("/reviews", async (req, res) => {
  try {
    const { status, featured } = req.query;
    let where = {};

    if (status) where.status = status;
    else where.status = "approved"; // Default to approved only for public API

    if (featured !== undefined) where.featured = featured === "true";

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});


app.get("/admin/reviews", authenticateToken, async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching admin reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

app.post("/reviews", async (req, res) => {
  try {
    const review = await prisma.review.create({
      data: {
        ...req.body,
        status: "pending" // Force pending for new submissions
      },
    });
    res.json({ message: "Review submitted", review });

    // Send Admin Notification
    sendAdminNotificationEmail({
      type: "review",
      details: `New review submitted by <strong>${review.guestName}</strong>. <br>Rating: ${review.rating} Stars <br>Message: "${review.content}"`
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
});

app.put("/reviews/:id", authenticateToken, async (req, res) => {
  try {
    const review = await prisma.review.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json({ message: "Review updated", review });
  } catch (error) {
    console.error("Error updating review:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Review not found" });
    } else {
      res.status(500).json({ error: "Failed to update review" });
    }
  }
});

app.delete("/reviews/:id", authenticateToken, async (req, res) => {
  try {
    await prisma.review.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Review deleted" });
  } catch (error) {
    console.error("Error deleting review:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Review not found" });
    } else {
      res.status(500).json({ error: "Failed to delete review" });
    }
  }
});

// --- MAINTENANCE REQUESTS ---
app.get("/maintenance", async (req, res) => {
  try {
    const requests = await prisma.maintenanceRequest.findMany({
      include: { room: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests);
  } catch (error) {
    console.error("Error fetching maintenance requests:", error);
    res.status(500).json({ error: "Failed to fetch maintenance requests" });
  }
});

app.post("/maintenance", async (req, res) => {
  try {
    const request = await prisma.maintenanceRequest.create({
      data: {
        ...req.body,
        roomId: req.body.roomId ? parseInt(req.body.roomId) : null,
      },
      include: { room: true },
    });
    res.json({ message: "Maintenance request created", request });
  } catch (error) {
    console.error("Error creating maintenance request:", error);
    res.status(500).json({ error: "Failed to create maintenance request" });
  }
});

app.put("/maintenance/:id", async (req, res) => {
  try {
    const request = await prisma.maintenanceRequest.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: { room: true },
    });
    res.json({ message: "Maintenance request updated", request });
  } catch (error) {
    console.error("Error updating maintenance request:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Maintenance request not found" });
    } else {
      res.status(500).json({ error: "Failed to update maintenance request" });
    }
  }
});

// --- HOUSEKEEPING TASKS ---
app.get("/housekeeping", async (req, res) => {
  try {
    const tasks = await prisma.housekeepingTask.findMany({
      include: { room: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching housekeeping tasks:", error);
    res.status(500).json({ error: "Failed to fetch housekeeping tasks" });
  }
});

app.post("/housekeeping", async (req, res) => {
  try {
    const task = await prisma.housekeepingTask.create({
      data: {
        ...req.body,
        roomId: req.body.roomId ? parseInt(req.body.roomId) : null,
      },
      include: { room: true },
    });
    res.json({ message: "Housekeeping task created", task });
  } catch (error) {
    console.error("Error creating housekeeping task:", error);
    res.status(500).json({ error: "Failed to create housekeeping task" });
  }
});

app.put("/housekeeping/:id", async (req, res) => {
  try {
    const task = await prisma.housekeepingTask.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
      include: { room: true },
    });
    res.json({ message: "Housekeeping task updated", task });
  } catch (error) {
    console.error("Error updating housekeeping task:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Housekeeping task not found" });
    } else {
      res.status(500).json({ error: "Failed to update housekeeping task" });
    }
  }
});

// Update existing staff endpoints to use database
app.get("/staff", async (req, res) => {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: { name: "asc" },
    });
    res.json(staff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

app.post("/staff", async (req, res) => {
  try {
    const member = await prisma.staff.create({
      data: req.body,
    });
    res.json({ message: "Staff member added", member });
  } catch (error) {
    console.error("Error creating staff member:", error);
    res.status(500).json({ error: "Failed to create staff member" });
  }
});

app.put("/staff/:id", async (req, res) => {
  try {
    const member = await prisma.staff.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json({ message: "Staff member updated", member });
  } catch (error) {
    console.error("Error updating staff member:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Staff member not found" });
    } else {
      res.status(500).json({ error: "Failed to update staff member" });
    }
  }
});

app.delete("/staff/:id", async (req, res) => {
  try {
    await prisma.staff.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Staff member deleted" });
  } catch (error) {
    console.error("Error deleting staff member:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Staff member not found" });
    } else {
      res.status(500).json({ error: "Failed to delete staff member" });
    }
  }
});

// --- BOOKINGS ---
app.post("/bookings", async (req, res) => {
  try {
    const { guestId, roomId, startDate, endDate, status } = req.body;

    // Calculate total amount
    const room = await prisma.room.findUnique({ where: { id: parseInt(roomId) } });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const pricePerNight = room.pricePerNight || room.price || 0;
    const totalAmount = pricePerNight * nights;

    const booking = await prisma.booking.create({
      data: {
        guestId: parseInt(guestId),
        roomId: parseInt(roomId),
        startDate: startDate,
        endDate: endDate,
        status: status || "pending",
        totalAmount: totalAmount
      },
      include: { guest: true, room: true }
    });

    // Send email to guest
    if (booking.guest) {
      sendConfirmationEmail(booking, booking.guest, booking.room).catch(console.error);
    }

    // Notify admin
    const guestName = booking.guest?.name || "Guest";
    const guestEmail = booking.guest?.email || "N/A";
    const guestPhone = booking.guest?.phone || "N/A";
    const roomType = booking.room?.type || "N/A";
    const checkIn = new Date(startDate).toDateString();
    const checkOut = new Date(endDate).toDateString();
    sendAdminNotificationEmail({
      type: "booking",
      details: `
        <strong>Guest:</strong> ${guestName}<br>
        <strong>Email:</strong> ${guestEmail}<br>
        <strong>Phone:</strong> ${guestPhone}<br>
        <strong>Room:</strong> ${roomType}<br>
        <strong>Check-in:</strong> ${checkIn}<br>
        <strong>Check-out:</strong> ${checkOut}<br>
        <strong>Total:</strong> &#8358;${totalAmount.toLocaleString()}<br>
        <strong>Status:</strong> Pending Transfer
      `
    }).catch(console.error);

    res.json({ message: "Booking created", booking });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// --- ROOM SERVICE ORDERS (used by order.html) ---
app.post("/room-service-orders", async (req, res) => {
  try {
    const { room_id, guest_name, items, total_price, notes } = req.body;

    // Notify admin immediately
    sendAdminNotificationEmail({
      type: "food",
      details: `
        <strong>Guest / Room:</strong> ${guest_name || "Walk-in"} &mdash; Room ${room_id || "Pickup"}<br>
        <strong>Items:</strong> ${items}<br>
        <strong>Total:</strong> &#8358;${parseFloat(total_price || 0).toLocaleString()}<br>
        <strong>Notes:</strong> ${notes || "None"}<br>
        <strong>Status:</strong> Pending — Payment Confirmed by Guest
      `
    }).catch(console.error);

    res.json({ message: "Order received", status: "pending" });
  } catch (error) {
    console.error("Error recording room service order:", error);
    res.status(500).json({ error: "Failed to record order" });
  }
});

// --- Database Health Check ---
app.get("/health", async (req, res) => {
  try {
    const roomCount = await prisma.room.count();
    const guestCount = await prisma.guest.count();
    const bookingCount = await prisma.booking.count();

    res.json({
      ok: true,
      message: "Database connection successful!",
      stats: {
        rooms: roomCount,
        guests: guestCount,
        bookings: bookingCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check error:", error);
    res.status(500).json({
      ok: false,
      message: "Database connection failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// --- Start server ---
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`✅ Backend running on port ${PORT}`)
  );
}

module.exports = app;
