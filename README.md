# 🏨 Hotel Booking Demo

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.1.0-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Razorpay-Integration-blue?style=for-the-badge&logo=razorpay" alt="Razorpay" />
</div>

<br />

<div align="center">
  <h3>A modern, full-stack hotel booking system with secure payments</h3>
  <p>Built with Next.js 15, featuring Razorpay integration, Google Sheets backend, and beautiful responsive design</p>
</div>

## ✨ Features

### 🏠 Core Functionality
- **Room Management**: Browse and filter available hotel rooms
- **Booking System**: Complete booking workflow with date selection
- **User Authentication**: Secure login/signup with NextAuth.js
- **Real-time Availability**: Dynamic room availability updates

### 💳 Payment Integration
- **Razorpay Gateway**: Secure payment processing
- **Advance Payment**: 25% advance payment system
- **Payment Verification**: Cryptographic signature verification
- **Success/Failure Handling**: Comprehensive payment status management

### 📊 Data Management
- **Google Sheets Integration**: Serverless backend storage
- **Dashboard Analytics**: Real-time booking and revenue metrics
- **Room Availability Updates**: Automatic availability management
- **Booking Status Tracking**: Complete booking lifecycle management

### 🎨 User Experience
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern UI**: Clean, professional interface
- **Print Receipts**: Printable payment receipts
- **Error Handling**: Comprehensive error states and user feedback

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Google Cloud Project with Sheets API enabled
- Razorpay account and API keys

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Code-Bengal/solid-engine.git
   cd solid-engine
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```

   Configure your environment variables:
   ```env
   # Google Sheets
   GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
   GOOGLE_SHEETS_CREDENTIALS_PATH=hotel-demo-credentials.json
   GOOGLE_SHEETS_ROOMS_SHEET=Rooms
   GOOGLE_SHEETS_BOOKINGS_SHEET=Bookings
   GOOGLE_SHEETS_PAYMENTS_SHEET=Payments
   GOOGLE_SHEETS_DASHBOARD_SHEET=Dashboard

   # Razorpay
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret

   # NextAuth
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Database Seeding**
   ```bash
   npm run seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🏗️ Project Structure

```
nextjs/
├── app/
│   ├── api/
│   │   ├── auth/          # NextAuth configuration
│   │   ├── bookings/      # Booking management
│   │   ├── payments/      # Razorpay integration
│   │   └── rooms/         # Room data API
│   ├── auth/              # Authentication pages
│   ├── booking/           # Booking workflow
│   ├── payment/           # Payment pages
│   └── rooms/             # Room listing
├── components/            # Reusable UI components
├── lib/
│   ├── database.ts        # SQLite database setup
│   ├── google-sheets.ts   # Google Sheets integration
│   └── seed.ts           # Database seeding
└── public/               # Static assets
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **State Management**: React Hooks
- **Forms**: React Hook Form with Zod validation

### Backend
- **API Routes**: Next.js API Routes
- **Database**: Google Sheets (serverless)
- **Authentication**: NextAuth.js
- **Payments**: Razorpay

### Development
- **Linting**: ESLint
- **Package Manager**: npm/pnpm
- **Deployment**: Vercel ready

## 📱 Screenshots

<div align="center">
  <img src="https://picsum.photos/800/400?random=1" alt="Hotel Booking Demo" width="800" />
  <p><em>Hotel Booking Demo Interface</em></p>
</div>

## 🔧 API Endpoints

### Rooms
- `GET /api/rooms` - Fetch all rooms
- `GET /api/rooms/[id]` - Fetch specific room

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/[id]` - Fetch booking details

### Payments
- `POST /api/payments` - Create Razorpay order
- `PUT /api/payments/verify` - Verify payment

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Razorpay](https://razorpay.com/) - Payment gateway
- [Google Sheets API](https://developers.google.com/sheets/api) - Data storage
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/Code-Bengal">Code Bengal</a></p>
  <p>
    <a href="#-hotel-booking-demo">Back to top</a>
  </p>
</div>
