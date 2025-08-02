import GridDemo from "@/components/GridDemo";
import Link from "next/link";

export default function GridDemoPage() {
  return (
    <div className="relative">
      <Link
        href="/"
        className="absolute top-4 right-4 z-30 bg-red-600/80 backdrop-blur-sm border border-red-400/50 text-white px-4 py-2 rounded-lg hover:bg-red-700/80 transition-colors"
      >
        ← Back to Home
      </Link>
      <GridDemo />
    </div>
  );
}

export const metadata = {
  title: "Grid to 3D Demo - TerraHacks",
  description:
    "Interactive demo showing how to convert 2D arrays to 3D cube arrangements",
};
