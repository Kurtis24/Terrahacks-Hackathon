"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { renderSingleStrandDNA } from "../../utils/dna";
import { ParsePath } from "../../utils/parser";
import styles from "./intropage.module.css";
import { useRef } from "react";

interface GenerateResult {
  status: "success" | "error";
  prompt: string;
  json_file?: string;
  result_file?: string;
  snake_paths_count?: number;
  total_points?: number;
  message?: string;
}

export default function Home() {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isClient, setIsClient] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [particles, setParticles] = useState<any[]>([]);
  const [dnaArray, setDnaArray] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(
    null
  );
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isInfoCollapsed, setIsInfoCollapsed] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{
    nucleotideType: number;
    baseType: number;
    isDoubleDNA: boolean;
    position: { row: number; col: number };
    category: "main_snake" | "collision_branch";
  } | null>(null);
  const [nucleotideStats, setNucleotideStats] = useState<{
    mainSnake: { A: number; T: number; C: number; G: number; total: number };
    collisionBranches: {
      A: number;
      T: number;
      C: number;
      G: number;
      total: number;
    };
  }>({
    mainSnake: { A: 0, T: 0, C: 0, G: 0, total: 0 },
    collisionBranches: { A: 0, T: 0, C: 0, G: 0, total: 0 },
  });

  const FAST_API_URL = "http://localhost:8000";

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Video autoplay logic (simplified for background)
  useEffect(() => {
    const video = videoRef.current;
    if (video && isClient) {
      const tryPlay = () => {
        if (video.paused) {
          video.play().catch((e) => {
            console.log("Video autoplay failed:", e);
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

  const generatePattern = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt to generate a pattern");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerateResult(null);

    try {
      const response = await fetch(`${FAST_API_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setGenerateResult(result);

      if (result.status === "success") {
        // Automatically reload path data after successful generation
        await loadPathData();
      } else {
        setError(result.message || "Generation failed");
      }
    } catch (err) {
      console.error("Error generating pattern:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate pattern"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [prompt]);

  const loadPathData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const pathData = await ParsePath();
      setDnaArray(pathData);
    } catch (err) {
      console.error("Error loading path data:", err);
      setError(err instanceof Error ? err.message : "Failed to load path data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderDNA = useCallback(() => {
    if (dnaArray.length > 0) {
      try {
        const result = renderSingleStrandDNA(
          dnaArray,
          "dna-container",
          setHoverInfo
        );
        setNucleotideStats(result.stats);
      } catch (error) {
        console.error("Error rendering DNA:", error);
        setError("Failed to render DNA visualization");
      }
    }
  }, [dnaArray]);

  useEffect(() => {
    loadPathData();
  }, [loadPathData]);

  useEffect(() => {
    renderDNA();
  }, [renderDNA]);

  // Load prompt from URL params on component mount and auto-generate
  useEffect(() => {
    const urlPrompt = searchParams.get("prompt");
    if (urlPrompt) {
      setPrompt(urlPrompt);
      // Auto-generate if prompt is provided from intro page
      setTimeout(() => {
        if (urlPrompt.trim()) {
          // Call generatePattern directly since we have the prompt
          setIsGenerating(true);
          setError(null);
          setGenerateResult(null);

          fetch(`${FAST_API_URL}/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt: urlPrompt.trim() }),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.json();
            })
            .then((result) => {
              setGenerateResult(result);
              if (result.status === "success") {
                loadPathData();
              } else {
                setError(result.message || "Generation failed");
              }
            })
            .catch((err) => {
              console.error("Error generating pattern:", err);
              setError(
                err instanceof Error
                  ? err.message
                  : "Failed to generate pattern"
              );
            })
            .finally(() => {
              setIsGenerating(false);
            });
        }
      }, 1000); // Small delay to ensure component is fully mounted
    }
  }, [searchParams, loadPathData]);

  // Generate particles only on client side
  useEffect(() => {
    if (!isClient) return;

    const generateParticles = () => {
      const newParticles = [];

      // Large floating particles (20 total)
      for (let i = 0; i < 20; i++) {
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

      // Small twinkling particles (50 total)
      for (let i = 20; i < 70; i++) {
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

      // Glowing orbs (10 total)
      for (let i = 70; i < 80; i++) {
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

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Video Background */}
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
          <source src="/background-video.webm" type="video/mp4" />
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
      </div>

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

      {/* Main Content */}
      <div className="relative z-10 h-screen flex">
        {/* Sidebar */}
        <div className="w-80 backdrop-blur-xl bg-white/5 border-r border-white/20 flex flex-col shadow-2xl">
          {/* Header */}
          <div
            className={`p-4 border-b border-white/20 backdrop-blur-sm ${styles.liquidGlassBackgroundTitle}`}
          >
            <h1
              className={`text-xl font-bold text-white mb-1 drop-shadow-lg${styles.holographicText}`}
            >
              NanoWorks
            </h1>
            <p className="text-sm text-white">Vibe out 3D DNA structures</p>
          </div>

          {/* Controls */}
          <div className="flex-1 p-4 space-y-12 overflow-y-auto">
            {/* Generate Section */}
            <div
              className={`backdrop-blur-md bg-white/2 p-4 rounded-xl border border-white/10 shadow-lg ${styles.glassContainerCard}`}
            >
              <h2
                className={`text-lg font-semibold text-white mb-3 drop-shadow-md ${styles.holographicText}`}
              >
                Generate
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    What to render:
                  </label>
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., triangle, tower, bottle..."
                    className="w-full px-3 py-2 backdrop-blur-md bg-slate-800/60 border border-slate-600/30 rounded-full text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 shadow-inner"
                    disabled={isGenerating}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !isGenerating) {
                        generatePattern();
                      }
                    }}
                  />
                </div>

                <button
                  onClick={generatePattern}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full px-4 py-2 backdrop-blur-md bg-slate-700/50 text-white rounded-full hover:bg-slate-600/50 transition-all duration-300 disabled:bg-white/10 disabled:cursor-not-allowed border border-slate-500/30 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                >
                  {isGenerating ? "Generating..." : "Generate Pattern"}
                </button>

              {generateResult && generateResult.status === "success" && (
                <div className="text-sm text-green-200 backdrop-blur-md bg-green-500/20 p-2 rounded border border-green-400/30 shadow-lg">
                  Generated: {generateResult.snake_paths_count} paths,{" "}
                  {generateResult.total_points} points
                </div>
              )}

              {generateResult && generateResult.status === "error" && (
                <div className="text-sm text-red-200 backdrop-blur-md bg-red-500/20 p-2 rounded border border-red-400/30 shadow-lg">
                  {generateResult.message}
                </div>
              )}
            </div>
          </div>

            {/* Controls Section */}
            <div
              className={`backdrop-blur-md bg-white/2 p-4 rounded-xl border border-white/10 shadow-lg ${styles.glassContainerCard}`}
            >
              <h2
                className={`text-lg font-semibold text-white mb-3 drop-shadow-md ${styles.holographicText}`}
              >
                Controls
              </h2>
              <div className="space-y-3">
                <button
                  onClick={loadPathData}
                  disabled={isLoading}
                  className="w-full px-4 py-2 backdrop-blur-md bg-slate-700/50 text-white rounded-full hover:bg-slate-600/50 transition-all duration-300 disabled:bg-white/10 disabled:cursor-not-allowed border border-slate-500/30 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                >
                  {isLoading ? "Loading..." : "Refresh Data"}
                </button>

                <button
                  onClick={renderDNA}
                  disabled={dnaArray.length === 0}
                  className="w-full px-4 py-2 backdrop-blur-md bg-slate-700/50 text-white rounded-full hover:bg-slate-600/50 transition-all duration-300 disabled:bg-white/10 disabled:cursor-not-allowed border border-slate-500/30 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                >
                  Re-render DNA
                </button>
              </div>
            </div>

            {/* Controls Help */}
            <div
              className={`backdrop-blur-md bg-white/2 p-4 rounded-xl border border-white/10 shadow-lg ${styles.glassContainerCard}`}
            >
              <h2
                className={`text-lg font-semibold text-white mb-3 drop-shadow-md ${styles.holographicText}`}
              >
                Navigation
              </h2>
              <div className="text-xs text-white/70 space-y-1">
                <div>
                  <strong className="text-white/90">Rotate:</strong> Left click
                  + drag
                </div>
                <div>
                  <strong className="text-white/90">Pan:</strong> Right click +
                  drag
                </div>
                <div>
                  <strong className="text-white/90">Zoom:</strong> Scroll wheel
                </div>
                <div>
                  <strong className="text-white/90">Move Nucleotide:</strong>{" "}
                  Click + drag
                </div>
              </div>
            </div>

          {error && (
            <div className="text-sm text-red-200 backdrop-blur-md bg-red-500/20 p-3 rounded-xl border border-red-400/30 shadow-lg">
              <div className="font-medium">Error:</div>
              <div>{error}</div>
            </div>
          )}
        </div>
      </div>

        {/* Main 3D Visualization Area */}
        <div className="flex-1 relative">
          <div className="absolute inset-0">
            <div
              className={`h-full w-full backdrop-blur-xl bg-white/2 border border-white/20 relative overflow-hidden shadow-2xl`}
            >
              <div id="dna-container" className="w-full h-full"></div>

              {/* Info and Legend Overlay - Top Right */}
              <div className="absolute top-4 right-4 space-y-10 max-w-xs">
                {/* Info Section */}
                <div
                  className={`backdrop-blur-md bg-white/2 p-4 rounded-xl border border-white/10 shadow-lg transition-all duration-300 ${styles.glassContainerCard}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      className={`text-lg font-semibold text-white drop-shadow-md ${styles.holographicText}`}
                    >
                      Info
                    </h2>
                    <button
                      onClick={() => setIsInfoCollapsed(!isInfoCollapsed)}
                      className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                      aria-label={
                        isInfoCollapsed ? "Expand info" : "Collapse info"
                      }
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isInfoCollapsed ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isInfoCollapsed
                        ? "max-h-0 opacity-0"
                        : "max-h-96 opacity-100"
                    }`}
                  >
                    <div className="space-y-2 text-sm text-white/80">
                      <div className="backdrop-blur-sm bg-white/5 p-2 rounded border border-white/20 shadow-inner">
                        <div className="text-white/60">Grid Size:</div>
                        <div className="text-white font-medium">
                          {dnaArray.length > 0
                            ? `${dnaArray.length} × ${dnaArray[0]?.length || 0}`
                            : "Not loaded"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div
                  className={`backdrop-blur-md bg-white/2 p-4 rounded-xl border border-white/10 shadow-lg transition-all duration-300 ${styles.glassContainerCard}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      className={`text-lg font-semibold text-white drop-shadow-md ${styles.holographicText}`}
                    >
                      Legend
                    </h2>
                    <button
                      onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
                      className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                      aria-label={
                        isLegendCollapsed ? "Expand legend" : "Collapse legend"
                      }
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isLegendCollapsed ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isLegendCollapsed
                        ? "max-h-0 opacity-0"
                        : "max-h-96 opacity-100"
                    }`}
                  >
                    <div className="space-y-2 text-sm">
                      <div className="text-white/70 font-medium mb-2">
                        Regular Nucleotides:
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded shadow-lg border border-white/20"></div>
                        <span className="text-white/80">Adenine</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded shadow-lg border border-white/20"></div>
                        <span className="text-white/80">Thymine</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded shadow-lg border border-white/20"></div>
                        <span className="text-white/80">Cytosine</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded shadow-lg border border-white/20"></div>
                        <span className="text-white/80">Guanine</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-white/20 border border-white/40 rounded shadow-lg backdrop-blur-sm"></div>
                        <span className="text-white/80">Sugar Backbone</span>
                      </div>

                      <div className="text-white/70 font-medium mb-2 mt-4">
                        Collision Branches:
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-pink-500 rounded shadow-lg border border-white/20"></div>
                        <span className="text-white/80">
                          DNA Scaffolding (A,T,C,G)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nucleotide Statistics */}
                <div
                  className={`backdrop-blur-md bg-white/2 p-4 rounded-xl border border-white/10 shadow-lg transition-all duration-300 ${styles.glassContainerCard}`}
                >
                  <h2
                    className={`text-lg font-semibold text-white mb-3 drop-shadow-md ${styles.holographicText}`}
                  >
                    Statistics
                  </h2>
                  <div className="space-y-3 text-sm">
                    <div className="text-white/70 font-medium mb-2">
                      Main Snake Path:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between backdrop-blur-sm bg-red-500/20 p-2 rounded border border-red-400/30">
                        <span className="text-red-200">A:</span>
                        <span className="text-white font-medium">
                          {nucleotideStats.mainSnake.A}
                        </span>
                      </div>
                      <div className="flex items-center justify-between backdrop-blur-sm bg-blue-500/20 p-2 rounded border border-blue-400/30">
                        <span className="text-blue-200">T:</span>
                        <span className="text-white font-medium">
                          {nucleotideStats.mainSnake.T}
                        </span>
                      </div>
                      <div className="flex items-center justify-between backdrop-blur-sm bg-green-500/20 p-2 rounded border border-green-400/30">
                        <span className="text-green-200">C:</span>
                        <span className="text-white font-medium">
                          {nucleotideStats.mainSnake.C}
                        </span>
                      </div>
                      <div className="flex items-center justify-between backdrop-blur-sm bg-yellow-500/20 p-2 rounded border border-yellow-400/30">
                        <span className="text-yellow-200">G:</span>
                        <span className="text-white font-medium">
                          {nucleotideStats.mainSnake.G}
                        </span>
                      </div>
                    </div>
                    <div className="text-white/60 text-xs text-center">
                      Total: {nucleotideStats.mainSnake.total}
                    </div>

                    <div className="text-white/70 font-medium mb-2 mt-4">
                      Collision Branches:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between backdrop-blur-sm bg-red-500/20 p-2 rounded border border-red-400/30">
                        <span className="text-red-200">A:</span>
                        <span className="text-white font-medium">
                          {nucleotideStats.collisionBranches.A}
                        </span>
                      </div>
                      <div className="flex items-center justify-between backdrop-blur-sm bg-blue-500/20 p-2 rounded border border-blue-400/30">
                        <span className="text-blue-200">T:</span>
                        <span className="text-white font-medium">
                          {nucleotideStats.collisionBranches.T}
                        </span>
                      </div>
                      <div className="flex items-center justify-between backdrop-blur-sm bg-green-500/20 p-2 rounded border border-green-400/30">
                        <span className="text-green-200">C:</span>
                        <span className="text-white font-medium">
                          {nucleotideStats.collisionBranches.C}
                        </span>
                      </div>
                      <div className="flex items-center justify-between backdrop-blur-sm bg-yellow-500/20 p-2 rounded border border-yellow-400/30">
                        <span className="text-yellow-200">G:</span>
                        <span className="text-white font-medium">
                          {nucleotideStats.collisionBranches.G}
                        </span>
                      </div>
                    </div>
                    <div className="text-white/60 text-xs text-center">
                      Total: {nucleotideStats.collisionBranches.total}
                    </div>
                  </div>
                </div>

                {/* Hover Information */}
                {hoverInfo && (
                  <div
                    className={`backdrop-blur-md bg-white/2 p-4 rounded-xl border border-white/10 shadow-lg transition-all duration-300 ${styles.glassContainerCard}`}
                  >
                    <h2
                      className={`text-lg font-semibold text-white mb-3 drop-shadow-md ${styles.holographicText}`}
                    >
                      Hovered Nucleotide
                    </h2>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between backdrop-blur-sm bg-white/5 p-2 rounded border border-white/20">
                        <span className="text-white/70">Type:</span>
                        <span className="text-white font-medium">
                          {hoverInfo.baseType === 1
                            ? "Adenine (A)"
                            : hoverInfo.baseType === 2
                            ? "Thymine (T)"
                            : hoverInfo.baseType === 3
                            ? "Cytosine (C)"
                            : hoverInfo.baseType === 4
                            ? "Guanine (G)"
                            : "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between backdrop-blur-sm bg-white/5 p-2 rounded border border-white/20">
                        <span className="text-white/70">Category:</span>
                        <span className="text-white font-medium">
                          {hoverInfo.category === "main_snake"
                            ? "Main Snake"
                            : "Collision Branch"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between backdrop-blur-sm bg-white/5 p-2 rounded border border-white/20">
                        <span className="text-white/70">Position:</span>
                        <span className="text-white font-medium">
                          ({hoverInfo.position.row}, {hoverInfo.position.col})
                        </span>
                      </div>
                      <div className="flex items-center justify-between backdrop-blur-sm bg-white/5 p-2 rounded border border-white/20">
                        <span className="text-white/70">Value:</span>
                        <span className="text-white font-medium">
                          {hoverInfo.nucleotideType}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Loading overlay */}
              {(isLoading || isGenerating) && (
                <div className="absolute inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center">
                  <div
                    className={`backdrop-blur-md bg-white/5 p-4 rounded-lg border border-white/20 shadow-2xl ${styles.glassContainerCard}`}
                  >
                    <div className="text-white text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500/50 border-t-blue-500 rounded-full mx-auto mb-2"></div>
                      <div className={styles.holographicText}>
                        {isGenerating ? "Generating..." : "Loading..."}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && !isGenerating && dnaArray.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`text-center text-white/80 backdrop-blur-md bg-white/2 p-8 rounded-xl border border-white/20 shadow-2xl ${styles.glassContainerCard}`}
                  >
                    <div className="text-6xl mb-4 drop-shadow-lg">🧬</div>
                    <div
                      className={`text-xl mb-2 drop-shadow-md ${styles.holographicText}`}
                    >
                      No DNA Structure Loaded
                    </div>
                    <div className="text-sm text-white/60">
                      Enter a prompt and click &quot;Generate Pattern&quot; to
                      begin
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
