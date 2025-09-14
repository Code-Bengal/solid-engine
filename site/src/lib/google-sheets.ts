import { google } from 'googleapis';

interface Room {
  id: string;
  name: string;
  type: string;
  description: string;
  price: number;
  capacity: number;
  amenities: string;
  available: boolean;
  image_url: string;
  created_at: string;
}

interface Booking {
  id: string;
  room_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  payment_status: string;
  booking_status: string;
  special_requests: string;
  created_at: string;
  updated_at: string;
}

// Cache for rooms data
let roomsCache: Room[] | null = null;
let roomsCacheTime: number = 0;
const CACHE_TTL = 300000; // 5 minutes

/**
 * Get a valid image URL, replacing placeholder URLs with proper images
 */
function getValidImageUrl(url: string): string {
  if (!url || url.includes('example.com')) {
    // Return a proper placeholder image based on room type or random
    const placeholders = [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop'
    ];
    return placeholders[Math.floor(Math.random() * placeholders.length)];
  }
  return url;
}

/**
 * Get Google Sheets client using environment variables
 */
function getGoogleSheetsClient() {
  // Create credentials object from environment variables
  const credentials = {
    type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE!,
    project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID!,
    private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID!,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL!,
    client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID!,
    auth_uri: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_URI!,
    token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI!,
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Get rooms data from Google Sheets
 */
export async function getRoomsFromSheets(): Promise<Room[]> {
  // Check cache
  const now = Date.now();
  if (roomsCache && (now - roomsCacheTime) < CACHE_TTL) {
    return roomsCache;
  }

  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
    const range = `${process.env.GOOGLE_SHEETS_ROOMS_SHEET}!A2:J`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values || [];
    const rooms: Room[] = [];

    for (const row of values) {
      if (row.length >= 9) {
        rooms.push({
          id: row[0],
          name: row[1],
          type: row[2] || '',
          description: row[3] || '',
          price: parseFloat(row[4]) || 0,
          capacity: parseInt(row[5]) || 1,
          amenities: row[6] || '',
          available: (row[7] || '').toLowerCase() === 'yes' || (row[7] || '') === '1',
          image_url: getValidImageUrl(row[8] || ''),
          created_at: row[9] || ''
        });
      }
    }

    // Update cache
    roomsCache = rooms;
    roomsCacheTime = now;

    return rooms;
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }
}

/**
 * Get booking data by booking ID from Google Sheets
 */
export async function getBookingById(bookingId: string): Promise<Booking | null> {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
    const range = `${process.env.GOOGLE_SHEETS_BOOKINGS_SHEET}!A2:N`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values || [];

    for (const row of values) {
      if (row.length >= 14 && row[0] === bookingId) {
        return {
          id: row[0],
          room_id: row[1],
          customer_name: row[2],
          customer_email: row[3],
          customer_phone: row[4],
          check_in: row[5],
          check_out: row[6],
          guests: parseInt(row[7]) || 1,
          total_price: parseFloat(row[8]) || 0,
          payment_status: row[9] || 'pending',
          booking_status: row[10] || 'pending',
          special_requests: row[11] || '',
          created_at: row[12] || '',
          updated_at: row[13] || ''
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
}

/**
 * Get room data by room ID from Google Sheets
 */
export async function getRoomById(roomId: string): Promise<Room | null> {
  const rooms = await getRoomsFromSheets();

  for (const room of rooms) {
    if (room.id === roomId) {
      return room;
    }
  }

  return null;
}

/**
 * Save booking to Google Sheets
 */
export async function saveBookingToSheets(bookingData: Omit<Booking, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<boolean> {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
    const range = `${process.env.GOOGLE_SHEETS_BOOKINGS_SHEET}!A1`;

    const now = new Date().toISOString();

    const values = [[
      bookingData.id || generateBookingId(),
      bookingData.room_id,
      bookingData.customer_name,
      bookingData.customer_email,
      bookingData.customer_phone,
      bookingData.check_in,
      bookingData.check_out,
      bookingData.guests || 1,
      bookingData.total_price,
      bookingData.payment_status || 'pending',
      bookingData.booking_status || 'pending',
      bookingData.special_requests || '',
      now,
      now
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });

    return true;
  } catch (error) {
    console.error('Error saving booking:', error);
    return false;
  }
}

/**
 * Save payment details to Google Sheets
 */
export async function savePaymentToSheets(paymentData: {
  id: string;
  booking_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount: number;
  currency?: string;
  payment_method?: string;
  status?: string;
  transaction_date?: string;
  customer_email?: string;
  created_at?: string;
}): Promise<boolean> {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
    const range = `${process.env.GOOGLE_SHEETS_PAYMENTS_SHEET}!A1`;

    const values = [[
      paymentData.id,
      paymentData.booking_id,
      paymentData.razorpay_order_id,
      paymentData.razorpay_payment_id,
      paymentData.amount,
      paymentData.currency || 'INR',
      paymentData.payment_method || 'card',
      paymentData.status || 'completed',
      paymentData.transaction_date || new Date().toISOString(),
      paymentData.customer_email || '',
      paymentData.created_at || new Date().toISOString()
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });

    return true;
  } catch (error) {
    console.error('Error saving payment:', error);
    return false;
  }
}

/**
 * Generate a unique booking ID
 */
function generateBookingId(): string {
  return 'BK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

/**
 * Update room availability after booking
 */
export async function updateRoomAvailability(roomId: string, available: boolean): Promise<boolean> {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    // Get all rooms data to find the row number for the specific room
    const range = `${process.env.GOOGLE_SHEETS_ROOMS_SHEET}!A2:J`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values || [];

    if (values.length > 0) {
      for (let index = 0; index < values.length; index++) {
        const row = values[index];
        if (row.length >= 8 && row[0] === roomId) {
          // Found the room, update the availability (column H, which is index 7)
          const rowNumber = index + 2; // +2 because we start from A2 and arrays are 0-indexed
          const updateRange = `${process.env.GOOGLE_SHEETS_ROOMS_SHEET}!H${rowNumber}`;

          const updateValues = [[available ? 'yes' : 'no']];

          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: updateRange,
            valueInputOption: 'RAW',
            requestBody: {
              values: updateValues,
            },
          });

          // Clear cache so updated data is fetched fresh
          roomsCache = null;
          roomsCacheTime = 0;

          return true;
        }
      }
    }

    return false; // Room not found
  } catch (error) {
    console.error('Error updating room availability:', error);
    return false;
  }
}

/**
 * Update booking status after payment
 */
export async function updateBookingStatus(bookingId: string, status: string = 'confirmed', paymentStatus: string = 'completed'): Promise<boolean> {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    // Get all bookings data to find the row number for the specific booking
    const range = `${process.env.GOOGLE_SHEETS_BOOKINGS_SHEET}!A2:N`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values || [];

    if (values.length > 0) {
      for (let index = 0; index < values.length; index++) {
        const row = values[index];
        if (row.length >= 14 && row[0] === bookingId) {
          // Found the booking, update the booking status (column K, which is index 10)
          const rowNumber = index + 2; // +2 because we start from A2 and arrays are 0-indexed

          // Update booking status
          const statusRange = `${process.env.GOOGLE_SHEETS_BOOKINGS_SHEET}!K${rowNumber}`;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: statusRange,
            valueInputOption: 'RAW',
            requestBody: {
              values: [[status]],
            },
          });

          // Update payment status (column J, which is index 9)
          const paymentStatusRange = `${process.env.GOOGLE_SHEETS_BOOKINGS_SHEET}!J${rowNumber}`;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: paymentStatusRange,
            valueInputOption: 'RAW',
            requestBody: {
              values: [[paymentStatus]],
            },
          });

          return true;
        }
      }
    }

    return false; // Booking not found
  } catch (error) {
    console.error('Error updating booking status:', error);
    return false;
  }
}

