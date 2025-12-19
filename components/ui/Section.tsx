import React from 'react';
import { Container } from './Container';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export const Section: React.FC<SectionProps> = ({
  children,
  className = '',
  containerClassName = '',
  maxWidth = 'xl',
}) => {
  return (
    <section className={className}>
      <Container maxWidth={maxWidth} className={containerClassName}>
        {children}
      </Container>
    </section>
  );
};

