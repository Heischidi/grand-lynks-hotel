// Test script for backend API
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const API_URL = "http://localhost:5000/api";

async function testBackend() {
  console.log("🧪 Testing Grand Lynks Hotel Backend API...\n");

  try {
    // Test 1: Get rooms
    console.log("1️⃣ Testing GET /api/rooms...");
    const roomsResponse = await fetch(`${API_URL}/rooms`);
    const rooms = await roomsResponse.json();
    console.log(`✅ Found ${rooms.length} rooms`);
    console.log("Sample room:", rooms[0]);
    console.log("");

    // Test 2: Create a booking
    console.log("2️⃣ Testing POST /api/bookings...");
    const bookingData = {
      guestName: "Test Guest",
      guestEmail: "test@example.com",
      guestPhone: "+2341234567890",
      room: rooms[0],
      checkin: "2024-12-25",
      checkout: "2024-12-27",
      guests: 2,
      status: "pending",
    };

    const bookingResponse = await fetch(`${API_URL}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingData),
    });

    const booking = await bookingResponse.json();
    console.log("✅ Booking created successfully");
    console.log("Booking ID:", booking.booking.id);
    console.log("");

    // Test 3: Get bookings
    console.log("3️⃣ Testing GET /api/bookings...");
    const bookingsResponse = await fetch(`${API_URL}/bookings`);
    const bookings = await bookingsResponse.json();
    console.log(`✅ Found ${bookings.length} bookings`);
    console.log("");

    // Test 4: Submit a review
    console.log("4️⃣ Testing POST /api/reviews...");
    const reviewData = {
      reviewerName: "Test Reviewer",
      reviewerEmail: "reviewer@example.com",
      reviewerType: "leisure",
      rating: 5,
      reviewTitle: "Amazing Stay!",
      reviewText: "This was an incredible experience. Highly recommended!",
      reviewHighlights: "Great service, clean rooms, excellent location",
      reviewSuggestions: "None, everything was perfect",
    };

    const reviewResponse = await fetch(`${API_URL}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reviewData),
    });

    const review = await reviewResponse.json();
    console.log("✅ Review submitted successfully");
    console.log("Review ID:", review.review.id);
    console.log("");

    // Test 5: Get reviews
    console.log("5️⃣ Testing GET /api/reviews...");
    const reviewsResponse = await fetch(`${API_URL}/reviews`);
    const reviews = await reviewsResponse.json();
    console.log(`✅ Found ${reviews.length} reviews`);
    console.log("");

    console.log("🎉 All tests passed! Backend is working correctly.");
    console.log("\n📊 Summary:");
    console.log(`- Rooms: ${rooms.length}`);
    console.log(`- Bookings: ${bookings.length}`);
    console.log(`- Reviews: ${reviews.length}`);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Make sure the backend server is running on port 5000");
    console.log("2. Check if there are any CORS issues");
    console.log("3. Verify the API endpoints are correct");
  }
}

// Run the test
testBackend();
