import { Header } from '@/components/sections/Header';
import { Hero } from '@/components/sections/Hero';
import { Features } from '@/components/sections/Features';
import { DeveloperSection } from '@/components/sections/DeveloperSection';
import { Footer } from '@/components/sections/Footer';

export default function Home() {
  // Navigation links for header
  const navLinks = [
    { label: 'About', href: '#about' },
    { label: 'Contact', href: 'mailto:zakirmatloob149@gmail.com', external: true },
  ];

  // Features data
  const features = [
    {
      title: 'Easy to Use',
      description: 'Get started quickly with our intuitive interface and comprehensive documentation.',
      icon: '🚀',
    },
    {
      title: 'Powerful Features',
      description: 'Access all the tools you need to build amazing applications with ease.',
      icon: '⚡',
    },
    {
      title: 'Developer Friendly',
      description: 'Built by developers, for developers. Clean code and best practices.',
      icon: '💻',
    },
  ];

  // Footer columns
  const footerColumns = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Documentation', href: '#docs' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '#about' },
        { label: 'Blog', href: '#blog' },
        { label: 'Contact', href: '#contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy', href: '#privacy' },
        { label: 'Terms', href: '#terms' },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        logoText="Developers Doc"
        navLinks={navLinks}
      />
      
      <main className="flex-1">
        <Hero
          title="Build Amazing Developer Documentation"
          description="Create beautiful, comprehensive documentation for your projects. Everything you need to help developers understand and use your tools."
          primaryCta={{
            text: 'Get Started',
            href: '#get-started',
          }}
          secondaryCta={{
            text: 'View Documentation',
            href: '#docs',
          }}
        />
        
        <Features />
        
        <DeveloperSection />
      </main>
      
      <Footer
        logoText="Developers Doc"
        slogan="Building the best developer documentation tools for modern teams."
      />
    </div>
  );
}
