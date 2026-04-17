const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testContent() {
  try {
    console.log("🔍 Testing database content...");

    // Test content sections
    console.log("\n--- Content Sections ---");
    const contentSections = await prisma.contentSection.findMany();
    console.log(`Found ${contentSections.length} content sections:`);
    contentSections.forEach((section) => {
      console.log(`- ${section.page}/${section.section}: ${section.title}`);
    });

    // Test site settings
    console.log("\n--- Site Settings ---");
    const siteSettings = await prisma.siteSettings.findMany();
    console.log(`Found ${siteSettings.length} site settings:`);
    siteSettings.forEach((setting) => {
      console.log(`- ${setting.key}: ${setting.value}`);
    });

    // Test reviews
    console.log("\n--- Reviews ---");
    const reviews = await prisma.review.findMany();
    console.log(`Found ${reviews.length} reviews:`);
    reviews.forEach((review) => {
      console.log(
        `- ${review.guestName}: ${review.rating} stars - ${review.title}`
      );
    });

    // Test staff
    console.log("\n--- Staff ---");
    const staff = await prisma.staff.findMany();
    console.log(`Found ${staff.length} staff members:`);
    staff.forEach((member) => {
      console.log(`- ${member.name}: ${member.role}`);
    });

    console.log("\n✅ Database test completed!");
  } catch (error) {
    console.error("❌ Error testing database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testContent();
