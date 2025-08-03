import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function renderSingleStrandDNA(
  dnaArray: number[][],
  containerId: string,
  onHover?: (
    hoverInfo: {
      nucleotideType: number;
      baseType: number;
      isDoubleDNA: boolean;
      position: { row: number; col: number };
      category: "main_snake" | "collision_branch";
    } | null
  ) => void
): {
  cleanup: () => void;
  stats: {
    mainSnake: { A: number; T: number; C: number; G: number; total: number };
    collisionBranches: {
      A: number;
      T: number;
      C: number;
      G: number;
      total: number;
    };
  };
} {
  // Clear existing content and dispose of previous Three.js objects
  const container = document.getElementById(containerId);
  if (!container)
    return {
      cleanup: () => {},
      stats: {
        mainSnake: { A: 0, T: 0, C: 0, G: 0, total: 0 },
        collisionBranches: { A: 0, T: 0, C: 0, G: 0, total: 0 },
      },
    };

  // Initialize nucleotide statistics
  const stats = {
    mainSnake: { A: 0, T: 0, C: 0, G: 0, total: 0 },
    collisionBranches: { A: 0, T: 0, C: 0, G: 0, total: 0 },
  };

  // Helper function to get nucleotide name
  const getNucleotideName = (baseType: number): "A" | "T" | "C" | "G" => {
    switch (baseType) {
      case 1:
        return "A"; // Adenine
      case 2:
        return "T"; // Thymine
      case 3:
        return "C"; // Cytosine
      case 4:
        return "G"; // Guanine
      default:
        return "A";
    }
  };

  // Helper function to update stats
  const updateStats = (baseType: number, isDoubleDNA: boolean) => {
    const nucleotideName = getNucleotideName(baseType);
    const category = isDoubleDNA ? stats.collisionBranches : stats.mainSnake;
    category[nucleotideName]++;
    category.total++;
  };

  // Clean up any existing Three.js content
  while (container.firstChild) {
    const child = container.firstChild as HTMLElement;
    // If it's a canvas element from Three.js, clean it up properly
    if (child instanceof HTMLCanvasElement) {
      const renderer = (
        child as HTMLCanvasElement & { __three_renderer?: THREE.WebGLRenderer }
      ).__three_renderer;
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
      }
    }
    container.removeChild(child);
  }

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    2000 // Increased far clipping plane from 1000 to 2000
  );
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance", // Prefer high performance GPU
  });

  // Store renderer reference for cleanup
  (
    renderer.domElement as HTMLCanvasElement & {
      __three_renderer?: THREE.WebGLRenderer;
    }
  ).__three_renderer = renderer;

  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  camera.position.z = 50; // Moved closer from

  // Add OrbitControls for user interaction
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.enablePan = true;

  // Optimized geometries with lower detail for better performance
  const sugarGeometry = new THREE.SphereGeometry(0.8, 16, 16); // Reduced from 32x32 to 16x16
  const baseGeometry = new THREE.CylinderGeometry(0.4, 0.4, 3, 16); // Reduced from 32 to 16
  const connectionGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1, 8); // Reduced from 16 to 8

  // Materials for different nucleotides
  const sugarMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White for sugar
  const pinkSugarMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Bright pink for double-digit nucleotides
  const connectionMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White for connections
  const pinkConnectionMaterial = new THREE.MeshBasicMaterial({
    color: 0xff00ff,
  }); // Pink for connections to collision nucleotides
  const basePairMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 }); // Gray for base pair connections
  const adenineMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red for adenine
  const thymineMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // Blue for thymine
  const cytosineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green for cytosine
  const guanineMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow for guanine

  // Store all materials for cleanup
  const allMaterials = [
    sugarMaterial,
    pinkSugarMaterial,
    connectionMaterial,
    pinkConnectionMaterial,
    basePairMaterial,
    adenineMaterial,
    thymineMaterial,
    cytosineMaterial,
    guanineMaterial,
  ];

  // Store all geometries for cleanup
  const allGeometries = [sugarGeometry, baseGeometry, connectionGeometry];

  const dnaStrand = new THREE.Object3D();
  const holder = new THREE.Object3D();

  // Store nucleotide positions and their array coordinates for proper path connections
  const nucleotideData: {
    position: THREE.Vector3;
    originalPosition: THREE.Vector3; // Store original position for subtle movement
    row: number;
    col: number;
    type: number; // Original type (1-4 or 11-14)
    baseType: number; // Base type (1-4)
    isDoubleDNA: boolean; // Whether this is double-digit DNA
    nucleotideGroup: THREE.Object3D; // Store reference to the nucleotide group for rotation
    rotationSpeed: { x: number; y: number; z: number }; // Base rotation speeds
    waveOffset: number; // Wave offset for synchronized animation
    isPaired: boolean; // Flag to indicate if this nucleotide is part of a base pair
  }[] = [];

  // Pre-calculate constants for animation to avoid repeated calculations
  const TIME_SCALE = 0.001;
  const WAVE_SPEED = 0.5;
  const POSITION_AMPLITUDE = 0.3;
  const PHASE_OFFSET_Y = Math.PI / 4;
  const PHASE_OFFSET_Z = Math.PI / 2;
  const PHASE_OFFSET_POS_Y = Math.PI / 3;
  const PHASE_OFFSET_POS_Z = Math.PI / 6;

  // First pass: Create all nucleotides and store their data
  for (let row = 0; row < dnaArray.length; row++) {
    for (let col = 0; col < dnaArray[row].length; col++) {
      const nucleotideType = dnaArray[row][col];

      if (nucleotideType === 0) continue; // Skip empty positions

      // Map double-digit nucleotides to their base type (11->1, 12->2, etc.)
      const baseType =
        nucleotideType > 10 ? nucleotideType - 10 : nucleotideType;
      const isDoubleDNA = nucleotideType > 10;

      // Position the nucleotide in 3D space following the 2D path
      const posX = (col - dnaArray[row].length / 2) * 6;
      const posY = (dnaArray.length / 2 - row) * 6;
      const posZ = 0;
      const position = new THREE.Vector3(posX, posY, posZ);

      // Create nucleotide group for individual rotation
      const nucleotideGroup = new THREE.Object3D();
      nucleotideGroup.position.copy(position);

      // Create sugar backbone (sphere)
      const sugar = new THREE.Mesh(
        sugarGeometry,
        isDoubleDNA ? pinkSugarMaterial : sugarMaterial
      );
      nucleotideGroup.add(sugar);

      // Update nucleotide statistics
      updateStats(baseType, isDoubleDNA);

      // Add hover functionality to the sugar backbone
      const hoverInfo = {
        nucleotideType,
        baseType,
        isDoubleDNA,
        position: { row, col },
        category: isDoubleDNA
          ? ("collision_branch" as const)
          : ("main_snake" as const),
      };

      // Add mouse event listeners for hover
      sugar.userData = hoverInfo;
      nucleotideGroup.userData = hoverInfo;

      // Generate wave-based rotation speeds for synchronized wave effect
      const rotationSpeed = {
        x: 0.0, // no speed
        y: 1,
        z: 1,
      };

      // Calculate wave offset based on position for synchronized wave effect
      const waveOffset = posX * 0.02 + posY * 0.02; // Simplified wave pattern based on position

      // Store nucleotide data with group reference and rotation speed
      nucleotideData.push({
        position,
        originalPosition: position.clone(), // Store original position
        row,
        col,
        type: nucleotideType, // Keep original type (single or double digit)
        baseType, // The actual base type (1-4)
        isDoubleDNA, // Whether this is a double-digit nucleotide
        nucleotideGroup,
        rotationSpeed,
        waveOffset, // Store wave offset
        isPaired: false, // Initialize as unpaired, will be updated when base pairs are found
      });

      dnaStrand.add(nucleotideGroup);
    }
  }

  // Sort nucleotides by their position in the array to create proper path order
  // Instead of row-major order, we need to find the actual path through the DNA

  // Create a path by connecting adjacent nucleotides
  const createPath = (nucleotides: typeof nucleotideData) => {
    const path = [];
    const used = new Set<number>();

    // Start with the first nucleotide (top-left-most)
    const current = nucleotides.reduce(
      (min, nuc, index) =>
        nuc.row < min.nuc.row ||
        (nuc.row === min.nuc.row && nuc.col < min.nuc.col)
          ? { nuc, index }
          : min,
      { nuc: nucleotides[0], index: 0 }
    );

    path.push(current.nuc);
    used.add(current.index);

    // Build path by finding adjacent nucleotides
    while (path.length < nucleotides.length) {
      const currentNuc = path[path.length - 1];
      let nextIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < nucleotides.length; i++) {
        if (used.has(i)) continue;

        const nuc = nucleotides[i];
        const rowDiff = Math.abs(currentNuc.row - nuc.row);
        const colDiff = Math.abs(currentNuc.col - nuc.col);

        // Check if adjacent (horizontally or vertically)
        if (
          (rowDiff === 1 && colDiff === 0) ||
          (rowDiff === 0 && colDiff === 1)
        ) {
          const distance = currentNuc.position.distanceTo(nuc.position);
          if (distance < minDistance) {
            minDistance = distance;
            nextIndex = i;
          }
        }
      }

      if (nextIndex === -1) break; // No more adjacent nucleotides found

      path.push(nucleotides[nextIndex]);
      used.add(nextIndex);
    }

    return path;
  };

  const pathOrder = createPath(nucleotideData);

  // Helper function to find base pairs between single and double-digit nucleotides
  const findBasePairs = (nucleotides: typeof nucleotideData) => {
    const pairs: Array<{
      nuc1: (typeof nucleotides)[0];
      nuc2: (typeof nucleotides)[0];
    }> = [];
    const usedInPairs = new Set<number>();

    // Helper function to check if two base types are complementary
    const areComplementary = (baseType1: number, baseType2: number) => {
      return true; // Guanine pairs with Cytosine
    };

    // Look for complementary base pairs between single and double-digit nucleotides
    for (let i = 0; i < nucleotides.length; i++) {
      if (usedInPairs.has(i)) continue;

      const nuc1 = nucleotides[i];

      for (let j = i + 1; j < nucleotides.length; j++) {
        if (usedInPairs.has(j)) continue;

        const nuc2 = nucleotides[j];

        // Check if nucleotides are in adjacent rows with same column
        const adjacentRows =
          Math.abs(nuc1.row - nuc2.row) === 1 && nuc1.col === nuc2.col;

        // Check if one is single-digit and other is double-digit
        const oneIsSingle = nuc1.isDoubleDNA !== nuc2.isDoubleDNA;

        // Check if they are complementary bases
        const complementary = areComplementary(nuc1.baseType, nuc2.baseType);

        if (adjacentRows && oneIsSingle && complementary) {
          pairs.push({ nuc1, nuc2 });
          usedInPairs.add(i);
          usedInPairs.add(j);

          // Mark both nucleotides as paired
          nuc1.isPaired = true;
          nuc2.isPaired = true;

          break;
        }
      }
    }

    return { pairs, usedInPairs };
  };

  const { pairs: basePairs } = findBasePairs(nucleotideData);

  // Second pass: Create nucleotide bases with special handling for base pairs
  for (let i = 0; i < nucleotideData.length; i++) {
    const current = nucleotideData[i];

    // Check if this nucleotide is part of a base pair
    const basePair = basePairs.find(
      (pair) => pair.nuc1 === current || pair.nuc2 === current
    );

    if (basePair) {
      // This nucleotide is part of a base pair - orient bases to face each other
      const partner = basePair.nuc1 === current ? basePair.nuc2 : basePair.nuc1;

      // Calculate direction from this nucleotide to its partner
      const toPartner = new THREE.Vector3()
        .subVectors(partner.position, current.position)
        .normalize();

      // Base should point toward the partner (inward)
      const baseDirection = toPartner.clone();

      // Create nitrogenous base oriented toward partner
      let baseMaterial;
      switch (
        current.baseType // Use baseType instead of type
      ) {
        case 1:
          baseMaterial = adenineMaterial;
          break;
        case 2:
          baseMaterial = thymineMaterial;
          break;
        case 3:
          baseMaterial = cytosineMaterial;
          break;
        case 4:
          baseMaterial = guanineMaterial;
          break;
        default:
          continue;
      }

      const base = new THREE.Mesh(baseGeometry, baseMaterial);

      // Position base offset toward partner (inward)
      const baseOffset = baseDirection.clone().multiplyScalar(1.5);
      base.position.copy(baseOffset);

      // Rotate base to align with direction toward partner
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        baseDirection
      );
      base.setRotationFromQuaternion(quaternion);

      current.nucleotideGroup.add(base);
    } else {
      // Regular single-strand nucleotide - use original perpendicular orientation

      // Calculate strand direction at this nucleotide
      let strandDirection = new THREE.Vector3(1, 0, 0); // Default direction (right)

      // Find this nucleotide's position in the pathOrder (if it exists)
      const pathIndex = pathOrder.findIndex((nuc) => nuc === current);

      if (pathIndex !== -1) {
        // This nucleotide is part of the connected path
        if (pathIndex > 0 && pathIndex < pathOrder.length - 1) {
          // For middle nucleotides, use average direction from prev to next
          const prev = pathOrder[pathIndex - 1];
          const next = pathOrder[pathIndex + 1];
          strandDirection = new THREE.Vector3()
            .subVectors(next.position, prev.position)
            .normalize();
        } else if (pathIndex > 0) {
          // For last nucleotide, use direction from previous
          const prev = pathOrder[pathIndex - 1];
          strandDirection = new THREE.Vector3()
            .subVectors(current.position, prev.position)
            .normalize();
        } else if (pathIndex < pathOrder.length - 1) {
          // For first nucleotide, use direction to next
          const next = pathOrder[pathIndex + 1];
          strandDirection = new THREE.Vector3()
            .subVectors(next.position, current.position)
            .normalize();
        }
      } else {
        // This nucleotide is isolated - use default direction or look for nearby nucleotides
        // For isolated nucleotides, use a consistent direction based on their position
        if (current.col === 0) {
          // First column - point bases to the right
          strandDirection = new THREE.Vector3(1, 0, 0);
        } else {
          // Other isolated nucleotides - use default direction
          strandDirection = new THREE.Vector3(1, 0, 0);
        }
      }

      // Calculate perpendicular direction for the base
      // We want the base to stick out perpendicular to the strand direction
      const perpendicular = new THREE.Vector3();

      // Determine the perpendicular direction based on strand direction
      if (Math.abs(strandDirection.x) > Math.abs(strandDirection.y)) {
        // Horizontal movement (left/right) - base should point up/down
        if (strandDirection.x > 0) {
          // Moving right - base points down (negative Y)
          perpendicular.set(0, -1, 0);
        } else {
          // Moving left - base points up (positive Y)
          perpendicular.set(0, 1, 0);
        }
      } else {
        // Vertical movement (up/down) - base should point left/right
        if (strandDirection.y > 0) {
          // Moving up - base points right (positive X)
          perpendicular.set(1, 0, 0);
        } else {
          // Moving down - base points left (negative X)
          perpendicular.set(-1, 0, 0);
        }
      }

      // For diagonal movements, choose based on the dominant direction
      if (
        Math.abs(strandDirection.x) > 0.5 &&
        Math.abs(strandDirection.y) > 0.5
      ) {
        // Diagonal movement - choose perpendicular based on quadrant
        if (strandDirection.x > 0 && strandDirection.y > 0) {
          // Northeast - base points southeast
          perpendicular.set(0.707, -0.707, 0).normalize();
        } else if (strandDirection.x < 0 && strandDirection.y > 0) {
          // Northwest - base points southwest
          perpendicular.set(-0.707, -0.707, 0).normalize();
        } else if (strandDirection.x < 0 && strandDirection.y < 0) {
          // Southwest - base points northwest
          perpendicular.set(-0.707, 0.707, 0).normalize();
        } else {
          // Southeast - base points northeast
          perpendicular.set(0.707, 0.707, 0).normalize();
        }
      }

      // Create nitrogenous base oriented perpendicular to strand direction
      let baseMaterial;
      switch (
        current.baseType // Use baseType instead of type so 11->1, 12->2, etc.
      ) {
        case 1:
          baseMaterial = adenineMaterial;
          break;
        case 2:
          baseMaterial = thymineMaterial;
          break;
        case 3:
          baseMaterial = cytosineMaterial;
          break;
        case 4:
          baseMaterial = guanineMaterial;
          break;
        default:
          continue;
      }

      const base = new THREE.Mesh(baseGeometry, baseMaterial);

      // Position base offset from sugar in perpendicular direction (relative to nucleotide group)
      const baseOffset = perpendicular.clone().multiplyScalar(1.5);
      base.position.copy(baseOffset);

      // Rotate base to align with perpendicular direction
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        perpendicular
      );
      base.setRotationFromQuaternion(quaternion);

      // Add base to the nucleotide group (not directly to dnaStrand)
      current.nucleotideGroup.add(base);
    }
  }

  // Add base pair connections (horizontal bonds between paired bases)
  basePairs.forEach((pair) => {
    const distance = pair.nuc1.position.distanceTo(pair.nuc2.position);
    const direction = new THREE.Vector3()
      .subVectors(pair.nuc2.position, pair.nuc1.position)
      .normalize();

    // Create connection cylinder between base pairs
    const basePairConnection = new THREE.Mesh(
      connectionGeometry,
      basePairMaterial
    );

    // Scale to match distance
    basePairConnection.scale.y = distance;

    // Position at midpoint
    const midpoint = new THREE.Vector3()
      .addVectors(pair.nuc1.position, pair.nuc2.position)
      .multiplyScalar(0.5);
    basePairConnection.position.copy(midpoint);

    // Rotate to align with direction
    const axis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      axis,
      direction
    );
    basePairConnection.setRotationFromQuaternion(quaternion);

    dnaStrand.add(basePairConnection);
  });

  // Third pass: Create connections between ALL adjacent nucleotides
  for (let i = 0; i < nucleotideData.length; i++) {
    const current = nucleotideData[i];

    // Find all adjacent nucleotides to this one
    for (let j = i + 1; j < nucleotideData.length; j++) {
      const other = nucleotideData[j];

      // Check if they are adjacent in the grid (horizontally or vertically)
      const rowDiff = Math.abs(current.row - other.row);
      const colDiff = Math.abs(current.col - other.col);

      if (
        (rowDiff === 1 && colDiff === 0) ||
        (rowDiff === 0 && colDiff === 1)
      ) {
        // Calculate distance and direction
        const distance = current.position.distanceTo(other.position);
        const direction = new THREE.Vector3()
          .subVectors(other.position, current.position)
          .normalize();

        // Use pink connection material if either nucleotide is a collision nucleotide
        const connectionMat =
          current.isDoubleDNA || other.isDoubleDNA
            ? pinkConnectionMaterial
            : connectionMaterial;

        // Create connection cylinder
        const connection = new THREE.Mesh(connectionGeometry, connectionMat);

        // Scale to match distance
        connection.scale.y = distance;

        // Position at midpoint
        const midpoint = new THREE.Vector3()
          .addVectors(current.position, other.position)
          .multiplyScalar(0.5);
        connection.position.copy(midpoint);

        // Rotate to align with direction
        const axis = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          axis,
          direction
        );
        connection.setRotationFromQuaternion(quaternion);

        dnaStrand.add(connection);
      }
    }
  }

  // Center the DNA strand based on actual nucleotide positions
  if (nucleotideData.length > 0) {
    // Calculate bounding box of all nucleotides
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    nucleotideData.forEach((nuc) => {
      minX = Math.min(minX, nuc.position.x);
      maxX = Math.max(maxX, nuc.position.x);
      minY = Math.min(minY, nuc.position.y);
      maxY = Math.max(maxY, nuc.position.y);
      minZ = Math.min(minZ, nuc.position.z);
      maxZ = Math.max(maxZ, nuc.position.z);
    });

    // Calculate center offset
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Apply centering offset to the DNA strand
    dnaStrand.position.set(-centerX, -centerY, -centerZ);
  } else {
    // Fallback to original centering
    dnaStrand.position.y = 0;
  }

  holder.add(dnaStrand);
  scene.add(holder);

  // Calculate camera position to frame middle 150x150 area
  const frameSize = 150; // Target frame size in grid units
  const unitSpacing = 6; // Spacing between nucleotides
  const worldFrameSize = frameSize * unitSpacing; // 900 world units

  // Calculate camera distance needed to frame the target area
  const fov = camera.fov * (Math.PI / 180); // Convert to radians
  const cameraDistance = worldFrameSize / 2 / Math.tan(fov / 2);

  // Reset camera position and controls to center on the middle 150x150 area
  camera.position.set(0, 0, Math.max(cameraDistance, 35)); // Ensure minimum distance
  controls.target.set(0, 0, 0);
  controls.update();

  // Animation loop (optimized for performance and memory usage)
  let lastTime = 0;
  let animationId: number;
  const targetFPS = 60;
  const frameInterval = 1000 / targetFPS;
  let isVisible = true;
  let isSpinning = false; // Track spinning state

  // Reduce frame rate when page is not visible
  const handleVisibilityChange = () => {
    isVisible = !document.hidden;
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Add double-click event listener to toggle spinning
  const handleDoubleClick = () => {
    isSpinning = !isSpinning;
  };

  // Mouse hover detection using raycasting
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let currentHoveredObject: THREE.Object3D | null = null;

  const handleMouseMove = (event: MouseEvent) => {
    if (!container) return;

    console.log("Mouse move event detected");

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    console.log("Mouse position:", mouse.x, mouse.y);

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the ray
    const intersects = raycaster.intersectObjects(scene.children, true);

    console.log("Mouse move detected, intersects:", intersects.length);

    let newHoveredObject: THREE.Object3D | null = null;

    // Find the first intersected object that has hover data
    for (const intersect of intersects) {
      let obj = intersect.object;
      console.log("Checking object:", obj.type, obj.userData);
      // Check the object and its parent for userData
      while (obj) {
        if (obj.userData && obj.userData.nucleotideType) {
          console.log("Found nucleotide object:", obj.userData);
          newHoveredObject = obj;
          break;
        }
        obj = obj.parent as THREE.Object3D;
      }
      if (newHoveredObject) break;
    }

    // If hover changed, update the callback
    if (newHoveredObject !== currentHoveredObject) {
      console.log(
        "Hover changed:",
        currentHoveredObject,
        "->",
        newHoveredObject
      );
      currentHoveredObject = newHoveredObject;

      if (onHover) {
        if (currentHoveredObject && currentHoveredObject.userData) {
          const userData = currentHoveredObject.userData;
          console.log("Calling onHover with:", userData);
          // Type check the userData to ensure it has the expected structure
          if (
            typeof userData.nucleotideType === "number" &&
            typeof userData.baseType === "number" &&
            typeof userData.isDoubleDNA === "boolean" &&
            userData.position &&
            typeof userData.position.row === "number" &&
            typeof userData.position.col === "number" &&
            (userData.category === "main_snake" ||
              userData.category === "collision_branch")
          ) {
            onHover(
              userData as {
                nucleotideType: number;
                baseType: number;
                isDoubleDNA: boolean;
                position: { row: number; col: number };
                category: "main_snake" | "collision_branch";
              }
            );
          } else {
            console.log("userData type check failed");
            onHover(null);
          }
        } else {
          console.log("No userData, calling onHover(null)");
          onHover(null);
        }
      } else {
        console.log("onHover callback not provided");
      }
    }
  };

  const handleMouseLeave = () => {
    console.log("Mouse leave detected");
    if (currentHoveredObject) {
      currentHoveredObject = null;
      if (onHover) {
        onHover(null);
      }
    }
  };

  // Add event listeners to the canvas element, not just the renderer.domElement
  const canvas = renderer.domElement;
  canvas.addEventListener("mousemove", handleMouseMove, false);
  canvas.addEventListener("mouseleave", handleMouseLeave, false);
  canvas.addEventListener("dblclick", handleDoubleClick);

  console.log("Event listeners added to canvas:", canvas);

  // Keyboard navigation
  const keyState = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Shift: false,
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.code in keyState) {
      keyState[event.code as keyof typeof keyState] = true;
      event.preventDefault();
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.code in keyState) {
      keyState[event.code as keyof typeof keyState] = false;
      event.preventDefault();
    }
  };

  // Add keyboard event listeners
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  function animate(currentTime: number = 0) {
    animationId = requestAnimationFrame(animate);

    // Skip animation if page is not visible to save CPU/GPU
    if (!isVisible) {
      return;
    }

    // Throttle to target FPS for consistent performance
    if (currentTime - lastTime < frameInterval) {
      return;
    }
    lastTime = currentTime;

    // Get current time for wave animation (calculate once)
    const time = currentTime * TIME_SCALE;

    // Add slow spinning rotation to the entire DNA strand (shawarma effect) - only if spinning is enabled
    if (isSpinning) {
      dnaStrand.rotation.y += 0.1; // Adjust speed as needed (0.01 = slow, 0.02 = faster)
    }

    // Handle keyboard navigation
    const panSpeed = 2;
    const zoomSpeed = 2;
    const rotateSpeed = 1;

    if (keyState.Shift) {
      // Shift modifier: zoom and rotate
      if (keyState.ArrowUp) {
        // Zoom in
        camera.position.multiplyScalar(1 - zoomSpeed * 0.01);
      }
      if (keyState.ArrowDown) {
        // Zoom out
        camera.position.multiplyScalar(1 + zoomSpeed * 0.01);
      }
      if (keyState.ArrowLeft) {
        // Rotate left around target
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position.clone().sub(controls.target));
        spherical.theta += rotateSpeed;
        camera.position.copy(
          new THREE.Vector3().setFromSpherical(spherical).add(controls.target)
        );
        camera.lookAt(controls.target);
      }
      if (keyState.ArrowRight) {
        // Rotate right around target
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position.clone().sub(controls.target));
        spherical.theta -= rotateSpeed;
        camera.position.copy(
          new THREE.Vector3().setFromSpherical(spherical).add(controls.target)
        );
        camera.lookAt(controls.target);
      }
    } else {
      // Normal mode: pan
      const cameraRight = new THREE.Vector3();
      const cameraUp = new THREE.Vector3();

      // Get camera's right and up vectors for proper panning
      camera.getWorldDirection(new THREE.Vector3()); // Update camera matrix
      cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      cameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

      if (keyState.ArrowUp) {
        // Pan up
        camera.position.add(cameraUp.clone().multiplyScalar(panSpeed));
        controls.target.add(cameraUp.clone().multiplyScalar(panSpeed));
      }
      if (keyState.ArrowDown) {
        // Pan down
        camera.position.add(cameraUp.clone().multiplyScalar(-panSpeed));
        controls.target.add(cameraUp.clone().multiplyScalar(-panSpeed));
      }
      if (keyState.ArrowLeft) {
        // Pan left
        camera.position.add(cameraRight.clone().multiplyScalar(-panSpeed));
        controls.target.add(cameraRight.clone().multiplyScalar(-panSpeed));
      }
      if (keyState.ArrowRight) {
        // Pan right
        camera.position.add(cameraRight.clone().multiplyScalar(panSpeed));
        controls.target.add(cameraRight.clone().multiplyScalar(panSpeed));
      }
    }

    // Apply synchronized wave rotation and position to each nucleotide
    for (let i = 0; i < nucleotideData.length; i++) {
      const nucleotide = nucleotideData[i];

      // Pre-calculate common values
      const baseWave = time + nucleotide.waveOffset;
      const sinBase = Math.sin(baseWave);
      const sinY = Math.sin(baseWave + PHASE_OFFSET_Y);
      const sinZ = Math.sin(baseWave + PHASE_OFFSET_Z);

      // Apply wave rotation (only if not paired to maintain bonds)
      if (!nucleotide.isPaired) {
        nucleotide.nucleotideGroup.rotation.x =
          sinBase * nucleotide.rotationSpeed.x;
        nucleotide.nucleotideGroup.rotation.y =
          sinY * nucleotide.rotationSpeed.y;
        nucleotide.nucleotideGroup.rotation.z =
          sinZ * nucleotide.rotationSpeed.z;
      }

      // Apply subtle position movement
      const posWaveTime = time * WAVE_SPEED + nucleotide.waveOffset;
      const posX =
        nucleotide.originalPosition.x +
        Math.sin(posWaveTime) * POSITION_AMPLITUDE;
      const posY =
        nucleotide.originalPosition.y +
        Math.sin(posWaveTime + PHASE_OFFSET_POS_Y) * POSITION_AMPLITUDE;
      const posZ =
        nucleotide.originalPosition.z +
        Math.sin(posWaveTime + PHASE_OFFSET_POS_Z) * POSITION_AMPLITUDE * 0.5;

      nucleotide.nucleotideGroup.position.set(posX, posY, posZ);
    }

    controls.update(); // Update controls for damping
    renderer.render(scene, camera);
  }

  animate();

  // Handle window resize
  const handleResize = () => {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };

  window.addEventListener("resize", handleResize);

  // Enhanced cleanup function to prevent memory leaks
  const cleanup = () => {
    // Cancel animation frame
    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    // Remove event listeners
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    canvas.removeEventListener("dblclick", handleDoubleClick);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    canvas.removeEventListener("mousemove", handleMouseMove);
    canvas.removeEventListener("mouseleave", handleMouseLeave);

    // Dispose of controls
    controls.dispose();

    // Dispose of all geometries
    allGeometries.forEach((geometry) => geometry.dispose());

    // Dispose of all materials
    allMaterials.forEach((material) => material.dispose());

    // Recursively dispose of all objects in the scene
    const disposeObject = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((material) => material.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
      // Dispose of children
      while (obj.children.length > 0) {
        const child = obj.children[0];
        obj.remove(child);
        disposeObject(child);
      }
    };

    disposeObject(scene);

    // Dispose of renderer
    renderer.dispose();
    renderer.forceContextLoss();

    // Clear the container
    if (container) {
      container.innerHTML = "";
    }

    // Force garbage collection hint (if available)
    if (window.gc) {
      window.gc();
    }
  };

  return { cleanup, stats };
}
