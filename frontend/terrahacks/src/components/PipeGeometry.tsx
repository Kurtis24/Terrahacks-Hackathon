import React from "react";
import { Cylinder, Sphere } from "@react-three/drei";
import { PipeData } from "@/utils/convert";

interface PipeSegmentProps {
  pipe: PipeData;
  radius?: number;
}

/**
 * Simple pipe rendering: each pipe position gets a sphere connector
 * with cylinder segments extending only to connected neighbors
 */
export function PipeSegment({ pipe, radius = 0.08 }: PipeSegmentProps) {
  const { position, color, connections } = pipe;

  const material = (
    <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
  );
  const connectorMaterial = (
    <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
  );

  // Count connections to determine pipe type
  const connectionCount = Object.values(connections).filter(Boolean).length;

  return (
    <group position={position}>
      {/* For edge pieces (1 connection), show as end-cap cylinder */}
      {connectionCount === 1 && (
        <>
          {connections.north && (
            <Cylinder
              args={[radius, radius, 0.5]}
              position={[0, 0, -0.25]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              {material}
            </Cylinder>
          )}
          {connections.south && (
            <Cylinder
              args={[radius, radius, 0.5]}
              position={[0, 0, 0.25]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              {material}
            </Cylinder>
          )}
          {connections.east && (
            <Cylinder
              args={[radius, radius, 0.5]}
              position={[0.25, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              {material}
            </Cylinder>
          )}
          {connections.west && (
            <Cylinder
              args={[radius, radius, 0.5]}
              position={[-0.25, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              {material}
            </Cylinder>
          )}
          {/* End cap */}
          <Cylinder args={[radius * 1.5, radius * 1.5, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
            {connectorMaterial}
          </Cylinder>
        </>
      )}

      {/* For junction pieces (2+ connections), show sphere connector with extending pipes */}
      {connectionCount > 1 && (
        <>
          {/* Central connector sphere */}
          <Sphere args={[radius * 1.5]}>{connectorMaterial}</Sphere>

          {/* Pipe segments extending to connections */}
          {connections.north && (
            <Cylinder
              args={[radius, radius, 0.45]}
              position={[0, 0, -0.475]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              {material}
            </Cylinder>
          )}

          {connections.south && (
            <Cylinder
              args={[radius, radius, 0.45]}
              position={[0, 0, 0.475]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              {material}
            </Cylinder>
          )}

          {connections.east && (
            <Cylinder
              args={[radius, radius, 0.45]}
              position={[0.475, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              {material}
            </Cylinder>
          )}

          {connections.west && (
            <Cylinder
              args={[radius, radius, 0.45]}
              position={[-0.475, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              {material}
            </Cylinder>
          )}
        </>
      )}

      {/* For isolated pieces (0 connections), show as standalone cylinder */}
      {connectionCount === 0 && (
        <Cylinder args={[radius * 1.5, radius * 1.5, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          {material}
        </Cylinder>
      )}
    </group>
  );
}

/**
 * Renders a grid of connected pipes
 */
export function PipeGrid({
  pipes,
  radius = 0.08,
}: {
  pipes: PipeData[];
  radius?: number;
}) {
  return (
    <group>
      {pipes.map((pipe) => (
        <PipeSegment key={pipe.key} pipe={pipe} radius={radius} />
      ))}
    </group>
  );
}
