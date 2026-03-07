import React from 'react';

interface DeliverooIconProps {
  className?: string;
}

export const DeliverooIcon: React.FC<DeliverooIconProps> = ({ className = "h-8 w-8" }) => {
  return (
    <img
      src="/Logo with soft teal and coral digital shield (1).svg"
      alt="Deliveroo"
      className={`${className} rounded-lg`}
    />
  );
};