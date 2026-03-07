import React from 'react';

interface ToastIconProps {
  className?: string;
}

export const ToastIcon: React.FC<ToastIconProps> = ({ className = "h-8 w-8" }) => {
  return (
    <img
      src="/Logo with soft teal and coral digital shield.svg"
      alt="Toast POS"
      className={`${className} rounded-lg`}
    />
  );
};