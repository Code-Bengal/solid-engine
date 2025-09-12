import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Booking form values interface matching the booking API structure
 */
interface BookingFormValues {
  room_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  check_in_date: string;
  check_out_date: string;
  guests: string; // Keep as string to match form inputs
  special_requests: string;
}

/**
 * Booking form store interface
 */
interface BookingFormStore {
  values: BookingFormValues;
  setValues: (partial: Partial<BookingFormValues>) => void;
  setValue: (key: keyof BookingFormValues, value: string) => void;
  reset: () => void;
  isFormFilled: boolean;
}

/**
 * Default booking form values
 */
const defaultValues: BookingFormValues = {
  room_id: '',
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  check_in_date: '',
  check_out_date: '',
  guests: '1',
  special_requests: '',
};

/**
 * Zustand store for managing booking form state
 * Used to manage form values that can be populated via MCP Socket.IO events
 */
export const useBookingFormStore = create<BookingFormStore>()(
  devtools(
    (set, get) => ({
      values: defaultValues,
      
      /**
       * Update multiple booking form values at once
       */
      setValues: (partial: Partial<BookingFormValues>) =>
        set(
          (state) => ({
            values: { ...state.values, ...partial },
          }),
          false,
          'setBookingValues'
        ),

      /**
       * Update a single booking form value
       */
      setValue: (key: keyof BookingFormValues, value: string) =>
        set(
          (state) => ({
            values: { ...state.values, [key]: value },
          }),
          false,
          `setBookingValue:${key}`
        ),

      /**
       * Reset booking form to default values
       */
      reset: () =>
        set(
          { values: defaultValues },
          false,
          'resetBooking'
        ),

      /**
       * Computed property to check if booking form has any filled values
       */
      get isFormFilled() {
        const { values } = get();
        return !!(
          values.customer_name || 
          values.customer_email || 
          values.customer_phone ||
          values.check_in_date ||
          values.check_out_date
        );
      },
    }),
    {
      name: 'booking-form-store',
      // Only enable devtools in development
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/**
 * Selector hooks for specific booking form values
 */
export const useBookingFormValues = () => useBookingFormStore((state) => state.values);
export const useBookingFormActions = () => useBookingFormStore((state) => ({
  setValues: state.setValues,
  setValue: state.setValue,
  reset: state.reset,
}));
export const useIsBookingFormFilled = () => useBookingFormStore((state) => state.isFormFilled);
