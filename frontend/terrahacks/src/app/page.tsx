"use client";

import { useState, useEffect, useCallback } from "react";
import { renderSingleStrandDNA } from "../utils/dna";
import { ParsePath } from "../utils/parser";

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
  const [dnaArray, setDnaArray] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(
    null
  );

  const FAST_API_URL = "http://localhost:8000";

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
        renderSingleStrandDNA(dnaArray, "dna-container");
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

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white mb-1">
            Snake DNA Renderer
          </h1>
          <p className="text-sm text-gray-400">
            Generate 3D DNA structures from shapes
          </p>
        </div>

        {/* Controls */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Generate Section */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Generate</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  What to render:
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., triangle, tower, bottle..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Generating..." : "Generate Pattern"}
              </button>

              {generateResult && generateResult.status === "success" && (
                <div className="text-sm text-green-400 bg-green-900/20 p-2 rounded">
                  ✅ Generated: {generateResult.snake_paths_count} paths,{" "}
                  {generateResult.total_points} points
                </div>
              )}

              {generateResult && generateResult.status === "error" && (
                <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded">
                  ❌ {generateResult.message}
                </div>
              )}
            </div>
          </div>

          {/* Controls Section */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Controls</h2>
            <div className="space-y-3">
              <button
                onClick={loadPathData}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isLoading ? "Loading..." : "Refresh Data"}
              </button>

              <button
                onClick={renderDNA}
                disabled={dnaArray.length === 0}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Re-render DNA
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Info</h2>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="bg-gray-700 p-2 rounded">
                <div className="text-gray-400">Grid Size:</div>
                <div className="text-white">
                  {dnaArray.length > 0
                    ? `${dnaArray.length} × ${dnaArray[0]?.length || 0}`
                    : "Not loaded"}
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Legend</h2>
            <div className="space-y-2 text-sm">
              <div className="text-gray-400 font-medium mb-2">
                Regular Nucleotides:
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-gray-300">Adenine</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-gray-300">Thymine</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-300">Cytosine</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="text-gray-300">Guanine</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white border border-gray-500 rounded"></div>
                <span className="text-gray-300">Sugar Backbone</span>
              </div>

              <div className="text-gray-400 font-medium mb-2 mt-4">
                Collision Branches:
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-pink-500 rounded"></div>
                <span className="text-gray-300">Pink Sugar (A,T,C,G)</span>
              </div>
            </div>
          </div>

          {/* Controls Help */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Controls</h2>
            <div className="text-xs text-gray-400 space-y-1">
              <div>
                <strong>Rotate:</strong> Left click + drag
              </div>
              <div>
                <strong>Pan:</strong> Right click + drag
              </div>
              <div>
                <strong>Zoom:</strong> Scroll wheel
              </div>
              <div>
                <strong>Move Nucleotide:</strong> Click + drag
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 p-3 rounded border border-red-800">
              <div className="font-medium">Error:</div>
              <div>{error}</div>
            </div>
          )}
        </div>
      </div>

      {/* Main 3D Visualization Area */}
      <div className="flex-1 bg-gray-900 relative">
        <div className="absolute inset-0 p-4">
          <div className="h-full w-full bg-gray-800 rounded-lg border border-gray-700 relative overflow-hidden">
            <div id="dna-container" className="w-full h-full"></div>

            {/* Loading overlay */}
            {(isLoading || isGenerating) && (
              <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                  <div className="text-white text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <div>{isGenerating ? "Generating..." : "Loading..."}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isGenerating && dnaArray.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4">🧬</div>
                  <div className="text-xl mb-2">No DNA Structure Loaded</div>
                  <div className="text-sm">
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
  );
}
