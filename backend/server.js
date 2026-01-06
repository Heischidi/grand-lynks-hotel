const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { prisma } = require("./database.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const path = require('path');
app.use(cors());
app.use(bodyParser.json());

const nodemailer = require("nodemailer");

// Email Transporter (Configure with real credentials in .env)
const transporter = nodemailer.createTransport({
  service: "gmail", // or 'smtp.ethereal.email' for testing
  auth: {
    user: process.env.EMAIL_USER || "grandlynkshomesandapartments@gmail.com",
    pass: process.env.EMAIL_PASS || "your_app_password"
  }
});

async function sendConfirmationEmail(booking, guest, room) {
  const mailOptions = {
    from: '"Grand Lynks Hotel" <grandlynkshomesandapartments@gmail.com>',
    to: guest.email,
    subject: 'Booking Confirmation - Grand Lynks Hotel',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8b1d30;">Booking Confirmation</h2>
        <p>Dear ${guest.name},</p>
        <p>Thank you for choosing Grand Lynks Homes & Apartments. Your booking has been received.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Room:</strong> ${room.type}</p>
          <p><strong>Check-in:</strong> ${new Date(booking.startDate).toDateString()}</p>
          <p><strong>Check-out:</strong> ${new Date(booking.endDate).toDateString()}</p>
          <p><strong>Total Amount:</strong> ₦${booking.totalAmount.toLocaleString()}</p>
          <p><strong>Status:</strong> Pending Payment</p>
        </div>

        <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #8b1d30; margin-top: 0;">Payment Instructions</h3>
          <p>Please transfer the total amount to the account below to confirm your reservation:</p>
          <p><strong>Bank Name:</strong> Moniepoint</p>
          <p><strong>Account Name:</strong> Grand lynks Homes and Apartments</p>
          <p><strong>Account Number:</strong> 5015151292</p>
          <p>Please start the transfer description with your name.</p>
        </div>

        <p>Need help? Contact us at +234 814 223 4691.</p>
        <p>Warm regards,<br>The Grand Lynks Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Confirmation email sent to " + guest.email);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// Serve static files from the parent directory (frontend)
app.use(express.static(path.join(__dirname, '../')));

// Initial route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

const SECRET_KEY = process.env.JWT_SECRET || "your_super_secret_key_change_in_production";

const multer = require("multer");
const fs = require('fs');

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

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
app.post("/api/auth/login", async (req, res) => {
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
app.get("/api/rooms", async (req, res) => {
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

app.post("/api/rooms", authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file ? req.file.path.replace(/\\/g, '/') : null;
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

app.put("/api/rooms/:id", authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log("PUT /rooms/:id called");
    console.log("Headers CT:", req.headers['content-type']);
    console.log("Body:", req.body);
    console.log("File:", req.file);

    const imagePath = req.file ? req.file.path.replace(/\\/g, '/') : null;
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

app.delete("/api/rooms/:id", authenticateToken, async (req, res) => {
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
app.get("/api/guests", authenticateToken, async (req, res) => {
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

app.post("/api/guests", validateGuest, async (req, res) => {
  try {
    const guest = await prisma.guest.create({
      data: req.body,
    });
    res.json({ message: "Guest added", guest });
  } catch (error) {
    console.error("Error creating guest:", error);
    res.status(500).json({ error: "Failed to create guest" });
  }
});

app.put("/api/guests/:id", authenticateToken, validateGuest, async (req, res) => {
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

app.delete("/api/guests/:id", authenticateToken, async (req, res) => {
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
app.get("/api/payments", authenticateToken, async (req, res) => {
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

app.post("/api/payments", async (req, res) => {
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

app.put("/api/payments/:id", authenticateToken, async (req, res) => {
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

app.delete("/api/payments/:id", authenticateToken, async (req, res) => {
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
app.get("/api/users", authenticateToken, (req, res) => res.json(users));
app.post("/api/users", authenticateToken, (req, res) => {
  const user = { id: Date.now(), ...req.body };
  users.push(user);
  res.json({ message: "User added", user });
});
app.put("/api/users/:id", authenticateToken, (req, res) => {
  const idx = users.findIndex((u) => u.id == req.params.id);
  if (idx > -1) {
    users[idx] = { ...users[idx], ...req.body };
    res.json({ message: "User updated", user: users[idx] });
  } else res.status(404).json({ message: "User not found" });
});
app.delete("/api/users/:id", authenticateToken, (req, res) => {
  users = users.filter((u) => u.id != req.params.id);
  res.json({ message: "User deleted" });
});

// --- BOOKINGS ---
app.get("/api/bookings", authenticateToken, async (req, res) => {
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

app.post("/api/bookings", validateBooking, async (req, res) => {
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
    // Note: We need the room details which are included in 'booking.room'
    // and guest details in 'booking.guest'
    sendConfirmationEmail(booking, booking.guest, booking.room);

    res.json({ message: "Booking created successfully", booking });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

app.put("/api/bookings/:id", authenticateToken, validateBooking, async (req, res) => {
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

app.delete("/api/bookings/:id", authenticateToken, async (req, res) => {
  try {
    await prisma.booking.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Booking deleted" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Booking not found" });
    } else {
      res.status(500).json({ error: "Failed to delete booking" });
    }
  }
});
// --- CHECK AVAILABILITY ---
app.post("/api/check-availability", async (req, res) => {
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
app.get("/api/menu", async (req, res) => {
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

app.post("/api/menu", upload.single('image'), async (req, res) => {
  try {
    // If file uploaded, use its path. Otherwise check body (for URL or fallback)
    const imagePath = req.file ? req.file.path.replace(/\\/g, '/') : req.body.image;

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

app.put("/api/menu/:id", upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file ? req.file.path.replace(/\\/g, '/') : req.body.image;

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

app.delete("/api/menu/:id", async (req, res) => {
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
app.get("/api/orders", authenticateToken, async (req, res) => {
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

app.post("/api/orders", validateOrder, async (req, res) => {
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
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.put("/api/orders/:id", async (req, res) => {
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

app.delete("/api/orders/:id", async (req, res) => {
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
app.get("/api/reports", (req, res) => {
  res.json({
    occupancy: "82%",
    revenue: 22500,
    satisfaction: 4.8,
    repeatGuests: "35%",
  });
});

// --- Communication (Dummy) ---
app.post("/api/communication/email", (req, res) => {
  res.json({ message: "Bulk email sent!" });
});
app.post("/api/communication/sms", (req, res) => {
  res.json({ message: "SMS sent!" });
});
app.post("/api/communication/announcement", (req, res) => {
  res.json({ message: "Announcement posted!" });
});

// --- Housekeeping/Maintenance (Dummy) ---
app.post("/api/housekeeping/task", (req, res) => {
  res.json({ message: "Task assigned!" });
});
app.post("/api/maintenance/report", (req, res) => {
  res.json({ message: "Maintenance issue reported!" });
});

// --- CONTENT MANAGEMENT ---
app.get("/api/content", async (req, res) => {
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

app.post("/api/content", async (req, res) => {
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

app.put("/api/content/:id", async (req, res) => {
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

app.delete("/api/content/:id", async (req, res) => {
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
app.get("/api/settings", async (req, res) => {
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

app.post("/api/settings", async (req, res) => {
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

app.put("/api/settings/:key", async (req, res) => {
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

app.delete("/api/settings/:key", async (req, res) => {
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
app.get("/api/reviews", async (req, res) => {
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


app.get("/api/admin/reviews", authenticateToken, async (req, res) => {
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

app.post("/api/reviews", async (req, res) => {
  try {
    const review = await prisma.review.create({
      data: {
        ...req.body,
        status: "pending" // Force pending for new submissions
      },
    });
    res.json({ message: "Review submitted", review });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
});

app.put("/api/reviews/:id", authenticateToken, async (req, res) => {
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

app.delete("/api/reviews/:id", authenticateToken, async (req, res) => {
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
app.get("/api/maintenance", async (req, res) => {
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

app.post("/api/maintenance", async (req, res) => {
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

app.put("/api/maintenance/:id", async (req, res) => {
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
app.get("/api/housekeeping", async (req, res) => {
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

app.post("/api/housekeeping", async (req, res) => {
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

app.put("/api/housekeeping/:id", async (req, res) => {
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
app.get("/api/staff", async (req, res) => {
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

app.post("/api/staff", async (req, res) => {
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

app.put("/api/staff/:id", async (req, res) => {
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

app.delete("/api/staff/:id", async (req, res) => {
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
app.post("/api/bookings", async (req, res) => {
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

    // Send email
    if (booking.guest) {
      // Run asynchronously, don't block response
      sendConfirmationEmail(booking, booking.guest, booking.room).catch(console.error);
    }

    res.json({ message: "Booking created", booking });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// --- Database Health Check ---
app.get("/api/health", async (req, res) => {
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
app.listen(5000, () =>
  console.log("✅ Backend running on http://localhost:5000")
);
