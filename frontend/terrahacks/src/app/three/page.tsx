import ThreeScene from "@/components/three";
import Link from "next/link";

export default function ThreePage() {
  return (
    <div className="relative">
      <Link
        href="/"
        className="absolute top-4 right-4 z-20 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
      >
        ← Back to Home
      </Link>
      <ThreeScene />
    </div>
  );
}
