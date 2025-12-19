
import React from 'react';
import Link from 'next/link';
import { Container } from '../ui/Container';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface FooterProps {
  logo?: React.ReactNode;
  logoText?: string;
  slogan?: string;
  columns?: FooterColumn[];
  copyright?: string;
}

export const Footer: React.FC<FooterProps> = ({
  logo,
  logoText = 'Developers Doc',
  slogan,
  columns = [],
  copyright,
}) => {
  const currentYear = new Date().getFullYear();
  
  const defaultColumns: FooterColumn[] = [
    {
      title: 'Platform',
      links: [
        { label: 'Sign In', href: '#signin' },
        { label: 'Security', href: '#security' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Contact Support', href: 'mailto:zakirmatloob149@gmail.com' },
        { label: 'Documentation', href: '#docs' },
      ],
    },
  ];

  const footerColumns = columns.length > 0 ? columns : defaultColumns;

  return (
    <footer className="bg-gray-50/50 relative pt-px" style={{ fontFamily: 'var(--font-open-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Glowing border above footer */}
      <div className="absolute top-0 left-0 right-0 h-px bg-[#CC561E] opacity-60 blur-sm"></div>
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#CC561E] opacity-40"></div>
      <div className="py-12 md:py-16">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12">
          {/* Left Side - Brand and Navigation (medium screens) */}
          <div className="pl-16 sm:pl-20 lg:pl-24 flex flex-col gap-8 w-full lg:w-auto">
            {/* Brand Column */}
            <div className="flex-shrink-0">
              {logo || (
                <div className="mb-2">
                  <div className="text-2xl font-semibold" style={{ color: '#CC561E', fontFamily: 'var(--font-open-sans), sans-serif' }}>
                    {logoText}
                  </div>
                </div>
              )}
              {slogan && (
                <p className="text-sm text-foreground/70 mt-1">{slogan}</p>
              )}
            </div>

            {/* Navigation Columns - Aligned with brand (medium screens only) */}
            <div className="hidden md:flex lg:hidden flex-row gap-12 items-start">
              {footerColumns.map((column, columnIndex) => (
                <div key={columnIndex} className="flex-shrink-0">
                  <h3 className="font-semibold mb-4 text-foreground text-sm whitespace-nowrap">{column.title}</h3>
                  <ul className="space-y-2">
                    {column.links.map((link, linkIndex) => (
                      <li key={`${columnIndex}-${linkIndex}-${link.label}`}>
                        <Link
                          href={link.href}
                          className="text-sm text-foreground/70 hover:text-foreground transition-colors font-normal"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Columns - Right side (large screens only) */}
          <div className="hidden lg:flex flex-row gap-12 pr-16 sm:pr-20 lg:pr-24 items-start">
            {footerColumns.map((column, columnIndex) => (
              <div key={columnIndex} className="flex-shrink-0">
                <h3 className="font-semibold mb-4 text-foreground text-sm whitespace-nowrap">{column.title}</h3>
                <ul className="space-y-2">
                  {column.links.map((link, linkIndex) => (
                    <li key={`${columnIndex}-${linkIndex}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="text-sm text-foreground/70 hover:text-foreground transition-colors font-normal"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8">
          {/* Border line - aligned with content width with glowing effect */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 relative">
            <div className="pl-16 sm:pl-20 lg:pl-24"></div>
            <div className="flex-1 relative overflow-visible">
              {/* Glowing border layers - extended slightly on both sides */}
              <div className="absolute top-0 -left-4 -right-4 h-px bg-[#CC561E] opacity-60 blur-sm"></div>
              <div className="absolute top-0 -left-4 -right-4 h-[1px] bg-[#CC561E] opacity-40"></div>
              <div className="pt-px"></div>
            </div>
            <div className="pr-16 sm:pr-20 lg:pr-24"></div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright - Left Edge */}
            <div className="pl-16 sm:pl-20 lg:pl-24">
              <p className="text-sm text-foreground/70">
                {copyright || `© ${currentYear} ${logoText}. All rights reserved`}
              </p>
            </div>
            {/* About Developer Link - Right Edge */}
            <div className="pr-16 sm:pr-20 lg:pr-24">
              <Link
                href="https://www.linkedin.com/in/zakirmatloob152/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-foreground/70 hover:text-foreground transition-colors font-normal"
              >
                about developer →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
