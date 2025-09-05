"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PaymentFailed() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-4">Payment Failed</h2>
        <p className="text-gray-600 mb-6">
          We're sorry, but your payment could not be processed.
        </p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Possible Reasons:</h3>
          <ul className="text-red-700 text-sm space-y-1">
            <li>• Insufficient funds in your account</li>
            <li>• Invalid card details</li>
            <li>• Network connectivity issues</li>
            <li>• Payment gateway timeout</li>
            <li>• Bank security restrictions</li>
          </ul>

          {errorCode && (
            <div className="mt-3 pt-3 border-t border-red-200">
              <p className="text-xs text-red-600">
                <strong>Error Code:</strong> {errorCode}
              </p>
              {errorDescription && (
                <p className="text-xs text-red-600 mt-1">
                  <strong>Description:</strong> {errorDescription}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Link
            href="/booking"
            className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Try Again
          </Link>
          <Link
            href="/rooms"
            className="block w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Browse Other Rooms
          </Link>
          <Link
            href="/"
            className="block w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Need help? Contact our support team at{" "}
          <a href="mailto:support@hoteldemo.com" className="text-blue-600 hover:underline">
            support@hoteldemo.com
          </a>
        </p>
      </div>
    </div>
  );
}
