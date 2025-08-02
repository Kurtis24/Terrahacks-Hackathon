// Simple debug test to see what pipe types are being generated
export const debugGrid = [
  [1, 1, 1],
  [0, 1, 0],
  [0, 1, 0],
];

// Expected results:
// [0,0] = end (1 connection - east)
// [0,1] = straight (2 connections - east/west)
// [0,2] = l-shape (2 connections - west/south)
// [1,1] = straight (2 connections - north/south)
// [2,1] = end (1 connection - north)
