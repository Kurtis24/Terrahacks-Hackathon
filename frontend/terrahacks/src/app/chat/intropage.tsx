'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './intropage.module.css';

const IntroPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [prevSection, setPrevSection] = useState(0);
  const [hasInitiallyPlayed, setHasInitiallyPlayed] = useState(false);
  const [isInitialPlaying, setIsInitialPlaying] = useState(false);
  const [isSectionPlaying, setIsSectionPlaying] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down');
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [particles, setParticles] = useState<Array<{
    id: number;
    type: 'large' | 'small' | 'glow';
    style: React.CSSProperties;
  }>>([]);
  const [isClient, setIsClient] = useState(false);

  const sections = [
    {
      id: 'hero',
      title: 'NanoWorks',
      subtitle: 'ɛuoMɹoMouɐN',
      description: 'Revolutionizing the future with nanotechnology',
      videoTime: 0
    },
    {
      id: 'why',
      title: 'Why we',
      subtitle: 'built it',
      description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it',
      videoTime: 0.25
    },
    {
      id: 'how',
      title: 'How we',
      subtitle: 'built it',
      description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it',
      videoTime: 0.5
    },
    {
      id: 'tech',
      title: 'Emerging',
      subtitle: 'tech',
      description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it',
      videoTime: 0.75
    },
    {
      id: 'try',
      title: 'Try it out',
      subtitle: '',
      description: 'Experience the future of nanotechnology',
      videoTime: 1.0
    }
  ];

  // Initial video autoplay logic - moved outside to be accessible
  const handleVideoLoad = useCallback(async () => {
    const video = videoRef.current;
    if (!video || hasInitiallyPlayed) return;

    try {
      console.log('Video loaded! Duration:', video.duration);
      console.log('Video source:', video.currentSrc);
      console.log('Video ready state:', video.readyState);
      
      // Start playing the video for 2 seconds, then pause
      if (video.paused) {
        setIsInitialPlaying(true);
        video.currentTime = 0;
        video.playbackRate = 1;
        await video.play();
        console.log('Initial video playing for 2 seconds...');
        
        // After 2 seconds, pause the video
        setTimeout(() => {
          video.pause();
          setIsInitialPlaying(false);
          setHasInitiallyPlayed(true);
          console.log('Initial video paused after 2 seconds');
        }, 2000);
      }

    } catch (error) {
      console.log('Initial video play failed:', error);
      setIsInitialPlaying(false);
      setHasInitiallyPlayed(true);
    }
  }, [hasInitiallyPlayed]);

  // Handle section changes with fade effects and video play
  const handleSectionChange = useCallback(async (newSection: number, direction: 'up' | 'down') => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setPrevSection(currentSection);
    setCurrentSection(newSection);
    
    const video = videoRef.current;
    if (!video) {
      setIsTransitioning(false);
      return;
    }
    
    try {
      // Start section transition with fade and video play
      setIsSectionPlaying(true);
      
      // Set video to section start time
      const sectionProgress = newSection / (sections.length - 1);
      const sectionStartTime = sectionProgress * video.duration;
      video.currentTime = sectionStartTime;
      video.playbackRate = 1;
      
      // Play video for 2 seconds
      await video.play();
      console.log(`Section ${newSection}: Playing video for 2 seconds`);
      
      // After 2 seconds, pause and enable scroll control
      setTimeout(() => {
        video.pause();
        setIsSectionPlaying(false);
        setIsTransitioning(false);
        console.log(`Section ${newSection}: Video paused, scroll control enabled`);
      }, 2000);
      
    } catch (error) {
      console.log('Section video play failed:', error);
      setIsSectionPlaying(false);
      setIsTransitioning(false);
    }
  }, [isTransitioning, currentSection, sections.length]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || !videoRef.current) return;

      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      
      // Detect scroll direction
      const direction = scrollTop > lastScrollY ? 'down' : 'up';
      setScrollDirection(direction);
      setLastScrollY(scrollTop);
      
      // Calculate scroll progress (0 to 1)
      const scrollProgress = Math.min(scrollTop / documentHeight, 1);
      
      // Determine current section
      const sectionIndex = Math.floor(scrollProgress * sections.length);
      const newSection = Math.min(sectionIndex, sections.length - 1);
      
      // Check if section changed
      if (newSection !== currentSection && !isTransitioning) {
        handleSectionChange(newSection, direction);
      }
      
      // Map scroll progress to video duration with directional control
      const video = videoRef.current;
      if (video.duration && !isSectionPlaying && !isInitialPlaying) {
        const targetTime = scrollProgress * video.duration;
        
        // Set video time based on scroll position
        video.currentTime = targetTime;
        
        if (direction === 'down') {
          // Normal forward playback
          if (video.paused) {
            video.play().catch(e => console.log('Auto-play prevented:', e));
          }
          video.playbackRate = 1;
        } else {
          // For reverse scroll, we'll use a more reliable approach
          // Keep the video paused and just update currentTime
          video.pause();
          // The currentTime is already set above based on scroll position
          // This gives the effect of reverse playback by scrubbing backwards
        }
      }
    };

    // Set up video event listeners
    const video = videoRef.current;
    if (video) {
      console.log('Setting up video event listeners...');
      video.addEventListener('loadedmetadata', handleVideoLoad);
      video.addEventListener('canplay', handleVideoLoad);
      video.addEventListener('error', (e) => {
        console.error('Video error:', e);
        console.error('Video error details:', video.error);
      });
      video.addEventListener('loadstart', () => console.log('Video load started'));
      video.addEventListener('loadeddata', () => console.log('Video data loaded'));
    }

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (video) {
        video.removeEventListener('loadedmetadata', handleVideoLoad);
        video.removeEventListener('canplay', handleVideoLoad);
      }
    };
  }, [hasInitiallyPlayed, isInitialPlaying, currentSection, lastScrollY, isTransitioning, isSectionPlaying, handleVideoLoad, handleSectionChange]);

  // Client-side only flag to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // User interaction fallback for autoplay restrictions
  useEffect(() => {
    if (!isClient) return;
    
    const handleUserInteraction = () => {
      const video = videoRef.current;
      if (video && !hasInitiallyPlayed) {
        handleVideoLoad();
      }
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    // Also try to load video immediately
    const video = videoRef.current;
    if (video && video.readyState >= 1) {
      handleVideoLoad();
    }
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [isClient, hasInitiallyPlayed, handleVideoLoad]);

  // Generate particles only on client side
  useEffect(() => {
    if (!isClient) return;

    const generateParticles = () => {
      const newParticles = [];
      
      // Large floating particles (30 total)
      for (let i = 0; i < 30; i++) {
        newParticles.push({
          id: i,
          type: 'large' as const,
          style: {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${4 + Math.random() * 8}px`,
            height: `${4 + Math.random() * 8}px`,
            animationDelay: `${Math.random() * 6}s`,
            animationDuration: `${4 + Math.random() * 4}s`
          }
        });
      }

      // Small twinkling particles (80 total)
      for (let i = 30; i < 110; i++) {
        newParticles.push({
          id: i,
          type: 'small' as const,
          style: {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${1 + Math.random() * 3}px`,
            height: `${1 + Math.random() * 3}px`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${1 + Math.random() * 3}s`,
            opacity: Math.random() * 0.8 + 0.2
          }
        });
      }

      // Glowing orbs (15 total)
      for (let i = 110; i < 125; i++) {
        newParticles.push({
          id: i,
          type: 'glow' as const,
          style: {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${8 + Math.random() * 16}px`,
            height: `${8 + Math.random() * 16}px`,
            background: `radial-gradient(circle, rgba(59, 130, 246, ${0.3 + Math.random() * 0.5}) 0%, transparent 70%)`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${3 + Math.random() * 3}s`
          }
        });
      }

      setParticles(newParticles);
    };

    generateParticles();
  }, [isClient]);

  return (
    <div ref={containerRef} className="relative">
      {/* Fixed Video Background */}
      <div className="fixed inset-0 w-full h-full z-[-1]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
          loop
          controls={false}
        >
          {/* Your background video */}
          <source src="/background-video.mp4" type="video/mp4" />
          {/* Fallback for browsers that don't support video */}
        </video>
        
        {/* Light overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-15" />
        
        {/* Video Playing Indicators */}
        {(isInitialPlaying || isSectionPlaying) && (
          <div className={`absolute top-8 left-8 z-20 ${styles.initialPlayIndicator}`}>
            <div className="flex items-center space-x-3 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">
                {isInitialPlaying ? 'Starting...' : 'Section Playing...'}
              </span>
              <div className="w-8 h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-red-500 rounded-full ${styles.progressBarFill}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section Transition Indicator */}
        {isTransitioning && (
          <div className={`absolute top-20 left-8 z-20 ${styles.videoPlayingIndicator}`}>
            <div className="flex items-center space-x-2 text-white/80 text-sm">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
              <span>Section {currentSection + 1}</span>
            </div>
          </div>
        )}
        
        {/* Scroll Control Available Indicator */}
        {hasInitiallyPlayed && !isInitialPlaying && currentSection === 0 && (
          <div className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 ${styles.scrollIndicator} ${styles.enhancedBounce}`}>
            <div className="flex flex-col items-center space-y-2 text-white/80">
              <div className="text-sm">Scroll to explore</div>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
                <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
              </div>
              <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="relative z-10">
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={`section-${index}`}
            className={`min-h-screen flex items-center justify-start px-8 md:px-16 lg:px-24 relative ${styles.sectionSnap} ${
              currentSection === index 
                ? styles.sectionFadeIn 
                : currentSection !== prevSection && prevSection === index
                ? styles.sectionFadeOut
                : ''
            }`}
          >
            {/* Section background overlay for better text contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
            
            <div className="max-w-3xl text-white relative z-10">
              {/* Section Content */}
              <div className={`transition-all duration-1000 ${
                currentSection === index 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-70 translate-y-10'
              }`}>
                {/* Title */}
                <h1 className={`font-bold mb-4 ${styles.textGlow} ${
                  section.id === 'hero' 
                    ? 'text-6xl md:text-8xl lg:text-9xl' 
                    : 'text-4xl md:text-6xl lg:text-7xl'
                }`}>
                  {section.title}
                </h1>
                
                {/* Subtitle */}
                {section.subtitle && (
                  <h2 className={`font-light mb-8 opacity-70 ${
                    section.id === 'hero' 
                      ? 'text-4xl md:text-6xl lg:text-7xl' 
                      : 'text-2xl md:text-4xl lg:text-5xl'
                  }`}>
                    {section.subtitle}
                  </h2>
                )}

                {/* Description */}
                <p className="text-lg md:text-xl leading-relaxed max-w-2xl opacity-90 mb-8">
                  {section.description}
                </p>

                {/* Special elements for specific sections */}
                {section.id === 'hero' && (
                  <div className="mt-12">
                    <div className="flex items-center space-x-6">
                      <div className={`w-4 h-4 bg-blue-400 rounded-full ${styles.customPulse}`} />
                      <div className={`w-3 h-3 bg-blue-300 rounded-full ${styles.customPulse} ${styles.animationDelay200}`} />
                      <div className={`w-5 h-5 bg-blue-500 rounded-full ${styles.customPulse} ${styles.animationDelay400}`} />
                      <div className={`w-2 h-2 bg-blue-200 rounded-full ${styles.customPulse} ${styles.animationDelay600}`} />
                    </div>
                  </div>
                )}

                {section.id === 'why' && (
                  <div className="mt-8">
                    <div className="w-16 h-1 bg-blue-400 rounded-full" />
                  </div>
                )}

                {section.id === 'how' && (
                  <div className="mt-8">
                    <div className="flex space-x-2">
                      <div className="w-8 h-1 bg-blue-400 rounded-full" />
                      <div className="w-12 h-1 bg-blue-300 rounded-full" />
                      <div className="w-6 h-1 bg-blue-500 rounded-full" />
                    </div>
                  </div>
                )}

                {section.id === 'tech' && (
                  <div className="mt-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 border-2 border-blue-400 rounded-full animate-spin" />
                      <div className="text-blue-400 text-sm font-mono">PROCESSING...</div>
                    </div>
                  </div>
                )}

                {section.id === 'try' && (
                  <div className="mt-12 space-y-6">
                    <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-12 py-4 rounded-full text-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                      Get Started
                    </button>
                    <div className="text-sm opacity-60">
                      Experience the future of nanotechnology
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress indicator */}
            <div className="absolute right-8 top-1/2 transform -translate-y-1/2 hidden md:block">
              <div className="flex flex-col space-y-4">
                {sections.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-12 rounded-full transition-all duration-500 ${styles.progressBar} ${
                      i === currentSection 
                        ? `bg-blue-400 ${styles.active}` 
                        : 'bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Section number indicator */}
            <div className="absolute top-8 right-8 text-white/50 font-mono text-sm">
              {String(index + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}
            </div>
          </section>
        ))}
      </div>

      {/* Enhanced Particle Effects - Client Side Only */}
      {isClient && (
        <div className={`${styles.particles}`}>
          {particles.map((particle) => (
            <div
              key={particle.id}
              className={`absolute ${
                particle.type === 'large' 
                  ? `${styles.particle} ${styles.float}`
                  : particle.type === 'small' 
                    ? 'bg-blue-300 rounded-full animate-pulse' 
                    : `rounded-full ${styles.customPulse}`
              }`}
              style={particle.style}
            />
          ))}
        </div>
      )}

      {/* Mobile Navigation Dots */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20 md:hidden">
        <div className="flex space-x-3">
          {sections.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const element = document.getElementById(`section-${i}`);
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i === currentSection 
                  ? 'bg-blue-400 scale-125' 
                  : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default IntroPage;
