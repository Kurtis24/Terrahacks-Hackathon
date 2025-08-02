"use client";

import { useState, useEffect, useCallback } from "react";
import { renderSingleStrandDNA } from "../utils/dna";

export default function Home() {
  const [inputString, setInputString] = useState(
    "1,1,1,1,0,0,0\n2,0,0,1,0,0,0\n4,0,0,1,0,0,0\n1,0,0,3,1,2,1\n2,0,0,0,0,0,3\n0,0,0,0,0,0,2\n1,2,3,1,3,2,1\n12,11,14,12,14,11,12"
  );

  const parseInput = (input: string): number[][] => {
    return input
      .split("\n")
      .map((row) => row.split(",").map((cell) => parseInt(cell.trim()) || 0));
  };

  const renderDNA = useCallback(() => {
    try {
      const dnaArray = parseInput(inputString);
      renderSingleStrandDNA(dnaArray, "dna-container");
    } catch (error) {
      console.error("Error parsing DNA input:", error);
    }
  }, [inputString]);

  useEffect(() => {
    renderDNA();
  }, [renderDNA]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Single Strand DNA Renderer
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">DNA Sequence Input</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enter a 2D array where: 0=nothing, 1=adenine(red), 2=thymine(blue),
            3=cytosine(green), 4=guanine(yellow). Double-digit nucleotides
            (11-14) will pair with single-digit ones (1-4) using complementary
            base pairing (A-T, C-G). Paired nucleotides will be connected with
            gray bonds and won&apos;t spin.
          </p>

          <textarea
            value={inputString}
            onChange={(e) => setInputString(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="Single strand example:
1,0,0,0
2,0,0,0
3,0,0,0

Base paired example:
1,2,3,4
11,12,13,14"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            onKeyDown={(e) => {
              // Ensure copy/paste shortcuts work
              if (
                (e.ctrlKey || e.metaKey) &&
                (e.key === "c" ||
                  e.key === "v" ||
                  e.key === "x" ||
                  e.key === "a")
              ) {
                e.stopPropagation();
              }
            }}
            onSelect={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
          />

          <button
            onClick={renderDNA}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Render DNA
          </button>
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
