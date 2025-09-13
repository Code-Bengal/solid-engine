"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { differenceInDays } from "date-fns";
import Image from "next/image";
import { StyledInput, StyledSelect, StyledTextarea } from "@/components/FormComponents";
import { useBookingFormStore } from "@/store/bookingFormStore";

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

function BookingForm() {
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  
  // Get form data from store (populated by MCP events)
  const { values: storeFormData, setValues } = useBookingFormStore();
  
  // Local form state (synced with store)
  const [formData, setFormData] = useState({
    room_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    check_in_date: '',
    check_out_date: '',
    guests: '1',
    special_requests: ''
  });

  // Sync store data with local form state
  useEffect(() => {
    setFormData(storeFormData);
  }, [storeFormData]);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch('/api/rooms');
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
        const roomId = searchParams.get('room') || storeFormData.room_id;
        if (roomId) {
          const room = data.find((r: Room) => r.id === roomId);
          if (room) {
            setSelectedRoom(room);
            setFormData(prev => ({ ...prev, room_id: roomId }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  }, [searchParams, storeFormData.room_id]);

  const calculateTotalPrice = useCallback(() => {
    const room = rooms.find(r => r.id === formData.room_id);
    if (room && formData.check_in_date && formData.check_out_date) {
      const checkIn = new Date(formData.check_in_date);
      const checkOut = new Date(formData.check_out_date);
      const nights = differenceInDays(checkOut, checkIn);
      if (nights > 0) {
        setTotalPrice(room.price * nights);
      }
    }
  }, [rooms, formData.room_id, formData.check_in_date, formData.check_out_date]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (formData.room_id && formData.check_in_date && formData.check_out_date) {
      calculateTotalPrice();
    }
  }, [formData.room_id, formData.check_in_date, formData.check_out_date, calculateTotalPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Redirect to payment page with booking ID
        window.location.href = `/payment?booking_id=${data.booking_id}`;
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create booking');
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: value
    };
    
    // Update local state
    setFormData(updatedFormData);
    
    // Update store to keep it in sync
    setValues(updatedFormData);

    if (name === 'room_id') {
      const room = rooms.find(r => r.id === value);
      setSelectedRoom(room || null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Booking Form */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Book Your Stay</h2>
            <p className="text-xl text-gray-600">Complete your reservation with ease</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Selected Room Preview */}
            {selectedRoom && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Selected Room</h3>
                  <div className="space-y-4">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden">
                      {selectedRoom.image_url && (
                        <Image
                          src={selectedRoom.image_url}
                          alt={selectedRoom.name}
                          className="w-full h-full object-cover"
                          width={500}
                          height={300}
                        />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{selectedRoom.name}</h4>
                      <p className="text-gray-600">{selectedRoom.type}</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">${selectedRoom.price}/night</p>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {selectedRoom.capacity} guests
                    </div>
                    {totalPrice > 0 && (
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center text-lg font-semibold">
                          <span>Total Price:</span>
                          <span className="text-blue-600">${totalPrice}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Booking Form */}
            <div className={`${selectedRoom ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <div className="bg-white rounded-2xl shadow-lg p-8">
                {success && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {success}
                    </div>
                  </div>
                )}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Room Selection */}
                  <StyledSelect
                    label="Select Room"
                    name="room_id"
                    required
                    value={formData.room_id}
                    onChange={handleChange}
                    options={[
                      { value: "", label: "Choose a room" },
                      ...rooms.filter(room => room.available).map((room) => ({
                        value: room.id,
                        label: `${room.name} - ${room.type} - $${room.price}/night`
                      }))
                    ]}
                  />

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StyledInput
                      label="Check-in Date"
                      type="date"
                      name="check_in_date"
                      required
                      value={formData.check_in_date}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      placeholder="Select check-in date"
                      data-input-element="booking-checkin-date"
                      data-element-description="Hotel reservation check-in date for room availability and booking confirmation."
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      }
                    />
                    <StyledInput
                      label="Check-out Date"
                      type="date"
                      name="check_out_date"
                      required
                      value={formData.check_out_date}
                      onChange={handleChange}
                      min={formData.check_in_date || new Date().toISOString().split('T')[0]}
                      placeholder="Select check-out date"
                      data-input-element="booking-checkout-date"
                      data-element-description="Hotel reservation check-out date for calculating stay duration and total cost."
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Guest Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StyledSelect
                      label="Number of Guests"
                      name="guests"
                      value={formData.guests}
                      onChange={handleChange}
                      options={[
                        { value: "1", label: "1 Guest" },
                        { value: "2", label: "2 Guests" },
                        { value: "3", label: "3 Guests" },
                        { value: "4", label: "4 Guests" }
                      ]}
                    />
                    <StyledInput
                      label="Full Name"
                      type="text"
                      name="customer_name"
                      required
                      value={formData.customer_name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      data-input-element="booking-customer-name"
                      data-element-description="Guest's full name for hotel registration and booking identification."
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <StyledInput
                      label="Email Address"
                      type="email"
                      name="customer_email"
                      required
                      value={formData.customer_email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      data-input-element="booking-customer-email"
                      data-element-description="Guest's email address for booking confirmation and communication."
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      }
                    />
                    <StyledInput
                      label="Phone Number"
                      type="tel"
                      name="customer_phone"
                      required
                      value={formData.customer_phone}
                      onChange={handleChange}
                      placeholder="Enter your phone number"
                      data-input-element="booking-customer-phone"
                      data-element-description="Guest's contact phone number for booking updates and emergency communication."
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Special Requests */}
                  <StyledTextarea
                    label="Special Requests (Optional)"
                    name="special_requests"
                    value={formData.special_requests}
                    onChange={handleChange}
                    placeholder="Any special requests or notes..."
                    rows={4}
                  />

                  {/* Submit Button */}
                  <div className="flex justify-end pt-6">
                    <button
                      type="submit"
                      disabled={loading || !selectedRoom}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                      data-clickable-element="booking-submit"
                      data-element-description="Submit booking form and proceed to payment page"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Creating Booking...
                        </div>
                      ) : (
                        'Confirm Booking'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Main component
function BookingPageContent() {
  return <BookingForm />;
}

export default function Booking() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading booking form...</p>
        </div>
      </div>
    }>
      <BookingPageContent />
    </Suspense>
  );
}
