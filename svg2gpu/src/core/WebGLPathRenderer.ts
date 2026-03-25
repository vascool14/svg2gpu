import { Logger } from "../utils/Logger";
import { PathCommand, Point, Color } from "../types/index";

export interface WebGLShader {
    program: WebGLProgram;
    attribs: Record<string, number>;
    uniforms: Record<string, WebGLUniformLocation | null>;
}

export interface RenderStyle {
    fill?: Color;
    fillOpacity?: number;
    stroke?: Color;
    strokeWidth?: number;
    strokeOpacity?: number;
}

export interface GeometryBuffer {
    vertices: Float32Array;
    buffer: WebGLBuffer;
    vertexCount: number;
}

export class WebGLPathRenderer {
    private gl: WebGL2RenderingContext | WebGLRenderingContext;
    private shaders: Record<string, WebGLShader> = {};
    private viewBox: { x: number; y: number; width: number; height: number };
    private aspectRatio: number = 1;
    private fillGeometryCache: Map<string, GeometryBuffer> = new Map();
    private strokeGeometryCache: Map<string, GeometryBuffer> = new Map();

    constructor(canvas: HTMLCanvasElement, viewBox: string = "0 0 24 24") {
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        if (!gl) throw new Error("WebGL not supported");
        this.gl = gl;

        // Parse viewBox
        const parts = viewBox.split(/\s+|,/).filter(Boolean).map(Number);
        if (parts.length !== 4) throw new Error("Invalid viewBox format");
        
        this.viewBox = {
            x: parts[0],
            y: parts[1],
            width: parts[2],
            height: parts[3]
        };

        this.aspectRatio = this.viewBox.width / this.viewBox.height;
        this.initGL();
        this.createShaders();
    }

    private initGL(): void {
        const gl = this.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(1, 1, 1, 1);
    }

    private createShaders(): void {
        // Fill shader
        this.shaders.fill = this.createShaderProgram(
            `#version 300 es
            in vec2 a_position;
            uniform mat4 u_mvpMatrix;
            void main() {
                gl_Position = u_mvpMatrix * vec4(a_position, 0.0, 1.0);
            }`,
            `#version 300 es
            precision highp float;
            uniform vec4 u_color;
            out vec4 outColor;
            void main() {
                outColor = u_color;
            }`
        );

        // Stroke shader
        this.shaders.stroke = this.createShaderProgram(
            `#version 300 es
            in vec2 a_position;
            uniform mat4 u_mvpMatrix;
            uniform float u_thickness;
            void main() {
                gl_Position = u_mvpMatrix * vec4(a_position, 0.0, 1.0);
                gl_PointSize = u_thickness;
            }`,
            `#version 300 es
            precision highp float;
            uniform vec4 u_color;
            out vec4 outColor;
            void main() {
                outColor = u_color;
            }`
        );
    }

