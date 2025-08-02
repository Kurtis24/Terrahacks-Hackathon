import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function renderSingleStrandDNA(
  dnaArray: number[][],
  containerId: string
) {
  // Clear existing content
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({ antialias: true });

  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  camera.position.z = 35;

  // Add OrbitControls for user interaction
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.enablePan = true;

  // Geometries
  const sugarGeometry = new THREE.SphereGeometry(0.8, 32, 32); // Sphere for pentose sugar
  const baseGeometry = new THREE.CylinderGeometry(0.4, 0.4, 2, 32); // Smaller cylinder for nitrogenous bases
  const connectionGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 16); // Thin cylinder for connections

  // Materials for different nucleotides
  const sugarMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White for sugar
  const connectionMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White for connections
  const basePairMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 }); // Gray for base pair connections
  const adenineMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red for adenine
  const thymineMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff }); // Blue for thymine
  const cytosineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green for cytosine
  const guanineMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow for guanine

  const dnaStrand = new THREE.Object3D();
  const holder = new THREE.Object3D();

  // Store nucleotide positions and their array coordinates for proper path connections
  const nucleotideData: {
    position: THREE.Vector3;
    row: number;
    col: number;
    type: number; // Original type (1-4 or 11-14)
    baseType: number; // Base type (1-4)
    isDoubleDNA: boolean; // Whether this is double-digit DNA
    nucleotideGroup: THREE.Object3D; // Store reference to the nucleotide group for rotation
    rotationSpeed: { x: number; y: number; z: number }; // Individual rotation speeds for breeze effect
    isPaired: boolean; // Flag to indicate if this nucleotide is part of a base pair
  }[] = [];

  // Variables for mouse interaction
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let isDragging = false;
  let selectedNucleotide: THREE.Object3D | null = null;
  let previousMousePosition = { x: 0, y: 0 };

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
      const sugar = new THREE.Mesh(sugarGeometry, sugarMaterial);
      sugar.userData = { type: "sugar", nucleotideGroup }; // Store reference for raycasting
      nucleotideGroup.add(sugar);

      // Generate random rotation speeds for gentle breeze effect
      const rotationSpeed = {
        x: (Math.random() - 0.5) * 0.02, // Very slow rotation around X axis
        y: (Math.random() - 0.5) * 0.02, // Very slow rotation around Y axis
        z: (Math.random() - 0.5) * 0.02, // Even slower rotation around Z axis
      };

      // Store nucleotide data with group reference and rotation speed
      nucleotideData.push({
        position,
        row,
        col,
        type: nucleotideType, // Keep original type (single or double digit)
        baseType, // The actual base type (1-4)
        isDoubleDNA, // Whether this is a double-digit nucleotide
        nucleotideGroup,
        rotationSpeed,
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
      return (
        (baseType1 === 1 && baseType2 === 2) || // Adenine pairs with Thymine
        (baseType1 === 2 && baseType2 === 1) || // Thymine pairs with Adenine
        (baseType1 === 3 && baseType2 === 4) || // Cytosine pairs with Guanine
        (baseType1 === 4 && baseType2 === 3)
      ); // Guanine pairs with Cytosine
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
      base.userData = {
        type: "base",
        nucleotideGroup: current.nucleotideGroup,
      };

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
      switch (current.type) {
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
      base.userData = {
        type: "base",
        nucleotideGroup: current.nucleotideGroup,
      };

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

        // Create connection cylinder
        const connection = new THREE.Mesh(
          connectionGeometry,
          connectionMaterial
        );

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

  // Center the DNA strand
  dnaStrand.position.y = 0;
  holder.add(dnaStrand);
  scene.add(holder);

  // Mouse interaction handlers for individual nucleotide rotation
  const onMouseDown = (event: MouseEvent) => {
    event.preventDefault();

    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Perform raycasting to find intersected objects
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(dnaStrand.children, true);

    if (intersects.length > 0) {
      const intersected = intersects[0].object as THREE.Mesh;
      if (intersected.userData.nucleotideGroup) {
        selectedNucleotide = intersected.userData.nucleotideGroup;
        isDragging = true;
        previousMousePosition = { x: event.clientX, y: event.clientY };

        // Disable OrbitControls while dragging nucleotide
        controls.enabled = false;

        // Prevent the event from bubbling to OrbitControls
        event.stopPropagation();
      }
    }
  };

  const onMouseMove = (event: MouseEvent) => {
    if (!isDragging || !selectedNucleotide) return;

    event.preventDefault();

    // Calculate mouse movement
    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;

    // Convert mouse movement to rotation
    const rotationSpeed = 0.01;
    selectedNucleotide.rotation.y += deltaX * rotationSpeed;
    selectedNucleotide.rotation.x += deltaY * rotationSpeed;

    previousMousePosition = { x: event.clientX, y: event.clientY };
  };

  const onMouseUp = () => {
    isDragging = false;
    selectedNucleotide = null;
    controls.enabled = true; // Re-enable OrbitControls
  };

  // Add event listeners
  renderer.domElement.addEventListener("mousedown", onMouseDown);
  renderer.domElement.addEventListener("mousemove", onMouseMove);
  renderer.domElement.addEventListener("mouseup", onMouseUp);
  renderer.domElement.addEventListener("mouseleave", onMouseUp); // Handle mouse leaving canvas

  // Animation loop (with gentle breeze rotation)
  function animate() {
    requestAnimationFrame(animate);

    // Apply gentle breeze rotation to each nucleotide
    nucleotideData.forEach((nucleotide) => {
      // Only apply automatic rotation if this nucleotide is not being manually dragged AND is not part of a base pair
      if (
        nucleotide.nucleotideGroup !== selectedNucleotide &&
        !nucleotide.isPaired
      ) {
        nucleotide.nucleotideGroup.rotation.x += nucleotide.rotationSpeed.x;
        nucleotide.nucleotideGroup.rotation.y += nucleotide.rotationSpeed.y;
        nucleotide.nucleotideGroup.rotation.z += nucleotide.rotationSpeed.z;
      }
    });

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

  return () => {
    window.removeEventListener("resize", handleResize);
    renderer.domElement.removeEventListener("mousedown", onMouseDown);
    renderer.domElement.removeEventListener("mousemove", onMouseMove);
    renderer.domElement.removeEventListener("mouseup", onMouseUp);
    renderer.domElement.removeEventListener("mouseleave", onMouseUp);
    controls.dispose(); // Clean up controls
    container.innerHTML = "";
  };
}
