'use client';

import * as React from 'react';
import { Controller } from 'react-hook-form';
import type {
  Control,
  FieldValues,
  Path,
  ControllerRenderProps,
  ControllerFieldState,
} from 'react-hook-form';

interface FormFieldProps<TFormValues extends FieldValues> {
  control: Control<TFormValues>;
  name: Path<TFormValues>;
  render: (props: {
    field: ControllerRenderProps<TFormValues, Path<TFormValues>>;
    fieldState: ControllerFieldState;
  }) => React.ReactNode;
}

const FormFieldContext = React.createContext<{ error?: string } | null>(null);

export function Form({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function FormField<TFormValues extends FieldValues>({
  control,
  name,
  render,
}: FormFieldProps<TFormValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldContext.Provider value={{ error: fieldState.error?.message as string | undefined }}>
          {render({ field, fieldState })}
        </FormFieldContext.Provider>
      )}
    />
  );
}

export function FormItem({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function FormLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`text-sm font-medium text-slate-200 ${className ?? ''}`} {...props} />;
}

export function FormControl({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function FormMessage({ children }: { children?: React.ReactNode }) {
  const field = React.useContext(FormFieldContext);
  const message =
    children || field?.error ? (children ?? field?.error) : null;

  if (!message) {
    return null;
  }

  return <p className="text-sm text-red-500">{message}</p>;
}
