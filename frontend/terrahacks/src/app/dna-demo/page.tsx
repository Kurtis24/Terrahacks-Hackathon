"use client";

import { useState, useEffect } from "react";
import { renderSingleStrandDNA } from "@/utils/dna";

export default function DNADemo() {
  const [inputString, setInputString] = useState(
    "0,1,1,1,0,0,0\n0,0,0,1,0,0,0\n0,0,0,1,0,0,0\n0,0,0,3,1,2,1\n0,0,0,0,0,0,3\n0,0,0,0,0,0,2\n1,2,3,1,3,2,1\n1,2,3,1,3,2,1"
  );

  const parseInput = (input: string): number[][] => {
    return input
      .split("\n")
      .map((row) => row.split(",").map((cell) => parseInt(cell.trim()) || 0));
  };

  const renderDNA = () => {
    try {
      const dnaArray = parseInput(inputString);
      renderSingleStrandDNA(dnaArray, "dna-container");
    } catch (error) {
      console.error("Error parsing DNA input:", error);
    }
  };

  useEffect(() => {
    renderDNA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Single Strand DNA Renderer
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">DNA Sequence Input</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enter a 2D array where: 0=nothing, 1=adenine, 2=thymine, 3=cytosine,
            4=guanine
          </p>

          <textarea
            value={inputString}
            onChange={(e) => setInputString(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="0,1,1,1,0,0,0
0,0,0,1,0,0,0
0,0,0,1,0,0,0
0,0,0,3,1,2,1
0,0,0,0,0,0,3
0,0,0,0,0,0,2
1,2,3,1,3,2,1
1,2,3,1,3,2,1"
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
              <div className="w-4 h-4 bg-yellow-800 rounded"></div>
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
