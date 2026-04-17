# Grand Lynks Hotel - Backend Integration

## 🚀 Overview

The Grand Lynks Hotel website now has full backend integration with a Node.js/Express.js API server. This enables real-time booking management, review submissions, payment processing, and comprehensive admin functionality.

## 📁 Project Structure

```
grand-lynks-hotel/
├── backend/
│   └── server.js              # Express.js API server
├── booking-integration.js     # Frontend booking system integration
├── review-integration.js      # Frontend review system integration
├── admin.js                   # Admin dashboard functionality
├── config.js                  # Configuration settings
├── start.js                   # Startup script for both servers
├── package.json               # Dependencies and scripts
└── [other frontend files...]
```

## 🔧 Backend API Endpoints

### Rooms Management

- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Add new room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room

### Bookings Management

- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking

### Reviews Management

- `GET /api/reviews` - Get all reviews
- `POST /api/reviews` - Submit new review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

### Payments Management

- `GET /api/payments` - Get all payments
- `POST /api/payments` - Record new payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Staff Management

- `GET /api/staff` - Get all staff
- `POST /api/staff` - Add new staff member
- `PUT /api/staff/:id` - Update staff member
- `DELETE /api/staff/:id` - Delete staff member

### Users Management

- `GET /api/users` - Get all users
- `POST /api/users` - Add new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Both Servers

```bash
npm start
```

This will start:

- Backend API server on `http://localhost:5000`
- Frontend server on `http://localhost:8080`

### 3. Access the Application

- **Main Website**: http://localhost:8080
- **Admin Dashboard**: http://localhost:8080/admin.html
- **Booking Page**: http://localhost:8080/booking.html

## 💳 Payment Integration

The booking system integrates with Paystack for payment processing. To configure:

1. Update `config.js` with your Paystack public key:

```javascript
PAYSTACK_PUBLIC_KEY: "your_actual_paystack_public_key_here";
```

2. The payment flow:
   - User selects room and dates
   - Fills in guest details
   - Clicks "Pay with Paystack"
   - Payment processed through Paystack
   - Booking confirmed and stored in backend

## 📊 Admin Dashboard Features

The admin dashboard (`admin.html`) provides:

- **Dashboard Overview**: Key metrics and statistics
- **Room Management**: View, add, edit, delete rooms
- **Guest Management**: Track all guests and bookings
- **Payment Tracking**: Monitor all payments
- **Staff Management**: Manage hotel staff
- **Review Management**: Moderate guest reviews
- **Reports**: Generate occupancy and revenue reports

## 🔐 Security Features

- CORS enabled for cross-origin requests
- Input validation on all forms
- Secure payment processing through Paystack
- Admin authentication (configurable)

## 📱 Frontend Integration

### Booking System

- Real-time room availability checking
- Dynamic room selection with pricing
- Guest information collection
- Payment processing integration
- Booking confirmation and storage

### Review System

- Guest review submission
- Rating system with star display
- Review moderation through admin panel
- Automatic review storage

## 🛠️ Development

### Running Individual Servers

```bash
# Backend only
npm run backend

# Frontend only
npm run frontend
```

### API Testing

You can test the API endpoints using tools like Postman or curl:

```bash
# Get all rooms
curl http://localhost:5000/api/rooms

# Create a booking
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"guestName":"John Doe","room":101,"checkin":"2024-12-20","checkout":"2024-12-22"}'
```

## 📝 Configuration

### Environment Variables

Update `config.js` for different environments:

```javascript
window.APP_CONFIG = {
  API_URL: "http://localhost:5000/api", // Change for production
  PAYSTACK_PUBLIC_KEY: "your_paystack_key",
  USE_BACKEND_AUTH: false, // Set to true for production
  // ... other settings
};
```

### Database

Currently using in-memory storage. For production, consider:

- MongoDB with Mongoose
- PostgreSQL with Sequelize
- MySQL with Sequelize

## 🚀 Production Deployment

### Backend Deployment

1. Set up a Node.js server (Heroku, DigitalOcean, AWS, etc.)
2. Update `API_URL` in `config.js` to production URL
3. Set up environment variables for sensitive data
4. Configure CORS for your domain

### Frontend Deployment

1. Deploy static files to CDN or web server
2. Update API endpoints to production URLs
3. Configure Paystack for production environment

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend CORS is configured for your frontend domain
2. **Payment Failures**: Verify Paystack key is correct and account is active
3. **API Connection**: Check if backend server is running on correct port
4. **Port Conflicts**: Change ports in `start.js` if 5000 or 8080 are in use

### Debug Mode

Enable console logging by checking browser developer tools for detailed error messages.

## 📞 Support

For technical support or questions about the backend integration, please refer to the code comments or contact the development team.

---

**Grand Lynks Homes & Apartments** - Your comfort, our interest.
