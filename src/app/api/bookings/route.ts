import { NextRequest, NextResponse } from 'next/server';
import { saveBookingToSheets, getBookingById, getRoomsFromSheets } from '@/lib/google-sheets';
import { differenceInDays } from 'date-fns';

interface BookingRequest {
  room_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  special_requests?: string;
}

// POST /api/bookings - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const body: BookingRequest = await request.json();
    const {
      room_id,
      customer_name,
      customer_email,
      customer_phone,
      check_in_date,
      check_out_date,
      guests,
      special_requests
    } = body;

    if (!room_id || !customer_name || !customer_email || !check_in_date || !check_out_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate dates
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);

    if (checkIn >= checkOut) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    // Get room details
    const rooms = await getRoomsFromSheets();
    const room = rooms.find(r => r.id === room_id);

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    if (!room.available) {
      return NextResponse.json(
        { error: 'Room is not available' },
        { status: 409 }
      );
    }

    // Calculate total price
    const nights = differenceInDays(checkOut, checkIn);
    const totalPrice = room.price * nights;

    // Create booking data
    const bookingId = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const bookingData = {
      id: bookingId,
      room_id,
      customer_name,
      customer_email,
      customer_phone,
      check_in: check_in_date,
      check_out: check_out_date,
      guests: guests || 1,
      total_price: totalPrice,
      payment_status: 'pending',
      booking_status: 'confirmed',
      special_requests: special_requests || ''
    };

    // Save to Google Sheets
    const success = await saveBookingToSheets(bookingData);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Booking created successfully',
        booking_id: bookingId,
        total_price: totalPrice
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

// GET /api/bookings/[id] - Get booking by ID
export async function GET_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const booking = await getBookingById(params.id);

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}
