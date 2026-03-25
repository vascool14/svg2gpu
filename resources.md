# Bibliographic Resources for Bachelor Thesis

**Proposed title:** Svg2GPU: Efficient Conversion of SVG Content for Native Rendering  
**Tutor:** Lect. Bara Paul

This thesis starts from a practical issue that appears very often in browser graphics: SVG is excellent as a declarative format, but it is not always ideal when the target is high-throughput GPU rendering. The main goal of the project is to transform SVG data into a representation that can be consumed efficiently by WebGL and WebGPU, while keeping visual fidelity and predictable performance.

A first important reference is Jonathan Richard Shewchuk's paper, *Triangle: Engineering a 2D Quality Mesh Generator and Delaunay Triangulator* (1996). Even though the paper is older, it remains one of the clearest and most respected sources for understanding robust triangulation in practice. For a project like Svg2GPU, triangulation quality directly affects both rendering correctness and runtime performance, so this resource is essential for the geometry-processing part.

The second core resource is Gregg Tavares' *WebGL Fundamentals* (webglfundamentals.org). It offers a grounded explanation of the WebGL pipeline, buffer management, shader organization, and practical rendering patterns in JavaScript. For this thesis, it is useful not only as technical documentation, but also as a guide for designing an API that developers can use without fighting low-level GPU details.

The third resource is *WebGPU Fundamentals* (webgpufundamentals.org), also by Gregg Tavares. Since WebGPU provides a more modern and explicit model than WebGL, this reference helps frame architectural decisions early: how data should be packed, when compute passes are justified, and how to structure render pipelines for scalability. In the long term, this source supports the thesis objective of making Svg2GPU future-proof, not just compatible with legacy browser graphics.

## Bibliographic entries

1. Shewchuk, J. R. (1996). *Triangle: Engineering a 2D Quality Mesh Generator and Delaunay Triangulator*. In M. C. Lin & D. Manocha (Eds.), *Applied Computational Geometry: Towards Geometric Engineering* (Lecture Notes in Computer Science, Vol. 1148). Springer.
2. Tavares, G. *WebGL Fundamentals*. Retrieved from https://webglfundamentals.org/
3. Tavares, G. *WebGPU Fundamentals*. Retrieved from https://webgpufundamentals.org/
