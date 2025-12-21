"use client"

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Container } from '../ui/Container';
import { Input } from '../ui/input';

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

interface SocialLink {
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface HeaderProps {
  logo?: React.ReactNode;
  logoText?: string;
  navLinks?: NavLink[];
  searchPlaceholder?: string;
  socialLinks?: SocialLink[];
}

export const Header: React.FC<HeaderProps> = ({
  logo,
  logoText = 'Developers Doc',
  navLinks = [],
  searchPlaceholder = 'Search documentation...',
  socialLinks,
}) => {
  const defaultSocialLinks: SocialLink[] = [
    {
      name: 'GitHub',
      href: 'https://github.com/ZakirCodeArchitect',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.532 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      name: 'LinkedIn',
      href: 'https://www.linkedin.com/in/zakirmatloob152/',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
    },
  ];

  const socials = socialLinks || defaultSocialLinks;
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Command+K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md shadow-sm" style={{ fontFamily: 'var(--font-open-sans), sans-serif' }}>
      <div className="flex h-16 items-center justify-between">
        {/* Logo - positioned at absolute left edge */}
        <div className="flex items-center flex-shrink-0 pl-4 sm:pl-6 lg:pl-8 min-w-0">
          {logo || (
            <Link href="/" className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt={logoText}
                className="h-8 w-auto"
              />
              <span className="text-lg font-normal text-black" style={{ fontFamily: 'var(--font-open-sans), sans-serif' }}>
                {logoText}
              </span>
            </Link>
          )}
        </div>

        {/* Right side: Nav, Search, Social - positioned at absolute right edge */}
        <div className="flex items-center gap-6 pr-4 sm:pr-6 lg:pr-8">
          {/* Navigation Links */}
          {navLinks.length > 0 && (
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                  className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {link.label}
                  {link.external && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                </Link>
              ))}
            </nav>
          )}

          {/* Search Input */}
          <div className="relative hidden md:block">
            <Input
              ref={searchInputRef}
              type="search"
              placeholder={searchPlaceholder}
              className="w-64 h-9 bg-background border border-blue-200/60 text-sm text-foreground placeholder:text-muted-foreground pr-20 focus:border-blue-400 focus:ring-2 focus:ring-blue-200/40 focus:ring-offset-0 focus-visible:outline-none transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs pointer-events-none">
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-gray-300/60 bg-white px-1.5 font-mono text-[10px] font-normal text-gray-700 shadow-sm">
                ⌘ K
              </kbd>
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            {socials.map((social) => (
              <Link
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/70 hover:text-foreground transition-colors"
                aria-label={social.name}
              >
                {social.icon}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
