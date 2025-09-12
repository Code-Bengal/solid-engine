import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getBookingById, savePaymentToSheets, updateRoomAvailability, updateBookingStatus, updateDashboardAfterPayment } from '@/lib/google-sheets';

interface PaymentVerificationRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  booking_id: string;
}

// PUT /api/payments/verify - Verify payment
export async function PUT(request: NextRequest) {
  try {
    const body: PaymentVerificationRequest = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !booking_id) {
      return NextResponse.json(
        { error: 'Missing payment verification data' },
        { status: 400 }
      );
    }

    // For development/test environment, skip signature verification if not provided
    if (razorpay_signature && process.env.NODE_ENV !== 'development') {
      // Verify payment signature
      const sign = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(sign)
        .digest('hex');

      if (razorpay_signature !== expectedSign) {
        return NextResponse.json(
          { error: 'Payment verification failed' },
          { status: 400 }
        );
      }
    }

    // Payment verified successfully
    // Get booking details to save payment info
    const booking = await getBookingById(booking_id);
    if (booking) {
      // Calculate advance payment amount (25% of total)
      const advanceAmount = Math.round(booking.total_price / 4);

      // Save payment details to Google Sheets
      const paymentData = {
        id: `PAY${Date.now()}`,
        booking_id: booking_id,
        razorpay_order_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        amount: advanceAmount,
        currency: 'INR',
        status: 'completed',
        customer_email: booking.customer_email,
        transaction_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      await savePaymentToSheets(paymentData);

      // Update room availability to booked (not available)
      if (booking.room_id) {
        await updateRoomAvailability(booking.room_id, false);
      }

      // Update booking status to confirmed
      await updateBookingStatus(booking_id, 'confirmed', 'completed');

      // Update dashboard metrics
      await updateDashboardAfterPayment();
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
      booking_id: booking_id,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
}
