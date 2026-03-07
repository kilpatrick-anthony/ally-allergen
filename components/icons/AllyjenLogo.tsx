import React from "react";

// AllyJen logo as an SVG component (official logo)
const AllyjenLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 375 375"
    fill="none"
    {...props}
  >
    <image href="/AllyJen%20Logo%201702251917.svg" width="375" height="375" />
  </svg>
);

export default AllyjenLogo;
