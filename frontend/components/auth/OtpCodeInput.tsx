'use client';

import React from 'react';

export type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string | null;
};

function sanitizeCode(input: string): string {
  const digitsOnly = input.replace(/\D/g, '').slice(0, 6);
  return digitsOnly;
}

export default function OtpCodeInput({
  value,
  onChange,
  disabled,
  error,
}: OtpCodeInputProps): JSX.Element {
  return (
    <div>
      <label htmlFor="join-otp-code" className="block text-sm font-medium text-foreground">
        Код підтвердження (6 цифр)
      </label>
      <input
        id="join-otp-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        placeholder="000000"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(sanitizeCode(e.target.value))}
        maxLength={6}
        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      />
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}

