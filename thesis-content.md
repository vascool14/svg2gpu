# Svg2GPU Thesis Content Draft

## 1. Abstract
This thesis proposes Svg2GPU, a library that parses SVG definitions and converts them into GPU-friendly geometry for real-time rendering in the browser. The project targets both WebGL and WebGPU backends and focuses on performance, predictable behavior, and a clean developer API. The practical objective is to reduce the overhead of rendering complex vector graphics while preserving the original SVG semantics.

## 2. Context and Motivation
SVG is widely used for icons, diagrams, maps, and UI elements. However, in scenes with many paths or frequent updates, CPU-side interpretation and DOM-based rendering can become a bottleneck. Modern web applications increasingly depend on GPU acceleration, yet there is still a gap between high-level SVG definitions and low-level render pipelines.

Svg2GPU addresses this gap by introducing a conversion pipeline that takes declarative vector input and produces structured geometric data suitable for GPU execution. The thesis is motivated by this practical need: keeping SVG's expressiveness while obtaining the performance profile of dedicated graphics pipelines.

## 3. Problem Statement
The core problem is how to transform heterogeneous SVG primitives (paths, curves, polygons, transforms, styles) into efficient mesh and draw data with minimal overhead. The solution must handle real-world input, remain numerically stable, and scale to large files. At the same time, it should expose an API that is simple enough for common frontend usage.

## 4. Objectives
- Design a parser that covers a useful subset of SVG elements and attributes relevant for rendering.
- Convert path-based geometry into triangulated meshes with robust handling of edge cases.
- Build a rendering bridge for both WebGL and WebGPU.
- Define an API that allows either low-level access (parsed data only) or direct rendering to a canvas.
- Evaluate performance through benchmarks and compare results with baseline approaches.

## 5. Methodology
The implementation is split into stages. First, the parser transforms SVG markup into an intermediate representation that normalizes geometry and style information. Second, a geometry module applies tessellation and triangulation, generating indexed buffers suitable for GPU upload. Third, backend-specific adapters map this data to WebGL and WebGPU pipelines.

Evaluation will combine synthetic and real-world SVG test cases. Metrics include parsing time, triangulation time, frame time, memory use, and total load-to-first-render latency. The analysis will highlight where time is spent and which optimizations have measurable impact.

## 6. Expected Contributions
- A reusable open-source library for SVG-to-GPU conversion.
- A clear intermediate model that decouples parsing from rendering backend.
- A comparative discussion of WebGL vs WebGPU integration trade-offs.
- Benchmark results and optimization notes useful for future work.

## 7. Limitations and Scope
The initial version will prioritize static 2D SVG rendering and will not fully cover advanced filters, text shaping, or full animation support. These are valid extension directions but are outside the core scope of the bachelor thesis timeline.

## 8. Conclusion
Svg2GPU is positioned as a practical systems project at the intersection of geometry processing and browser graphics engineering. Its value is both academic and applied: it studies conversion strategies formally, while also producing a tool that can be used in performance-sensitive web applications.
