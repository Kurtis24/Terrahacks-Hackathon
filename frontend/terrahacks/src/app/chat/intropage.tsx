/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./intropage.module.css";

const IntroPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [hasInitiallyPlayed, setHasInitiallyPlayed] = useState(false);
  const [isInitialPlaying, setIsInitialPlaying] = useState(false);
  const [isIn3SecondPlay, setIsIn3SecondPlay] = useState(false);
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      type: "large" | "small" | "glow";
      style: React.CSSProperties;
    }>
  >([]);
  const [isClient, setIsClient] = useState(false);
  const [prevSection, setPrevSection] = useState(0);
  const [shouldRotate, setShouldRotate] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const router = useRouter();

  const sections = [
    {
      id: "hero",
      title: "NanoWorks",
      description:
        "Utilizing the power of AI to create and innovate at the nanoscopic level",
      videoTime: 0.1,
    },
    {
      id: "why",
      title: "Inspiration",
      subtitle: "The world’s smallest Nerf gun",
      description:
        'This distinctive art form, awaiting its canvas, draws inspiration from Mark Rober’s  "world’s smallest Nerf gun." Pioneered in 2016, we strive to increase its visibility and make it accessible for the next wave of biotech AI innovations.',
      videoTime: 0.33,
    },
    {
      id: "how",
      title: "How we",
      subtitle: "built it",
      description:
        "Leveraging an advanced algorithm streamlines the process by tracing AI-filtered images to pinpoint connection points and sequences, creating a dynamic and interactive 3D visualization structure..",
      videoTime: 0.66,
    },
    {
      id: "tech",
      title: "The future",
      subtitle: "of healthcare",
      description:
        "NanoWorks, an emerging technology inspired by the cursor's role in software development, is set to revolutionize 2D and 3D DNA origami design by offering an intuitive tool to overcome the steep learning curve of DNA manipulation and splicing, driving the next leap in nanotechnology with tangible nanoscale innovations.",
      videoTime: 1.0,
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || !videoRef.current) return;

      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight =
        document.documentElement.scrollHeight - windowHeight;

      // Calculate scroll progress (0 to 1)
      const scrollProgress = Math.min(scrollTop / documentHeight, 1);

      // Map scroll progress to video duration (only after initial 3-second play)
      const video = videoRef.current;
      if (video.duration && !isIn3SecondPlay) {
        const targetTime = scrollProgress * video.duration;
        video.currentTime = targetTime;

        // Ensure video is playing
        if (video.paused) {
          video.play().catch((e) => console.log("Auto-play prevented:", e));
        }
      }

      // Determine current section
      const sectionIndex = Math.floor(scrollProgress * sections.length);
      const newSection = Math.min(sectionIndex, sections.length - 1);

      // Trigger rotation when section changes
      if (newSection !== currentSection && newSection > 0) {
        setShouldRotate(true);
        setTimeout(() => setShouldRotate(false), 1200); // Animation duration
      }

      setCurrentSection(newSection);
    };

    // Initial video autoplay logic - play for 3 seconds
    const handleVideoLoad = async () => {
      const video = videoRef.current;
      if (!video || hasInitiallyPlayed) return;

      try {
        console.log("Video loaded! Duration:", video.duration);
        console.log("Video source:", video.currentSrc);
        console.log("Video ready state:", video.readyState);

        // Start playing the video for 3 seconds
        if (video.paused) {
          setIsInitialPlaying(true);
          setIsIn3SecondPlay(true);
          await video.play();
          console.log("Video started playing for 3 seconds...");

          // Play for 3 seconds, then switch to scroll control
          setTimeout(() => {
            console.log("3-second play complete, switching to scroll control");
            setIsInitialPlaying(false);
            setHasInitiallyPlayed(true);
            setIsIn3SecondPlay(false);

            // Reset video to beginning for scroll control
            video.currentTime = 0;
          }, 3000);
        }
      } catch (error) {
        console.log("Video play failed:", error);
        setIsInitialPlaying(false);
        setHasInitiallyPlayed(true);
        setIsIn3SecondPlay(false);
      }
    };

    // Set up video event listeners
    const video = videoRef.current;
    if (video) {
      console.log("Setting up video event listeners...");
      video.addEventListener("loadedmetadata", handleVideoLoad);
      video.addEventListener("canplay", handleVideoLoad);
      video.addEventListener("error", (e) => {
        console.error("Video error:", e);
        console.error("Video error details:", video.error);
      });
      video.addEventListener("loadstart", () =>
        console.log("Video load started")
      );
      video.addEventListener("loadeddata", () =>
        console.log("Video data loaded")
      );
    }

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (video) {
        video.removeEventListener("loadedmetadata", handleVideoLoad);
        video.removeEventListener("canplay", handleVideoLoad);
      }
    };
  }, [hasInitiallyPlayed, isInitialPlaying, isIn3SecondPlay]);

  // Client-side only flag to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fallback to ensure video plays
  useEffect(() => {
    const video = videoRef.current;
    if (video && isClient) {
      const tryPlay = () => {
        if (video.paused) {
          video.play().catch((e) => {
            console.log("Video autoplay failed:", e);
            console.log("User interaction may be required for video to play");
          });
        }
      };

      // Try to play after a short delay
      setTimeout(tryPlay, 1000);

      // Also try on user interaction
      const handleUserInteraction = () => {
        tryPlay();
        document.removeEventListener("click", handleUserInteraction);
        document.removeEventListener("touchstart", handleUserInteraction);
      };

      document.addEventListener("click", handleUserInteraction);
      document.addEventListener("touchstart", handleUserInteraction);

      return () => {
        document.removeEventListener("click", handleUserInteraction);
        document.removeEventListener("touchstart", handleUserInteraction);
      };
    }
  }, [isClient]);

  // Generate particles only on client side
  useEffect(() => {
    if (!isClient) return;

    const generateParticles = () => {
      const newParticles = [];

      // Large floating particles (30 total)
      for (let i = 0; i < 30; i++) {
        newParticles.push({
          id: i,
          type: "large" as const,
          style: {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${4 + Math.random() * 8}px`,
            height: `${4 + Math.random() * 8}px`,
            animationDelay: `${Math.random() * 6}s`,
            animationDuration: `${4 + Math.random() * 4}s`,
          },
        });
      }

      // Small twinkling particles (80 total)
      for (let i = 30; i < 110; i++) {
        newParticles.push({
          id: i,
          type: "small" as const,
          style: {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${1 + Math.random() * 3}px`,
            height: `${1 + Math.random() * 3}px`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${1 + Math.random() * 3}s`,
            opacity: Math.random() * 0.8 + 0.2,
          },
        });
      }

      // Glowing orbs (15 total)
      for (let i = 110; i < 125; i++) {
        newParticles.push({
          id: i,
          type: "glow" as const,
          style: {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${8 + Math.random() * 16}px`,
            height: `${8 + Math.random() * 16}px`,
            background: `radial-gradient(circle, rgba(59, 130, 246, ${
              0.3 + Math.random() * 0.5
            }) 0%, transparent 70%)`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${3 + Math.random() * 3}s`,
          },
        });
      }

      setParticles(newParticles);
    };

    generateParticles();
  }, [isClient]);

  // Handle input submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      // Navigate to chat page with the input value as a query parameter
      router.push(`/chat?prompt=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit(e as any);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Video Background for all sections */}
      <div className="fixed inset-0 w-full h-full z-[-1]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="auto"
          loop
          autoPlay
        >
          {/* Your background video */}
          <source src="/background-video.webm" type="video/mp4" />
          {/* Fallback for browsers that don't support video */}
        </video>

        {/* Animated background fallback when no video is loaded */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.3),transparent_50%)] animate-pulse" />
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,69,194,0.4),transparent_50%)] animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.3),transparent_50%)] animate-pulse"
            style={{ animationDelay: "2s" }}
          />
        </div>

        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-20" />

        {/* Initial 3-Second Play Indicator */}
        {isIn3SecondPlay && (
          <div
            className={`absolute top-8 left-8 z-20 ${styles.initialPlayIndicator}`}
          >
            <div className="flex items-center space-x-3 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">
                Intro Playing...
              </span>
              <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-blue-500 rounded-full ${styles.progressBarFill3Sec}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Scroll Control Available Indicator */}
        {hasInitiallyPlayed && !isInitialPlaying && currentSection === 0 && (
          <div
            className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 ${styles.scrollIndicator} ${styles.enhancedBounce}`}
          >
            <div className="flex flex-col items-center space-y-2 text-white/80">
              <div className="text-sm">Scroll to explore</div>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" />
                <div
                  className="w-1 h-1 bg-white/60 rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
                <div
                  className="w-1 h-1 bg-white/60 rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
              <svg
                className="w-6 h-6 animate-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Content with Snap */}
      <div className="relative z-10">
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={`section-${index}`}
            className={`min-h-screen flex items-center ${
              index === 0 ? "justify-center" : "justify-start"
            } px-8 md:px-16 lg:px-24 relative ${styles.snapSection} ${
              index > 0 ? styles.futuristicSection : ""
            }`}
          >
            {/* Futuristic Elements for sections 1-3 */}
            {index > 0 && (
              <>
                {/* Animated Grid */}
                <div className={styles.futuristicGrid} />

                {/* Holographic Border */}
                <div className={styles.holographicBorder} />

                {/* Tech Circuits */}
                <div className={styles.techCircuits}>
                  <div className={`${styles.circuit} ${styles.circuit1}`} />
                  <div className={`${styles.circuit} ${styles.circuit2}`} />
                  <div className={`${styles.circuit} ${styles.circuit3}`} />
                </div>

                {/* Floating Tech Shapes */}
                <div className={styles.floatingElements}>
                  <div className={`${styles.techShape} ${styles.hexagon}`} />
                  <div className={`${styles.techShape} ${styles.triangle}`} />
                  <div className={`${styles.techShape} ${styles.diamond}`} />
                </div>

                {/* Data Stream */}
                <div className={styles.dataStream} />

                {/* Scanning Line */}
                <div className={styles.scanLine} />

                {/* Energy Pulse Points */}
                <div
                  className={styles.energyPulse}
                  style={{ left: "20%", top: "30%", animationDelay: "0.5s" }}
                />
                <div
                  className={styles.energyPulse}
                  style={{ left: "80%", top: "70%", animationDelay: "1.5s" }}
                />

                {/* Section background overlay for better text contrast */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
              </>
            )}

            <div
              className={`${
                index === 0 ? "max-w-5xl w-full text-center" : "max-w-3xl"
              } text-white relative z-10 ${
                index === 0 ? styles.glassContainer + " p-8" : ""
              }`}
            >
              {/* Section Content */}
              <div
                className={`transition-all duration-1000 ${
                  currentSection === index
                    ? "opacity-100 translate-y-0"
                    : "opacity-70 translate-y-10"
                }`}
              >
                {/* Title */}
                <h1
                  className={`font-bold mb-4 ${
                    section.id === "hero"
                      ? styles.textGlow +
                        " text-5xl md:text-7xl lg:text-8xl mb-8"
                      : styles.holographicText +
                        " text-4xl md:text-6xl lg:text-7xl"
                  }`}
                >
                  {section.title}
                </h1>

                {/* Subtitle */}
                {section.subtitle && (
                  <h2
                    className={`font-light mb-8 opacity-70 ${
                      section.id === "hero"
                        ? "text-3xl md:text-5xl lg:text-6xl"
                        : "text-2xl md:text-4xl lg:text-5xl " +
                          styles.holographicText
                    }`}
                  >
                    {section.subtitle}
                  </h2>
                )}

                {/* Description */}
                <p
                  className={`text-lg md:text-xl leading-relaxed opacity-90 mb-8 ${
                    section.id === "hero"
                      ? "text-slate-300 max-w-3xl mx-auto"
                      : "max-w-2xl"
                  }`}
                >
                  {section.description}
                </p>

                {/* Special elements for specific sections */}
                {section.id === "hero" && (
                  <div className="mt-12 space-y-8 w-full max-w-4xl">
                    {/* Chat Input Container */}
                    <form onSubmit={handleSubmit} className="relative">
                      <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-600/30 rounded-2xl p-1 shadow-2xl">
                        <div className="flex items-center space-x-3 p-4">
                          <input
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyPress={handleKeyPress}
                            placeholder="Let your imagination run wild..."
                            className="flex-1 bg-transparent text-white placeholder-slate-400 text-lg focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!inputValue.trim()}
                            className="p-3 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl transition-all duration-300 border border-slate-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg
                              className="w-5 h-5 text-slate-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button className="flex items-center space-x-2 bg-slate-700/40 hover:bg-slate-600/40 backdrop-blur-sm text-slate-200 px-4 py-2 rounded-xl transition-all duration-300 border border-slate-500/20">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                        <span>Attach</span>
                      </button>

                      <button className="flex items-center space-x-2 bg-slate-700/40 hover:bg-slate-600/40 backdrop-blur-sm text-slate-200 px-4 py-2 rounded-xl transition-all duration-300 border border-slate-500/20">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <span>Search</span>
                      </button>

                      <button className="flex items-center space-x-2 bg-slate-700/40 hover:bg-slate-600/40 backdrop-blur-sm text-slate-200 px-4 py-2 rounded-xl transition-all duration-300 border border-slate-500/20">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                          />
                        </svg>
                        <span>Voice</span>
                      </button>
                    </div>

                    {/* Suggested Prompts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                      <button
                        onClick={() => {
                          setInputValue(
                            "Create a trigonal planar molecule with 4 atoms"
                          );
                          router.push(
                            `/chat?prompt=${encodeURIComponent(
                              "Create a trigonal planar molecule with 4 atoms"
                            )}`
                          );
                        }}
                        className="text-left p-4 bg-slate-800/30 hover:bg-slate-700/40 backdrop-blur-sm border border-slate-600/20 rounded-xl transition-all duration-300 group"
                      >
                        <div className="text-slate-200 font-medium mb-1">
                          Molecular Design
                        </div>
                        <div className="text-slate-400 text-sm">
                          Create a trigonal planar molecule with 4 atoms
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setInputValue("A car with one wheel");
                          router.push(
                            `/chat?prompt=${encodeURIComponent(
                              "A car with one wheel"
                            )}`
                          );
                        }}
                        className="text-left p-4 bg-slate-800/30 hover:bg-slate-700/40 backdrop-blur-sm border border-slate-600/20 rounded-xl transition-all duration-300 group"
                      >
                        <div className="text-slate-200 font-medium mb-1">
                          Just For Kicks
                        </div>
                        <div className="text-slate-400 text-sm">
                          A car with one wheel
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setInputValue(
                            "Facilitate targeted bond formation in T4 lysozyme"
                          );
                          router.push(
                            `/chat?prompt=${encodeURIComponent(
                              "Facilitate targeted bond formation in T4 lysozyme"
                            )}`
                          );
                        }}
                        className="text-left p-4 bg-slate-800/30 hover:bg-slate-700/40 backdrop-blur-sm border border-slate-600/20 rounded-xl transition-all duration-300 group"
                      >
                        <div className="text-slate-200 font-medium mb-1">
                          Structural Analysis
                        </div>
                        <div className="text-slate-400 text-sm">
                          Facilitate targeted bond formation in T4 lysozyme
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setInputValue(
                            "Assist in modeling structure of the human genome"
                          );
                          router.push(
                            `/chat?prompt=${encodeURIComponent(
                              "Assist in modeling structure of the human genome"
                            )}`
                          );
                        }}
                        className="text-left p-4 bg-slate-800/30 hover:bg-slate-700/40 backdrop-blur-sm border border-slate-600/20 rounded-xl transition-all duration-300 group"
                      >
                        <div className="text-slate-200 font-medium mb-1">
                          Research Tools
                        </div>
                        <div className="text-slate-400 text-sm">
                          Assist in modeling structure of the human genome
                        </div>
                      </button>
                    </div>

                    <div className="text-center text-slate-400 text-sm mt-6">
                      Powered by advanced AI • Built for researchers and
                      innovators
                    </div>
                  </div>
                )}

                {section.id === "why" && (
                  <div className="mt-8">
                    <div className="relative">
                      <div className="w-32 h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400 rounded-full animate-pulse" />
                      <div
                        className="absolute -top-1 left-0 w-2 h-3 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.5s" }}
                      />
                      <div
                        className="absolute -bottom-1 right-4 w-1 h-2 bg-purple-400 rounded-full animate-ping"
                        style={{ animationDelay: "1s" }}
                      />
                    </div>
                    <div className="mt-4 text-blue-300 text-xs font-mono tracking-wider opacity-60">
                      INITIALIZATION_SEQUENCE.EXE
                    </div>
                  </div>
                )}

                {section.id === "how" && (
                  <div className="mt-8">
                    <div className="flex space-x-3 items-center">
                      <div className="w-16 h-1 bg-blue-400 rounded-full animate-pulse" />
                      <div className="w-8 h-8 border border-blue-400 rounded-full flex items-center justify-center animate-spin">
                        <div className="w-2 h-2 bg-blue-400 rounded-full" />
                      </div>
                      <div
                        className="w-24 h-1 bg-purple-400 rounded-full animate-pulse"
                        style={{ animationDelay: "0.5s" }}
                      />
                      <div
                        className="w-12 h-1 bg-blue-300 rounded-full animate-pulse"
                        style={{ animationDelay: "1s" }}
                      />
                    </div>
                    <div className="mt-4 flex space-x-4 text-xs font-mono text-blue-300">
                      <span className="animate-pulse">BUILD.STATUS: OK</span>
                      <span
                        className="animate-pulse"
                        style={{ animationDelay: "0.3s" }}
                      >
                        COMPILE.TIME: 0.42s
                      </span>
                      <span
                        className="animate-pulse"
                        style={{ animationDelay: "0.6s" }}
                      >
                        ERRORS: 0
                      </span>
                    </div>
                  </div>
                )}

                {section.id === "tech" && (
                  <div className="mt-8">
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        <div className="w-12 h-12 border-2 border-blue-400 rounded-full animate-spin" />
                        <div
                          className="absolute inset-2 border border-purple-400 rounded-full animate-spin"
                          style={{
                            animationDirection: "reverse",
                            animationDuration: "3s",
                          }}
                        />
                        <div className="absolute inset-4 w-4 h-4 bg-blue-400 rounded-full animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-blue-400 text-sm font-mono tracking-wider">
                          NEURAL_NETWORK.ACTIVE
                        </div>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                          <div
                            className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                            style={{ animationDelay: "0.2s" }}
                          />
                          <div
                            className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"
                            style={{ animationDelay: "0.4s" }}
                          />
                          <div
                            className="w-2 h-2 bg-purple-300 rounded-full animate-pulse"
                            style={{ animationDelay: "0.6s" }}
                          />
                        </div>
                        <div className="text-xs text-blue-300 font-mono opacity-70">
                          AI.PROCESSING: 97.3%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Molecular Structure - Center Screen for Sections 1-3 */}
      {currentSection > 0 && (
        <div className={styles.molecularContainer}>
          <div
            className={`${styles.molecularStructure} ${
              shouldRotate ? styles.rotating : ""
            }`}
          >
            {/* Central Atom */}
            <div className={styles.atomCore} />

            {/* Electron Orbits */}
            <div className={`${styles.electronOrbit} ${styles.orbit1}`}>
              <div className={`${styles.electron} ${styles.electron1}`} />
            </div>
            <div className={`${styles.electronOrbit} ${styles.orbit2}`}>
              <div className={`${styles.electron} ${styles.electron2}`} />
            </div>
            <div className={`${styles.electronOrbit} ${styles.orbit3}`}>
              <div className={`${styles.electron} ${styles.electron3}`} />
            </div>

            {/* Molecular Bonds */}
            <div className={styles.molecularBonds}>
              <div className={`${styles.bond} ${styles.bond1}`} />
              <div className={`${styles.bond} ${styles.bond2}`} />
              <div className={`${styles.bond} ${styles.bond3}`} />
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Particle Effects - Client Side Only */}
      {isClient && (
        <div className={`${styles.particles}`}>
          {particles.map((particle) => (
            <div
              key={particle.id}
              className={`absolute ${
                particle.type === "large"
                  ? `${styles.particle} ${styles.float}`
                  : particle.type === "small"
                  ? "bg-blue-300 rounded-full animate-pulse"
                  : `rounded-full ${styles.customPulse}`
              }`}
              style={particle.style}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default IntroPage;
