'use client';

import Image from 'next/image';

interface QuizyLogoIconProps {
  className?: string;
  size?: number;
}

/**
 * QuizyLogo – Target/bullseye icon used as the brand logo.
 * Uses the exact logo-icon.png provided by the user.
 * No wrappers, no borders — just the raw logo image.
 */
export function QuizyLogoIcon({ className = 'w-8 h-8', size }: QuizyLogoIconProps) {
  return (
    <Image
      src="/images/logo-icon.png"
      alt="Quizy"
      width={size || 48}
      height={size || 48}
      className={className}
      style={{ objectFit: 'contain' }}
      priority
      unoptimized
    />
  );
}
