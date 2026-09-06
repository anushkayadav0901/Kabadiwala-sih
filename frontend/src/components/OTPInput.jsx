import React, { useRef, useState } from "react";

export const OTPInput = ({ length = 6, onChangeOTP }) => {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputRefs = useRef([]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(value)) return;

    const newOtp = [...otp];
    // Take last entered digit
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    const combinedOtp = newOtp.join("");
    onChangeOTP(combinedOtp);

    // Auto-focus next input
    if (value && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 w-full">
      {otp.map((digit, index) => (
        <input
          key={index}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          aria-label={`Digit ${index + 1}`}
          ref={(ref) => (inputRefs.current[index] = ref)}
          value={digit}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={`w-[46px] h-14 text-center font-bold text-2xl tnum rounded-xl border-[1.5px] tap
            transition-[border-color,background-color,box-shadow] duration-150 focus:outline-none ${
              digit
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-line bg-surface text-ink focus:border-brand-600 focus:shadow-[0_0_0_3px_var(--color-brand-50)]"
            }`}
        />
      ))}
    </div>
  );
};
