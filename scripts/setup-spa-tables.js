require('dotenv').config();
const { prisma } = require('../api/database.js');

async function main() {
  try {
    console.log('Connecting to database...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS spa_services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'Massage',
        duration VARCHAR(50) NOT NULL DEFAULT '60 mins',
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

    // Seed initial massage services if none exist
    const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM spa_services WHERE deleted_at IS NULL`);
    const count = countResult[0]?.count || 0;
    console.log(`Existing active spa services: ${count}`);

    if (count === 0) {
      console.log('Seeding default massage treatments (no pictures)...');
      const seedServices = [
        {
          name: 'Swedish Relaxation Massage',
          category: 'Relaxation',
          duration: '60 mins',
          price: 25000,
          description: 'Gentle, flowing strokes with premium botanical oils to ease everyday tension, soothe nerves, and induce total calming peace.',
          target_focus: 'Full Body & Stress Relief'
        },
        {
          name: 'Deep Tissue Massage',
          category: 'Therapeutic',
          duration: '60 mins',
          price: 35000,
          description: 'Intense, targeted pressure focusing on inner muscle layers to break down knots and alleviate chronic tension in the neck, back, and shoulders.',
          target_focus: 'Neck, Back & Shoulder Knots'
        },
        {
          name: 'Aromatherapy Deluxe Massage',
          category: 'Aromatherapy',
          duration: '75 mins',
          price: 30000,
          description: 'Custom-blended fragrant essential oils combined with light-to-medium rhythmic acupressure for physical and mental revitalization.',
          target_focus: 'Full Body, Mind & Senses'
        },
        {
          name: 'Hot Stone Therapy Massage',
          category: 'Specialty',
          duration: '90 mins',
          price: 40000,
          description: 'Smooth, heated volcanic basalt stones glide seamlessly across the body to melt deep muscle soreness and boost energy flow.',
          target_focus: 'Deep Muscle Warming & Circulation'
        },
        {
          name: 'Couples Rejuvenation Massage',
          category: 'Couples Experience',
          duration: '90 mins',
          price: 60000,
          description: 'Side-by-side restorative massage therapy for two in our private couples suite, tailored to each partner’s individual preferences.',
          target_focus: 'Shared Relaxation for Two'
        },
        {
          name: 'Executive Express Neck & Shoulder Relief',
          category: 'Express Relief',
          duration: '30 mins',
          price: 18000,
          description: 'Fast, highly focused upper-body relief for travelers and busy executives, targeting posture fatigue and computer stiffness.',
          target_focus: 'Upper Back, Neck & Shoulders'
        }
      ];

      for (const s of seedServices) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO spa_services (name, category, duration, price, description, target_focus, available) VALUES ($1, $2, $3, $4, $5, $6, true)`,
          s.name, s.category, s.duration, s.price, s.description, s.target_focus
        );
      }
      console.log('Seeded 6 default massage treatments successfully.');
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

    console.log('Spa database setup complete!');
  } catch (err) {
    console.error('Database setup error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