/**
 * Update dashboard metrics after payment
 */
export async function updateDashboardAfterPayment(): Promise<boolean> {
  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    // Get total rooms count
    const roomsRange = `${process.env.GOOGLE_SHEETS_ROOMS_SHEET}!A2:J`;
    const roomsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: roomsRange,
    });
    const roomsValues = roomsResponse.data.values || [];
    const totalRooms = roomsValues.length;

    // Count available rooms
    let availableRooms = 0;
    for (const room of roomsValues) {
      if (room.length >= 8 && (room[7]?.toLowerCase() === 'yes' || room[7] === '1')) {
        availableRooms++;
      }
    }

    // Get total bookings count
    const bookingsRange = `${process.env.GOOGLE_SHEETS_BOOKINGS_SHEET}!A2:N`;
    const bookingsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: bookingsRange,
    });
    const bookingsValues = bookingsResponse.data.values || [];
    const totalBookings = bookingsValues.length;

    // Calculate total revenue from payments
    const paymentsRange = `${process.env.GOOGLE_SHEETS_PAYMENTS_SHEET}!A2:K`;
    const paymentsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: paymentsRange,
    });
    const paymentsValues = paymentsResponse.data.values || [];
    let totalRevenue = 0;
    for (const payment of paymentsValues) {
      if (payment.length >= 5 && payment[4] && !isNaN(Number(payment[4]))) {
        totalRevenue += Number(payment[4]);
      }
    }

    // Calculate occupancy rate
    const occupancyRate = totalRooms > 0 ? Math.round((totalBookings / totalRooms) * 100) : 0;

    // Update dashboard with new metrics
    const dashboardData = [
      ['Total Rooms', totalRooms, new Date().toISOString()],
      ['Available Rooms', availableRooms, new Date().toISOString()],
      ['Total Bookings', totalBookings, new Date().toISOString()],
      ['Total Revenue (₹)', totalRevenue, new Date().toISOString()],
      ['Occupancy Rate (%)', occupancyRate, new Date().toISOString()]
    ];

    const range = `${process.env.GOOGLE_SHEETS_DASHBOARD_SHEET}!A2`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: dashboardData,
      },
    });

    return true;
  } catch (error) {
    console.error('Error updating dashboard:', error);
    return false;
  }
}
