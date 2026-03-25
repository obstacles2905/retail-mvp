'use client';

import React from 'react';

export type PhoneNumberInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
};

export default function PhoneNumberInput({
  value,
  onChange,
  disabled,
  error,
}: PhoneNumberInputProps): JSX.Element {
  return (
    <div>
      <label htmlFor="join-phone" className="block text-sm font-medium text-foreground">
        Номер телефону
      </label>
      <input
        id="join-phone"
        type="tel"
        autoComplete="tel"
        required
        placeholder="+380XXXXXXXXX"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        inputMode="tel"
        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      />
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}

