require('dotenv').config();
const { prisma } = require('../api/database.js');

const OFFICIAL_GRAND_SPA_SERVICES = [
  // Facials (6)
  { name: 'Deep Cleansing Facial', category: 'Facials', duration: '', price: 15000, description: null, target_focus: null },
  { name: 'Treatment Facial', category: 'Facials', duration: '', price: 20000, description: null, target_focus: null },
  { name: 'Pro-Acne Facial', category: 'Facials', duration: '', price: 25000, description: null, target_focus: null },
  { name: 'Hydra Facial', category: 'Facials', duration: '', price: 35000, description: null, target_focus: null },
  { name: 'Dermaplaning Facial', category: 'Facials', duration: '', price: 30000, description: null, target_focus: null },
  { name: 'Purifying Facial', category: 'Facials', duration: '', price: 18000, description: null, target_focus: null },

  // Massage (8)
  { name: 'Swedish Massage', category: 'Massage', duration: '', price: 25000, description: null, target_focus: null },
  { name: 'Deep Tissue Massage', category: 'Massage', duration: '', price: 30000, description: null, target_focus: null },
  { name: 'Hot Stone Massage', category: 'Massage', duration: '', price: 35000, description: null, target_focus: null },
  { name: 'Aromatherapy Massage', category: 'Massage', duration: '', price: 28000, description: null, target_focus: null },
  { name: 'Back, Neck and Shoulder Massage', category: 'Massage', duration: '', price: 12000, description: null, target_focus: null },
  { name: 'Back, Waist and Shoulder Massage', category: 'Massage', duration: '', price: 12000, description: null, target_focus: null },
  { name: 'Head Massage', category: 'Massage', duration: '', price: 10000, description: null, target_focus: null },
  { name: 'Foot Massage', category: 'Massage', duration: '', price: 10000, description: null, target_focus: null },

  // Pedicures (4)
  { name: 'Classic Pedicure', category: 'Pedicures', duration: '', price: 15000, description: null, target_focus: null },
  { name: 'Paraffin Wax Pedicure', category: 'Pedicures', duration: '', price: 18000, description: null, target_focus: null },
  { name: 'Jelly Pedicure', category: 'Pedicures', duration: '', price: 17000, description: null, target_focus: null },
  { name: 'Dry Pedicure', category: 'Pedicures', duration: '', price: 16000, description: null, target_focus: null },

  // Manicures (3)
  { name: 'Classic Manicure', category: 'Manicures', duration: '', price: 12000, description: null, target_focus: null },
  { name: 'Paraffin Wax Manicure', category: 'Manicures', duration: '', price: 15000, description: null, target_focus: null },
  { name: 'Jelly Manicure', category: 'Manicures', duration: '', price: 13000, description: null, target_focus: null },

  // Waxing (Sugar) (9)
  { name: 'Full Body Wax', category: 'Waxing (Sugar)', duration: '', price: 20000, description: null, target_focus: null },
  { name: 'Full Body Wax with Underarms and Brazilian', category: 'Waxing (Sugar)', duration: '', price: 25000, description: null, target_focus: null },
  { name: 'Brazilian Wax', category: 'Waxing (Sugar)', duration: '', price: 10000, description: null, target_focus: null },
  { name: 'Underarms Wax', category: 'Waxing (Sugar)', duration: '', price: 5000, description: null, target_focus: null },
  { name: 'Underarms and Brazilian', category: 'Waxing (Sugar)', duration: '', price: 15000, description: null, target_focus: null },
  { name: 'Full Legs Wax', category: 'Waxing (Sugar)', duration: '', price: 16000, description: null, target_focus: null },
  { name: 'Half Legs Wax', category: 'Waxing (Sugar)', duration: '', price: 10000, description: null, target_focus: null },
  { name: 'Full Hands Wax', category: 'Waxing (Sugar)', duration: '', price: 15000, description: null, target_focus: null },
  { name: 'Half Hands Wax', category: 'Waxing (Sugar)', duration: '', price: 10000, description: null, target_focus: null },

  // Waxing (Strip) (7)
  { name: 'Full Body Wax', category: 'Waxing (Strip)', duration: '', price: 25000, description: null, target_focus: null },
  { name: 'Full Body Wax with Underarms and Brazilian', category: 'Waxing (Strip)', duration: '', price: 30000, description: null, target_focus: null },
  { name: 'Brazilian Wax', category: 'Waxing (Strip)', duration: '', price: 15000, description: null, target_focus: null },
  { name: 'Underarms Wax', category: 'Waxing (Strip)', duration: '', price: 10000, description: null, target_focus: null },
  { name: 'Full Legs Wax', category: 'Waxing (Strip)', duration: '', price: 18000, description: null, target_focus: null },
  { name: 'Half Legs Wax', category: 'Waxing (Strip)', duration: '', price: 15000, description: null, target_focus: null },
  { name: 'Arms Wax', category: 'Waxing (Strip)', duration: '', price: 16000, description: null, target_focus: null }
];

async function main() {
  try {
    console.log('Connecting to database...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS spa_services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'Facials',
        duration VARCHAR(50) NOT NULL DEFAULT '',
        price DOUBLE PRECISION NOT NULL,
        description TEXT,
        target_focus VARCHAR(255),
        available BOOLEAN NOT NULL DEFAULT true,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('spa_services table ready.');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS spa_bookings (
        id SERIAL PRIMARY KEY,
        booking_ref VARCHAR(50) UNIQUE,
        service_id INTEGER REFERENCES spa_services(id) ON DELETE SET NULL,
        service_name VARCHAR(255) NOT NULL,
        price DOUBLE PRECISION NOT NULL,
        guest_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        room_number VARCHAR(50),
        appointment_date DATE NOT NULL,
        time_slot VARCHAR(50) NOT NULL,
        number_of_guests INTEGER DEFAULT 1,
        special_requests TEXT,
        status VARCHAR(50) DEFAULT 'confirmed',
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        payment_method VARCHAR(50),
        notes TEXT,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('spa_bookings table ready.');

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_spa_bookings_date ON spa_bookings (appointment_date);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_spa_bookings_status ON spa_bookings (status);`);
    console.log('Indexes ready.');

    // Seed official Grand Spa services if none exist
    const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM spa_services WHERE deleted_at IS NULL`);
    const count = countResult[0]?.count || 0;
    console.log(`Existing active spa services: ${count}`);

    if (count === 0) {
      console.log('Seeding official Grand Spa price list (37 treatments, no pictures)...');
      for (const s of OFFICIAL_GRAND_SPA_SERVICES) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO spa_services (name, category, duration, price, description, target_focus, available) VALUES ($1, $2, $3, $4, $5, $6, true)`,
          s.name, s.category, s.duration, s.price, s.description, s.target_focus
        );
      }
      console.log(`Seeded ${OFFICIAL_GRAND_SPA_SERVICES.length} official Grand Spa treatments successfully.`);
    }

    // Ensure spa admin exists in admin table
    const bcrypt = require('bcryptjs');
    const existingSpaAdmin = await prisma.admin.findUnique({ where: { username: 'spaadmin' } });
    if (!existingSpaAdmin) {
      const hashedPassword = await bcrypt.hash('GrandLynksSpa2025!', 10);
      await prisma.admin.create({
        data: {
          username: 'spaadmin',
          password: hashedPassword,
          role: 'spa_admin'
        }
      });
      console.log('Created default spa admin account: spaadmin / GrandLynksSpa2025!');
    } else {
      console.log('spaadmin account already exists.');
    }

    console.log('Grand Spa database setup complete!');
  } catch (err) {
    console.error('Database setup error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
