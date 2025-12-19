import React from 'react';
import { Section } from '../ui/Section';

interface FeaturesProps {
  title?: string;
  description?: string;
}

export const Features: React.FC<FeaturesProps> = () => {
  return (
    <Section className="py-12 md:py-16" maxWidth="full">
      <div className="w-full">
        {/* Top Banner */}
        <div className="text-center mb-12">
          <p className="text-2xl md:text-3xl font-bold text-black relative inline-block">
            Try for free.
            <svg
              className="absolute left-0 bottom-0 w-full"
              height="6"
              viewBox="0 0 100 8"
              preserveAspectRatio="none"
              style={{ transform: 'rotate(-2deg)' }}
            >
              <path
                d="M 5 4 Q 50 1, 95 4"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                className="text-black"
              />
            </svg>
          </p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
          {/* Left Side - Description */}
          <div className="flex flex-col">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              Now you can document your project with your team
            </h2>
            <p className="text-lg text-gray-700">
              and publish your docs too.
            </p>
          </div>

          {/* Right Side - Doc with your team */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col">
              <div className="mb-4">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Doc with your team</h3>
              <p className="text-gray-700 mb-4 text-sm">Share docs via email or collaborate with your team in real-time.</p>
              {/* Email options preview */}
              <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-40 flex flex-col">
                {/* Email header */}
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-semibold text-gray-700">Share via email</span>
                  </div>
                </div>
                
                {/* Recipients */}
                <div className="mb-4 flex-1">
                  <div className="text-xs font-medium text-gray-600 mb-2">To:</div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm">
                      <span>john@example.com</span>
                      <button className="hover:bg-blue-100 rounded-full p-0.5 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm">
                      <span>sarah@example.com</span>
                      <button className="hover:bg-green-100 rounded-full p-0.5 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Add email..." 
                      className="text-xs text-gray-700 border-none bg-transparent outline-none flex-1 min-w-24 placeholder:text-gray-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Send button */}
                <div className="flex justify-end -mt-2">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}>
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
        </div>

        {/* Bottom Footer */}
        <div className="text-center mt-16 text-gray-600">
          <p>
            Developers Doc is always available{' '}
            <a href="#" className="underline hover:text-black transition-colors">in your browser</a>.
          </p>
        </div>
      </div>
    </Section>
  );
};

