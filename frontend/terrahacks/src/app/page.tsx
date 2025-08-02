"use client";

import { useState, useEffect, useCallback } from "react";
import { renderSingleStrandDNA } from "../utils/dna";
import { ParsePath } from "../utils/parser";

export default function Home() {
  const [dnaArray, setDnaArray] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Snake Path DNA Renderer
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Path Data Controls</h2>
          <p className="text-sm text-gray-600 mb-4">
            DNA sequence generated from snake path coordinates: 0=nothing,
            1=adenine(red), 2=thymine(blue), 3=cytosine(green),
            4=guanine(yellow). The path coordinates are converted to nucleotide
            sequences with random values 1-4 at snake positions.
          </p>

          <div className="flex gap-4 items-center">
            <button
              onClick={loadPathData}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400"
            >
              {isLoading ? "Loading..." : "Reload Path Data"}
            </button>

            <button
              onClick={renderDNA}
              disabled={dnaArray.length === 0}
              className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-400"
            >
              Re-render DNA
            </button>

            <div className="text-sm text-gray-600">
              Grid size:{" "}
              {dnaArray.length > 0
                ? `${dnaArray.length} × ${dnaArray[0]?.length || 0}`
                : "Not loaded"}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700">
              Error: {error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">3D DNA Visualization</h2>
          <div className="mb-4 text-sm text-gray-600">
            <strong>Camera Controls:</strong> Left click + drag to rotate view •
            Right click + drag to pan • Scroll to zoom
            <br />
            <strong>Nucleotide Controls:</strong> Click and drag on any
            nucleotide (sugar sphere or base) to rotate it individually
            <br />
            <strong>Animation:</strong> Nucleotides gently rotate automatically
            to simulate a light breeze
          </div>
          <div className="legend mb-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Adenine</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Thymine</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Cytosine</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>Guanine</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-400 rounded"></div>
              <span>Sugar Backbone</span>
            </div>
          </div>

          <div
            id="dna-container"
            className="w-full h-96 bg-gray-50 rounded-md border border-gray-200"
          ></div>
        </div>
      </div>
    </div>
  );
}
