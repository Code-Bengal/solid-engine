"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";

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
  special_requests?: string;
}

interface Room {
  id: string;
  name: string;
  type: string;
  description: string;
  price: number;
  capacity: number;
  amenities: string[];
  available: boolean;
  image_url: string;
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    if (!bookingId) {
      router.push('/booking');
      return;
    }

    const fetchBookingDetails = async () => {
      try {
        // Fetch booking details
        const bookingResponse = await fetch(`/api/bookings/${bookingId}`);
        if (!bookingResponse.ok) {
          throw new Error('Booking not found');
        }
        const bookingData = await bookingResponse.json();
        setBooking(bookingData);

        // Fetch room details
        const roomResponse = await fetch('/api/rooms');
        if (roomResponse.ok) {
          const roomsData = await roomResponse.json();
          const roomData = roomsData.find((r: Room) => r.id === bookingData.room_id);
          setRoom(roomData || null);
        }
      } catch (error) {
        console.error('Error fetching booking details:', error);
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, router]);

  const handlePayment = async () => {
    if (!booking) return;

    setPaymentLoading(true);
    setError('');

    try {
      // Create Razorpay order
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: booking.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await response.json();

      // Initialize Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount * 100, // Amount in paisa
        currency: orderData.currency,
        name: 'Hotel Demo',
        description: 'Hotel Booking Payment',
        order_id: orderData.order_id,
        handler: function (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
          // Handle successful payment
          router.push(`/payment/success?payment_id=${response.razorpay_payment_id}&order_id=${response.razorpay_order_id}&razorpay_signature=${response.razorpay_signature}&booking_id=${booking.id}`);
        },
        prefill: {
          name: orderData.customer_name,
          email: orderData.customer_email,
        },
        modal: {
          ondismiss: function() {
            // Handle payment modal dismissal (user closed the modal)
            router.push('/payment/failed?error_code=user_cancelled&error_description=Payment was cancelled by user');
          }
        },
        theme: {
          color: '#3B82F6',
        },
      };

      const rzp = new (window as unknown as { Razorpay: new (options: unknown) => { open: () => void } }).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Error initiating payment:', error);
      setError('Failed to initiate payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || 'Booking not found'}</p>
          <button
            onClick={() => router.push('/booking')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            data-clickable-element="payment-error-back"
            data-element-description="Return to booking page when payment error occurs"
          >
            Back to Booking
          </button>
        </div>
      </div>
    );
  }

  const advanceAmount = Math.round(booking.total_price / 4);
  const remainingAmount = booking.total_price - advanceAmount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Complete Your Payment</h2>
          <p className="text-lg text-blue-100">Secure payment for your hotel booking</p>
        </div>
      </section>

      {/* Payment Section */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Booking Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Booking Summary</h3>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking ID:</span>
                  <span className="font-semibold text-gray-500">{booking.id}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-semibold text-gray-500">{booking.customer_name}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-semibold text-gray-500">{booking.customer_email}</span>
                </div>

                {room && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Room:</span>
                    <span className="font-semibold text-gray-500">{room.name}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Check-in:</span>
                  <span className="font-semibold text-gray-500">{new Date(booking.check_in).toLocaleDateString()}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Check-out:</span>
                  <span className="font-semibold text-gray-500">{new Date(booking.check_out).toLocaleDateString()}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Guests:</span>
                  <span className="font-semibold text-gray-500">{booking.guests}</span>
                </div>

                <hr className="my-4" />

                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Total Booking Amount:</span>
                  <span className="font-bold text-gray-900">${booking.total_price}</span>
                </div>

                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Advance Payment (25%):</span>
                  <span className="font-bold text-blue-600">${advanceAmount}</span>
                </div>

                <div className="flex justify-between text-sm text-gray-500">
                  <span>Remaining Amount (75%):</span>
                  <span>${remainingAmount} (to be paid at check-in)</span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Payment Details</h3>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-blue-800 font-medium">Secure Payment</span>
                </div>
                <p className="text-blue-600 text-sm mt-1">Your payment is processed securely through Razorpay</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-500">Advance Payment</span>
                  <span className="text-2xl font-bold text-blue-600">${advanceAmount}</span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={paymentLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                data-clickable-element="payment-submit"
                data-element-description="Process payment through Razorpay gateway and complete booking"
              >
                {paymentLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  `Pay $${advanceAmount} Now`
                )}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                You will be redirected to a secure payment gateway
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Payment() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading payment details...</p>
        </div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
