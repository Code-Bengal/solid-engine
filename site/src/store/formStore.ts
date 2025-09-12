import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Form values interface
 */
interface FormValues {
  name: string;
  email: string;
  message?: string;
}

/**
 * Form store interface
 */
interface FormStore {
  values: FormValues;
  setValues: (partial: Partial<FormValues>) => void;
  setValue: (key: keyof FormValues, value: string) => void;
  reset: () => void;
  isFormFilled: boolean;
}

/**
 * Default form values
 */
const defaultValues: FormValues = {
  name: '',
  email: '',
  message: '',
};

/**
 * Zustand store for managing form state
 * Supports partial updates and full reset
 */
export const useFormStore = create<FormStore>()(
  devtools(
    (set, get) => ({
      values: defaultValues,
      
      /**
       * Update multiple form values at once
       */
      setValues: (partial: Partial<FormValues>) =>
        set(
          (state) => ({
            values: { ...state.values, ...partial },
          }),
          false,
          'setValues'
        ),

      /**
       * Update a single form value
       */
      setValue: (key: keyof FormValues, value: string) =>
        set(
          (state) => ({
            values: { ...state.values, [key]: value },
          }),
          false,
          `setValue:${key}`
        ),

      /**
       * Reset form to default values
       */
      reset: () =>
        set(
          { values: defaultValues },
          false,
          'reset'
        ),

      /**
       * Computed property to check if form has any filled values
       */
      get isFormFilled() {
        const { values } = get();
        return !!(values.name || values.email || values.message);
      },
    }),
    {
      name: 'form-store',
      // Only enable devtools in development
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

/**
 * Selector hooks for specific form values
 */
export const useFormValues = () => useFormStore((state) => state.values);
export const useFormActions = () => useFormStore((state) => ({
  setValues: state.setValues,
  setValue: state.setValue,
  reset: state.reset,
}));
export const useIsFormFilled = () => useFormStore((state) => state.isFormFilled);
