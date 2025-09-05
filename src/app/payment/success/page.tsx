"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');

  const paymentId = searchParams.get('payment_id');
  const orderId = searchParams.get('order_id');
  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    if (!paymentId || !orderId || !bookingId) {
      router.push('/booking');
      return;
    }

    verifyPayment();
  }, [paymentId, orderId, bookingId, router]);

  const verifyPayment = async () => {
    try {
      const signature = searchParams.get('razorpay_signature') || '';

      // For test environment, we can skip signature verification if not provided
      if (!signature && process.env.NODE_ENV === 'development') {
        console.log('Skipping signature verification in development mode');
        setVerifying(false);
        return;
      }

      const response = await fetch('/api/payments/verify', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          booking_id: bookingId,
        }),
      });

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      // Payment verified successfully
      setVerifying(false);
    } catch (error) {
      console.error('Error verifying payment:', error);
      setError('Payment verification failed. Please contact support.');
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/booking"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Booking
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">
          Your booking has been confirmed and payment has been processed successfully.
        </p>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Payment ID:</span>
              <span className="font-mono text-gray-500">{paymentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-mono text-gray-500">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Booking ID:</span>
              <span className="font-mono text-gray-500">{bookingId}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Payment Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Advance Payment (25%):</span>
              <span className="font-semibold text-blue-900">${Math.round(100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Total Booking Amount:</span>
              <span className="font-semibold text-blue-900">${400}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Remaining Amount (75%):</span>
              <span className="font-semibold text-blue-900">${300}</span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3">
            * Remaining amount to be paid at check-in
          </p>
        </div>

        <div className="space-y-3 print:hidden">
          <Link
            href="/rooms"
            className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Book Another Room
          </Link>
          <button
            onClick={() => window.print()}
            className="block w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Print Receipt
          </button>
          <Link
            href="/"
            className="block w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          A confirmation email has been sent to your registered email address.
        </p>

        <style jsx>{`
          @media print {
            .print\\:hidden {
              display: none !important;
            }
            body {
              background: white !important;
            }
            .max-w-md {
              max-width: none !important;
              margin: 0 !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
