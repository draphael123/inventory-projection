import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', hover = false, glow = false, style }: CardProps) {
  return (
    <div
      style={style}
      className={`
        bg-[var(--color-surface)] 
        border border-[var(--color-border)] 
        rounded-xl 
        ${hover ? 'hover:border-primary-500/50 hover:shadow-glow transition-all duration-300' : ''}
        ${glow ? 'shadow-glow animate-pulse-glow' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-5 py-4 border-b border-[var(--color-border)] ${className}`}>
      {children}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`p-5 ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-semibold text-[var(--color-text)] ${className}`}>
      {children}
    </h3>
  );
}

