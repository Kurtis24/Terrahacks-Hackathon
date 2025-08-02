import React from "react";
import { PipeData, convertGridToPipes } from "@/utils/pipes";

/**
 * Component to render a single pipe piece
 */
function PipePiece({ pipe }: { pipe: PipeData }) {
  return (
    <mesh
      position={pipe.position}
      rotation={pipe.rotation}
      geometry={pipe.geometry}
    >
      <meshStandardMaterial
        color={pipe.color}
        metalness={0.6}
        roughness={0.2}
      />
    </mesh>
  );
}

/**
 * Component to render an entire pipe network from grid data
 */
function PipeNetwork({
  gridData,
  yOffset = 0,
}: {
  gridData: number[][];
  yOffset?: number;
}) {
  const pipes = convertGridToPipes(gridData, {
    spacing: 1.0,
    centerGrid: true,
    yOffset,
  });

  return (
    <group>
      {pipes.map((pipe) => (
        <PipePiece key={pipe.key} pipe={pipe} />
      ))}
    </group>
  );
}

export { PipePiece, PipeNetwork };
