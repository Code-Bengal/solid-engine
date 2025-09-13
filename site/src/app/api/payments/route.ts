import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getBookingById } from '@/lib/google-sheets';

// Initialize Razorpay (only if environment variables are available)
let razorpay: Razorpay | null = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

interface PaymentRequest {
  booking_id: string;
}

// POST /api/payments - Create a Razorpay order
export async function POST(request: NextRequest) {
  try {
    // Check if Razorpay is configured
    if (!razorpay) {
      return NextResponse.json(
        { error: 'Payment service not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.' },
        { status: 503 }
      );
    }

    const body: PaymentRequest = await request.json();
    const { booking_id } = body;

    if (!booking_id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await getBookingById(booking_id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Calculate advance payment (25% of total booking amount)
    const totalAmount = booking.total_price;
    const advanceAmount = Math.round(totalAmount / 4);

    // Create Razorpay order
    const orderOptions = {
      amount: advanceAmount * 100, // Amount in paisa
      currency: 'INR',
      receipt: booking_id,
      payment_capture: 1, // Auto capture
    };

    const order = await razorpay.orders.create(orderOptions);

    return NextResponse.json({
      order_id: order.id,
      amount: advanceAmount,
      currency: 'INR',
      booking_id: booking_id,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}

// POST /api/payments/verify - Verify payment
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_id) {
      return NextResponse.json(
        { error: 'Missing payment verification data' },
        { status: 400 }
      );
    }

    // Verify payment signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const crypto = await import('crypto');
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      // Payment verified successfully
      // Here you would typically update the booking status and save payment details
      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        payment_id: razorpay_payment_id,
        booking_id: booking_id,
      });
    } else {
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}
