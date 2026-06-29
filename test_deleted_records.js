const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const deletedRecords = await prisma.deletedRecord.findMany({
      orderBy: { deletedAt: 'desc' },
      take: 10
    });
    console.log(`Found ${deletedRecords.length} recently deleted records in Vault:`);
    deletedRecords.forEach(r => {
      console.log(`ID: ${r.id}, Type: ${r.recordType}, RecordID: ${r.recordId}, Deleted By: ${r.deletedBy}, Deleted At: ${r.deletedAt}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
