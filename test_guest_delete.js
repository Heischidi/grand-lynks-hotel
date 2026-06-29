const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const guests = await prisma.guest.findMany({
      where: { deletedAt: null },
      include: { bookings: true, orders: true }
    });
    const guestsWithNoBookings = guests.filter(g => g.bookings.length === 0 && g.orders.length === 0);
    console.log(`Found ${guestsWithNoBookings.length} guests with no bookings/orders.`);
    if (guestsWithNoBookings.length > 0) {
      const target = guestsWithNoBookings[0];
      console.log(`Attempting to soft-delete target guest: ID ${target.id}, Name: ${target.name}`);
      const updated = await prisma.guest.update({
        where: { id: target.id },
        data: { deletedAt: new Date() }
      });
      console.log('Soft-delete successful in DB!', updated.deletedAt);
      
      // Let's create deleted record snapshot
      // Wait, is there a problem in createDeletedRecord?
      console.log('Attempting to create deleted record...');
      const deletedRecord = await prisma.deletedRecord.create({
        data: {
          recordType: 'guest',
          recordId: target.id,
          snapshot: JSON.stringify(target),
          deletedBy: 'test_admin',
          isRead: false
        }
      });
      console.log('Created deleted record successfully!', deletedRecord.id);

      // Now restore it so we don't mess up their data
      await prisma.guest.update({
        where: { id: target.id },
        data: { deletedAt: null }
      });
      console.log('Restored guest for safety.');
    }
  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
