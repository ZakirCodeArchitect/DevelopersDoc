import React from 'react';
import { Section } from '../ui/Section';

interface DeveloperSectionProps {}

export const DeveloperSection: React.FC<DeveloperSectionProps> = () => {
  return (
    <Section className="py-16 md:py-24" maxWidth="full">
      <div className="w-full flex flex-col items-center justify-center">
        {/* Decorative lines and logo container */}
        <div className="relative w-full max-w-4xl flex items-center justify-center mb-8">
          {/* Left decorative line */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-24 md:w-32 h-px bg-gray-300"></div>
          
          {/* Logo - Developer Icon */}
          <div className="relative z-10 w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
            <svg 
              className="w-full h-full text-black" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
              />
            </svg>
          </div>
          
          {/* Right decorative line */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 md:w-32 h-px bg-gray-300"></div>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
          Zakir Matloob
        </h2>

        {/* Tagline */}
        <p className="text-base md:text-lg text-gray-600 mb-8 text-center max-w-2xl">
          Help me craft softwares to counter your problems
        </p>

        {/* CTA Button */}
        <a
          href="mailto:zakirmatloob149@gmail.com"
          className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border-2 border-black text-black font-medium rounded-full hover:bg-black hover:text-white transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
        >
          <svg 
            className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
            />
          </svg>
          <span>email me</span>
        </a>
      </div>
    </Section>
  );
};

