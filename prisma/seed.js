const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Seed Site Settings
  const siteSettings = [
    // General Settings
    {
      key: "site_name",
      value: "Grand Lynks Homes & Apartments",
      category: "general",
      description: "Website name",
    },
    {
      key: "site_tagline",
      value: "Your comfort, our interest..",
      category: "general",
      description: "Website tagline",
    },
    {
      key: "site_description",
      value: "Luxurious stays in Gwarinpa, Abuja",
      category: "general",
      description: "Website description",
    },

    // Contact Information
    {
      key: "contact_address",
      value: "80 Pa Michael Imoudu (3rd Avenue), Gwarinpa, Abuja. Nigeria",
      category: "contact",
      description: "Hotel address",
    },
    {
      key: "contact_phone",
      value: "+234 814 223 4691",
      category: "contact",
      description: "Primary phone number",
    },
    {
      key: "contact_email",
      value: "grandlynkshomesandapartments@gmail.com",
      category: "contact",
      description: "Primary email address",
    },
    {
      key: "check_in_time",
      value: "2:00 PM",
      category: "booking",
      description: "Standard check-in time",
    },
    {
      key: "check_out_time",
      value: "11:00 AM",
      category: "booking",
      description: "Standard check-out time",
    },

    // Social Media
    {
      key: "social_facebook",
      value: "#",
      category: "social",
      description: "Facebook page URL",
    },
    {
      key: "social_instagram",
      value: "#",
      category: "social",
      description: "Instagram profile URL",
    },
    {
      key: "social_twitter",
      value: "#",
      category: "social",
      description: "Twitter profile URL",
    },
    {
      key: "social_whatsapp",
      value: "#",
      category: "social",
      description: "WhatsApp contact URL",
    },

    // Amenities
    {
      key: "amenities",
      value: JSON.stringify([
        "24/7 Electricity",
        "Free Parking",
        "Free WiFi",
        "Restaurant",
        "Daily Housekeeping",
        "24/7 Front Desk",
      ]),
      type: "json",
      category: "general",
      description: "Hotel amenities list",
    },
  ];

  for (const setting of siteSettings) {
    await prisma.siteSettings.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting,
    });
  }

  // Seed Content Sections
  const contentSections = [
    // Home Page Content
    {
      page: "home",
      section: "hero",
      title: "Grand Lynks Homes & Apartments",
      subtitle: "Your comfort, our interest..",
      content: "Experience luxury living in the heart of Gwarinpa, Abuja",
      images: JSON.stringify([
        "images/closeupstraightgrandlynksshot.jpeg",
        "images/grandVIP201.jpeg",
        "images/grandroom101.jpeg",
      ]),
      metadata: JSON.stringify({
        buttonText: "Book Your Stay",
        buttonLink: "booking.html",
      }),
    },
    {
      page: "home",
      section: "about",
      title: "The Grand Life",
      content:
        "At Grand Lynks Homes & Apartments, we believe every stay should feel intentional, luxurious, and truly unforgettable. Nestled in the heart of Gwarinpa, Abuja, our boutique hotel and apartments are thoughtfully designed for comfort, elegance, and ease — whether you're visiting for business, leisure, or an escape. Welcome to where comfort meets prestige.\n\nWelcome to the Grand living!",
    },
    {
      page: "home",
      section: "brochure",
      title: "We're Grand!",
      content:
        "We're your cozy escape -whether you're here to unwind, spend time with loved ones, or its strictly business, we're here to make your stay easy and enjoyable.",
      images: JSON.stringify([
        "images/staffsmileworkplantanglefavshot.jpeg",
        "images/slightcloseupcompoundshot.jpeg",
        "images/closeupstraightgrandlynksshot.jpeg",
        "images/grandroom205.jpeg",
      ]),
      metadata: JSON.stringify({
        leftText: "STAY. UNWIND. REPEAT",
        leftSubtext: "YOUR URBAN ESCAPE",
        rightText: "RELAX. EXPLORE. ENJOY",
        rightSubtext: "YOUR HOME AWAY",
      }),
    },
    {
      page: "home",
      section: "reviews_cta",
      title: "Share Your Experience",
      subtitle: "We'd love to hear about your stay at Grand Lynks",
      metadata: JSON.stringify({ buttonText: "✍️ Write a Review" }),
    },
  ];

  for (const section of contentSections) {
    await prisma.contentSection.upsert({
      where: {
        page_section: {
          page: section.page,
          section: section.section,
        },
      },
      update: section,
      create: section,
    });
  }

  // Seed Sample Rooms
  const rooms = [
    {
      number: 101,
      type: "Standard Single",
      pricePerNight: 20000,
      status: "available",
      description: "Comfortable single room with modern amenities",
      amenities: JSON.stringify([
        "Free WiFi",
        "Air Conditioning",
        "TV",
        "Private Bathroom",
      ]),
      images: JSON.stringify(["images/grandroom101.jpeg"]),
    },
    {
      number: 102,
      type: "Deluxe Double",
      pricePerNight: 25000,
      status: "available",
      description: "Spacious double room with premium furnishing",
      amenities: JSON.stringify([
        "Free WiFi",
        "Air Conditioning",
        "TV",
        "Private Bathroom",
        "Mini Fridge",
      ]),
      images: JSON.stringify(["images/deluxe102bettershot.jpeg"]),
    },
    {
      number: 103,
      type: "Executive Suite",
      pricePerNight: 35000,
      status: "maintenance",
      description: "Luxurious suite with separate living area",
      amenities: JSON.stringify([
        "Free WiFi",
        "Air Conditioning",
        "TV",
        "Private Bathroom",
        "Mini Fridge",
        "Living Area",
      ]),
      images: JSON.stringify(["images/grandroom103.jpeg"]),
    },
    {
      number: 201,
      type: "VIP Suite",
      pricePerNight: 45000,
      status: "occupied",
      description: "Premium VIP suite with luxury amenities",
      amenities: JSON.stringify([
        "Free WiFi",
        "Air Conditioning",
        "TV",
        "Private Bathroom",
        "Mini Fridge",
        "Living Area",
        "Balcony",
      ]),
      images: JSON.stringify(["images/grandVIP201.jpeg"]),
    },
    {
      number: 202,
      type: "Standard Double",
      pricePerNight: 22000,
      status: "cleaning",
      description: "Comfortable double room for two guests",
      amenities: JSON.stringify([
        "Free WiFi",
        "Air Conditioning",
        "TV",
        "Private Bathroom",
      ]),
      images: JSON.stringify(["images/standard20fullshot202.jpeg"]),
    },
    {
      number: 203,
      type: "Deluxe Suite",
      pricePerNight: 30000,
      status: "reserved",
      description: "Elegant deluxe suite with modern facilities",
      amenities: JSON.stringify([
        "Free WiFi",
        "Air Conditioning",
        "TV",
        "Private Bathroom",
        "Mini Fridge",
        "Work Desk",
      ]),
      images: JSON.stringify(["images/deluxe203fullshot.jpeg"]),
    },
    {
      number: 205,
      type: "Premium Room",
      pricePerNight: 28000,
      status: "available",
      description: "Premium room with city view",
      amenities: JSON.stringify([
        "Free WiFi",
        "Air Conditioning",
        "TV",
        "Private Bathroom",
        "City View",
      ]),
      images: JSON.stringify(["images/grandroom205.jpeg"]),
    },
    {
      number: 206,
      type: "Executive Room",
      pricePerNight: 32000,
      status: "available",
      description: "Executive room perfect for business travelers",
      amenities: JSON.stringify([
        "Free WiFi",
        "Air Conditioning",
        "TV",
        "Private Bathroom",
        "Work Desk",
        "Business Center Access",
      ]),
      images: JSON.stringify(["images/grandexecutive206.jpeg"]),
    },
  ];

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { number: room.number },
      update: room,
      create: room,
    });
  }

  // Seed Sample Menu Items
  const menuItems = [
    {
      name: "Continental Breakfast",
      category: "Breakfast",
      price: 5000,
      description: "Fresh bread, eggs, fruits, coffee/tea",
      available: true,
    },
    {
      name: "Jollof Rice & Chicken",
      category: "Main Course",
      price: 8000,
      description: "Traditional Nigerian jollof rice with grilled chicken",
      available: true,
    },
    {
      name: "Fried Rice & Fish",
      category: "Main Course",
      price: 7500,
      description: "Delicious fried rice served with fresh fish",
      available: true,
    },
    {
      name: "Pepper Soup",
      category: "Soup",
      price: 4000,
      description: "Spicy Nigerian pepper soup with meat",
      available: true,
    },
    {
      name: "Wine Selection",
      category: "Beverages",
      price: 15000,
      description: "Premium wine selection",
      available: true,
    },
    {
      name: "Fresh Juice",
      category: "Beverages",
      price: 2000,
      description: "Freshly squeezed fruit juice",
      available: true,
    },
    {
      name: "Grilled Chicken",
      category: "Main Course",
      price: 6000,
      description: "Perfectly grilled chicken with spices",
      available: true,
    },
    {
      name: "Vegetable Salad",
      category: "Appetizer",
      price: 3000,
      description: "Fresh mixed vegetable salad",
      available: true,
    },
  ];

  for (const item of menuItems) {
    const existing = await prisma.menuItem.findFirst({
      where: { name: item.name, category: item.category }
    });

    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: item
      });
    } else {
      await prisma.menuItem.create({
        data: item
      });
    }
  }

  // Seed Sample Reviews
  const reviews = [
    {
      guestName: "Sarah Johnson",
      guestType: "business",
      rating: 5,
      title: "Absolutely stunning!",
      content:
        "The rooms are immaculate and the service is exceptional. Grand Lynks truly lives up to its name. Will definitely return!",
      status: "approved",
      featured: true,
    },
    {
      guestName: "Michael Chen",
      guestType: "family",
      rating: 5,
      title: "Perfect family vacation",
      content:
        "Perfect location in Gwarinpa, beautiful facilities, and the staff went above and beyond to make our family vacation memorable.",
      status: "approved",
      featured: true,
    },
    {
      guestName: "Amara Okechukwu",
      guestType: "local",
      rating: 5,
      title: "Luxury at its finest",
      content:
        "The attention to detail is remarkable. From the elegant decor to the personalized service, this is luxury accommodation at its finest.",
      status: "approved",
      featured: true,
    },
  ];

  for (const review of reviews) {
    await prisma.review.create({
      data: review,
    });
  }

  // Seed Sample Staff
  const staff = [
    {
      name: "Mary Johnson",
      email: "mary@grandlynks.com",
      phone: "+234 801 234 5678",
      role: "Housekeeper",
      department: "Housekeeping",
      status: "active",
      hireDate: new Date("2023-01-15"),
      permissions: JSON.stringify(["housekeeping_tasks", "room_status"]),
    },
    {
      name: "David Wilson",
      email: "david@grandlynks.com",
      phone: "+234 802 345 6789",
      role: "Maintenance Technician",
      department: "Engineering",
      status: "active",
      hireDate: new Date("2023-03-20"),
      permissions: JSON.stringify(["maintenance_requests", "room_repairs"]),
    },
    {
      name: "Grace Adebayo",
      email: "grace@grandlynks.com",
      phone: "+234 803 456 7890",
      role: "Front Desk Manager",
      department: "Front Office",
      status: "active",
      hireDate: new Date("2022-11-10"),
      permissions: JSON.stringify(["guest_management", "bookings", "payments"]),
    },
    {
      name: "James Okafor",
      email: "james@grandlynks.com",
      phone: "+234 804 567 8901",
      role: "Chef",
      department: "Food & Beverage",
      status: "active",
      hireDate: new Date("2023-02-01"),
      permissions: JSON.stringify(["menu_management", "orders"]),
    },
  ];

  for (const member of staff) {
    await prisma.staff.upsert({
      where: { email: member.email },
      update: member,
      create: member,
    });
  }

  // Seed Sample Admin
  const bcrypt = require("bcryptjs");
  const hashedPassword = await bcrypt.hash("Admin123%", 10);

  await prisma.admin.upsert({
    where: { username: "adminmain" },
    update: {}, // Don't update password if exists
    create: {
      username: "adminmain",
      password: hashedPassword,
      role: "admin"
    },
  });
  console.log("   - Admin user seeded");

  console.log("✅ Database seeding completed successfully!");
  console.log(`   - ${siteSettings.length} site settings`);
  console.log(`   - ${contentSections.length} content sections`);
  console.log(`   - ${rooms.length} rooms`);
  console.log(`   - ${menuItems.length} menu items`);
  console.log(`   - ${reviews.length} reviews`);
  console.log(`   - ${staff.length} staff members`);
  console.log(`   - 1 admin user`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