    private createShaderProgram(vertexSrc: string, fragmentSrc: string): WebGLShader {
        const gl = this.gl;
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSrc) as WebGLShader;
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSrc) as WebGLShader;

        const program = gl.createProgram();
        if (!program || !vertexShader || !fragmentShader) {
            throw new Error("Failed to create shader program");
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Shader program link failed: ${info}`);
        }

        const attribs: Record<string, number> = {};
        const uniforms: Record<string, WebGLUniformLocation | null> = {};

        // Get attribute and uniform locations
        attribs["a_position"] = gl.getAttribLocation(program, "a_position");
        uniforms["u_mvpMatrix"] = gl.getUniformLocation(program, "u_mvpMatrix");
        uniforms["u_color"] = gl.getUniformLocation(program, "u_color");
        
        if (fragmentSrc.includes("u_thickness")) {
            uniforms["u_thickness"] = gl.getUniformLocation(program, "u_thickness");
        }

        return { program, attribs, uniforms };
    }

    private compileShader(type: number, source: string): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type);
        if (!shader) throw new Error("Failed to create shader");

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${info}`);
        }

        return shader as WebGLShader;
    }

    public clear(): void {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    public renderPath(commands: PathCommand[], style: RenderStyle): void {
        const points = this.processPathCommands(commands);
        
        // Render fill
        if (style.fill && (style.fill[3] ?? 1) > 0) {
            const fillAlpha = (style.fill[3] ?? 1) * (style.fillOpacity ?? 1);
            this.renderFill(points, [style.fill[0], style.fill[1], style.fill[2], fillAlpha]);
        }
        
        // Render stroke
        if (style.stroke && style.strokeWidth && style.strokeWidth > 0 && (style.stroke[3] ?? 1) > 0) {
            const strokeAlpha = (style.stroke[3] ?? 1) * (style.strokeOpacity ?? 1);
            const normalizedWidth = (style.strokeWidth / this.viewBox.width) * 2;
            this.renderStroke(points, [style.stroke[0], style.stroke[1], style.stroke[2], strokeAlpha], normalizedWidth);
        }
    }

    private processPathCommands(commands: PathCommand[]): Point[] {
        const points: Point[] = [];
        let currentX = 0;
        let currentY = 0;
        let startX = 0;
        let startY = 0;

        for (const cmd of commands) {
            switch (cmd.type) {
                case 'M': // Absolute moveTo
                    currentX = cmd.params[0];
                    currentY = cmd.params[1];
                    startX = currentX;
                    startY = currentY;
                    points.push(this.normalizePoint([currentX, currentY]));
                    break;
                    
                case 'm': // Relative moveTo
                    currentX += cmd.params[0];
                    currentY += cmd.params[1];
                    startX = currentX;
                    startY = currentY;
                    points.push(this.normalizePoint([currentX, currentY]));
                    break;
                    
                case 'L': // Absolute lineTo
                    currentX = cmd.params[0];
                    currentY = cmd.params[1];
                    points.push(this.normalizePoint([currentX, currentY]));
                    break;
                    
                case 'l': // Relative lineTo
                    currentX += cmd.params[0];
                    currentY += cmd.params[1];
                    points.push(this.normalizePoint([currentX, currentY]));
                    break;
                    
                case 'H': // Absolute horizontal lineTo
                    currentX = cmd.params[0];
                    points.push(this.normalizePoint([currentX, currentY]));
                    break;
                    
                case 'h': // Relative horizontal lineTo
                    currentX += cmd.params[0];
                    points.push(this.normalizePoint([currentX, currentY]));
                    break;
                    
                case 'V': // Absolute vertical lineTo
                    currentY = cmd.params[0];
                    points.push(this.normalizePoint([currentX, currentY]));
                    break;
                    
                case 'v': // Relative vertical lineTo
                    currentY += cmd.params[0];
                    points.push(this.normalizePoint([currentX, currentY]));
                    break;
                    
                case 'Z': // Close path
                case 'z':
                    if (points.length > 0 && (currentX !== startX || currentY !== startY)) {
                        points.push(this.normalizePoint([startX, startY]));
                    }
                    currentX = startX;
                    currentY = startY;
                    break;
                    
                default:
                    Logger.warn(`Unsupported path command: ${cmd.type}`);
                    break;
            }
        }

        return points;
    }

    private normalizePoint(point: Point): Point {
        // Convert to [-1, 1] range based on viewBox
        const x = ((point[0] - this.viewBox.x) / this.viewBox.width) * 2 - 1;
        const y = 1 - ((point[1] - this.viewBox.y) / this.viewBox.height) * 2; // Flip Y
        return [x, y];
    }

    private getNormalizationMatrix(): Float32Array {
        const scaleX = 2 / this.viewBox.width;
        const scaleY = 2 / this.viewBox.height;
        const offsetX = -1 - (this.viewBox.x * scaleX);
        const offsetY = 1 - (this.viewBox.y * scaleY);
        
        return new Float32Array([
            scaleX, 0,      0, 0,
            0,      -scaleY, 0, 0,
            0,      0,      1, 0,
            offsetX, offsetY, 0, 1
        ]);
    }

    private renderFill(points: Point[], color: Color): void {
        if (points.length < 3) return;

        const cacheKey = this.generateCacheKey(points, 'fill');
        let geometry = this.fillGeometryCache.get(cacheKey);

        if (!geometry) {
            const triangles = this.triangulatePath(points);
            geometry = this.createGeometryBuffer(triangles.flat());
            this.fillGeometryCache.set(cacheKey, geometry);
        }

        this.drawGeometry(geometry, this.shaders.fill, color);
    }

    private renderStroke(points: Point[], color: Color, width: number): void {
        if (points.length < 2) return;

        const cacheKey = this.generateCacheKey(points, 'stroke', width);
        let geometry = this.strokeGeometryCache.get(cacheKey);

        if (!geometry) {
            const strokeVerts = this.generateStrokeVertices(points, width);
            geometry = this.createGeometryBuffer(strokeVerts);
            this.strokeGeometryCache.set(cacheKey, geometry);
        }

        this.drawGeometry(geometry, this.shaders.stroke, color, { thickness: width });
    }

    private triangulatePath(points: Point[]): Point[] {
        const triangles: Point[] = [];
        const vertices = [...points];
        
        while (vertices.length > 3) {
            let earFound = false;
            
            for (let i = 0; i < vertices.length; i++) {
                const prev = vertices[(i - 1 + vertices.length) % vertices.length];
                const curr = vertices[i];
                const next = vertices[(i + 1) % vertices.length];
                
                if (this.isEar(prev, curr, next, vertices)) {
                    triangles.push(prev, curr, next);
                    vertices.splice(i, 1);
                    earFound = true;
                    break;
                }
            }
            
            if (!earFound) {
                // Fallback to triangle fan
                for (let i = 1; i < vertices.length - 1; i++) {
                    triangles.push(vertices[0], vertices[i], vertices[i + 1]);
                }
                break;
            }
        }
        
        if (vertices.length === 3) {
            triangles.push(...vertices);
        }
        
        return triangles;
    }

    private isEar(a: Point, b: Point, c: Point, vertices: Point[]): boolean {
        const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        if (cross <= 0) return false;
        
        for (const p of vertices) {
            if (p === a || p === b || p === c) continue;
            if (this.pointInTriangle(p, a, b, c)) return false;
        }
        
        return true;
    }

    private pointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
        const d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
        const d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]);
        const d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]);
        
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        
        return !(hasNeg && hasPos);
    }

    private generateStrokeVertices(points: Point[], width: number): number[] {
        const halfWidth = width / 2;
        const vertices: number[] = [];
        
        for (let i = 0; i < points.length; i++) {
            const prev = i > 0 ? points[i - 1] : points[i];
            const curr = points[i];
            const next = i < points.length - 1 ? points[i + 1] : points[i];
            
            let tangent: Point;
            if (i === 0) {
                tangent = this.normalizeVec([next[0] - curr[0], next[1] - curr[1]]);
            } else if (i === points.length - 1) {
                tangent = this.normalizeVec([curr[0] - prev[0], curr[1] - prev[1]]);
            } else {
                const tangent1 = this.normalizeVec([curr[0] - prev[0], curr[1] - prev[1]]);
                const tangent2 = this.normalizeVec([next[0] - curr[0], next[1] - curr[1]]);
                tangent = this.normalizeVec([
                    tangent1[0] + tangent2[0],
                    tangent1[1] + tangent2[1]
                ]);
            }
            
            const normal = [-tangent[1], tangent[0]];
            
            vertices.push(
                curr[0] + normal[0] * halfWidth,
                curr[1] + normal[1] * halfWidth,
                curr[0] - normal[0] * halfWidth,
                curr[1] - normal[1] * halfWidth
            );
        }
        
        // Convert to triangles
        const triangles: number[] = [];
        for (let i = 0; i < vertices.length / 2 - 2; i += 2) {
            triangles.push(
                vertices[i * 2], vertices[i * 2 + 1],
                vertices[i * 2 + 2], vertices[i * 2 + 3],
                vertices[i * 2 + 4], vertices[i * 2 + 5]
            );
            triangles.push(
                vertices[i * 2 + 2], vertices[i * 2 + 3],
                vertices[i * 2 + 4], vertices[i * 2 + 5],
                vertices[i * 2], vertices[i * 2 + 1]
            );
        }
        
        return triangles;
    }

    private normalizeVec(v: Point): Point {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
        return len > 0 ? [v[0] / len, v[1] / len] : [0, 0];
    }

    private createGeometryBuffer(vertices: number[]): GeometryBuffer {
        const gl = this.gl;
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error("Failed to create buffer");
        
        const floatArray = new Float32Array(vertices);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, floatArray, gl.STATIC_DRAW);
        
        return {
            vertices: floatArray,
            buffer,
            vertexCount: vertices.length / 2
        };
    }

    private drawGeometry(
        geometry: GeometryBuffer,
        shader: WebGLShader,
        color: Color,
        uniforms?: Record<string, number>
    ): void {
        const gl = this.gl;
        
        gl.useProgram(shader.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, geometry.buffer);
        
        gl.enableVertexAttribArray(shader.attribs.a_position);
        gl.vertexAttribPointer(shader.attribs.a_position, 2, gl.FLOAT, false, 0, 0);
        
        gl.uniformMatrix4fv(shader.uniforms.u_mvpMatrix, false, this.getNormalizationMatrix());
        gl.uniform4f(shader.uniforms.u_color, color[0], color[1], color[2], (color[3] ?? 1));
        
        if (uniforms) {
            for (const [name, value] of Object.entries(uniforms)) {
                const location = shader.uniforms[`u_${name}`];
                if (location !== null && location !== undefined) {
                    gl.uniform1f(location, value);
                }
            }
        }
        
        gl.drawArrays(gl.TRIANGLES, 0, geometry.vertexCount);
    }

    private generateCacheKey(points: Point[], type: string, width?: number): string {
        let key = type;
        for (const [x, y] of points) {
            key += `|${x.toFixed(4)},${y.toFixed(4)}`;
        }
        if (width) key += `|w${width.toFixed(4)}`;
        return key;
    }

    public dispose(): void {
        const gl = this.gl;
        
        for (const buffer of this.fillGeometryCache.values()) {
            gl.deleteBuffer(buffer.buffer);
        }
        for (const buffer of this.strokeGeometryCache.values()) {
            gl.deleteBuffer(buffer.buffer);
        }
        
        for (const shader of Object.values(this.shaders)) {
            gl.deleteProgram(shader.program);
        }
        
        this.fillGeometryCache.clear();
        this.strokeGeometryCache.clear();
    }
}