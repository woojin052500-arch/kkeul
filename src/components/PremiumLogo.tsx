import React from 'react';
import logoImg from '../assets/logo.png';

interface PremiumLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export const PremiumLogo: React.FC<PremiumLogoProps> = ({ size = 'md' }) => {
  // Map sizes to height
  const logoHeight = size === 'sm' ? '40px' : size === 'md' ? '90px' : '150px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <img 
        src={logoImg} 
        alt="끌(Kkeul) 로고" 
        style={{ 
          height: logoHeight, 
          width: 'auto',
          objectFit: 'contain',
          display: 'block'
        }} 
      />
    </div>
  );
};
