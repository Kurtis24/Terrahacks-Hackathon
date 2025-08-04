# Terrahacks-Hackathon

Learn more about the project on the [DevPost](https://devpost.com/software/genomeworks?ref_content=user-portfolio&ref_feature=in_progress).

## Youtube

[![Watch the video](https://img.youtube.com/vi/N8X2oWvuaNU/hqdefault.jpg)](https://www.youtube.com/watch?v=N8X2oWvuaNU)

## Inspiration
DNA origami is a unique art form just waiting for its canvas. Our initial spark came from Mark Rober’s “world’s smallest Nerf gun,” which creatively introduced the concept of nanoscale design. DNA origami, first pioneered in 2006, remains a relatively untouched yet powerful method for building regenerative tools in nanotechnology. It's a niche field in biomedical design that we felt deserved more exposure. We wanted to open the door to the next generation of biotech AI applications by making this powerful design process accessible to more people.

## What it does
NanoWorks is a 3D design tool built to design DNA origami. It caters to everyone, from biomedical professionals aiming to accelerate their research, to students curious about nanotechnology.

Users simply input a prompt describing the object they want to build. Our software then designs it at the nanoscale using folded DNA strands—whether it’s a fun structure like a mini Nerf gun or a targeted therapeutic like a protein that binds to cancer cell receptors.

## How we built it
DNA origami relies on folding a long strand of DNA, typically M13mp18, into a desired shape with the help of short "staple" strands that bind complementary bases (A with T, G with C).

We developed an algorithm that maps these bindings automatically by tracing over an AI-filtered image of the desired object. The system calculates viable connection points, nucleotide sequences, and produces a fully interactive 3D visualization of the final DNA structure. This automation drastically reduces the complexity of designing reliable DNA structures.

## Challenges we ran into
One of the toughest parts was building an algorithm that respected the physics of single-stranded DNA while producing accurate, functional shapes. Traditionally, DNA origami is manually designed, requiring expert intuition.

We overcame this by analyzing a wide range of nucleotide behaviors and simulating how the DNA responds to different pivots, placements, and angles. Combining physics-based rules with machine intelligence was key to making the design process fluid and reliable.

## Accomplishments that we're proud of
We’re proud to have created one of the first AI-assisted platforms for DNA origami. Turning a complex biological process into an intuitive digital tool involves deep knowledge in biomedical engineering, and we're proud to have tackled that learning curve coming into this. NanoWorks bridges science and art, it’s powerful enough for serious research, yet visually compelling enough to inspire the next generation of innovators.

## What we learned
We learned how powerful AI can be when it’s paired with deep scientific principles. We gained insight into the delicate behavior of DNA under mechanical constraint and how structure design at the nanoscale requires careful consideration of both chemistry and computation. Most importantly, we learned that making cutting-edge science more accessible doesn't dilute its value—it amplifies it.

## What's next for NanoWorks
NanoWorks has the potential to revolutionize the design process for both 2D and 3D DNA origami. Just as the cursor is fundamental to software development, NanoWorks aims to be an intuitive tool that bridges the steep learning curve in DNA manipulation and splicing. Our goal is to build the software that powers the next major leap in nanotechnology, turning bold ideas into functional nano-scale realities.
