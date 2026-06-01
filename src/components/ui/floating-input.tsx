"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FloatingInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  error?: string;
}

export function FloatingInput({ label, error, type = "text", id, ...props }: FloatingInputProps) {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPass ? "text" : type;
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={`field-float ${error ? "field-float--error" : ""}`}>
      <input
        id={inputId}
        type={inputType}
        placeholder=" "
        className="field-float__input"
        {...props}
      />
      <label className="field-float__label" htmlFor={inputId}>
        {label}
      </label>
      {isPassword && (
        <button
          type="button"
          className="field-float__toggle"
          onClick={() => setShowPass(v => !v)}
          tabIndex={-1}
          aria-label={showPass ? "Hide password" : "Show password"}
        >
          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
      {error && <span className="field-float__error">{error}</span>}
    </div>
  );
}
