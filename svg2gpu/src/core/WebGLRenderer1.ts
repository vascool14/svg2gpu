import { SVGElmnt, ESVGElementType, Point, Color, SVGGroup, PathCommand, EPathDType } from "../types/index";
import { Logger } from "../utils/Logger";

interface ShaderProgram {
    program: WebGLProgram;
    attribLocations: {
        vertexPosition: number;
    };
    uniformLocations: {
        color: WebGLUniformLocation | null;
        mvpMatrix: WebGLUniformLocation | null;
    };
}

export class WebGLRenderer {
    private gl: WebGLRenderingContext;
    private fillShader: ShaderProgram | null = null;
    private strokeShader: ShaderProgram | null = null;
    private mvpMatrix: Float32Array; // Model-View-Projection matrix

    constructor(canvas: HTMLCanvasElement) {
		Logger.debug("Initializing WebGLRenderer");
		Logger.log("Canvas:", canvas);
		
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        if (!gl) throw new Error("WebGL not supported");
        this.gl = gl;
        
        // Initialize MVP matrix (orthographic projection)
        this.mvpMatrix = new Float32Array([
            2/canvas.width, 0, 0, 0,
            0, -2/canvas.height, 0, 0,
            0, 0, 1, 0,
            -1, 1, 0, 1
        ]);
        
        this.initGL();
    }

    /** Set up WebGL context, default shaders, and buffers. */
    private initGL() {
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Create shaders
        this.fillShader = this.createShaderProgram(
            this.getVertexShaderSource(),
            this.getFragmentShaderSource()
        );
        
        this.strokeShader = this.createShaderProgram(
            this.getVertexShaderSource(),
            this.getFragmentShaderSource()
        );
    }

    private getVertexShaderSource(): string {
        return `
            attribute vec2 a_position;
            uniform mat4 u_mvpMatrix;
            
            void main() {
                gl_Position = u_mvpMatrix * vec4(a_position, 0.0, 1.0);
            }
        `;
    }

    private getFragmentShaderSource(): string {
        return `
            precision mediump float;
            uniform vec4 u_color;
            
            void main() {
                gl_FragColor = u_color;
            }
        `;
    }

    private createShaderProgram(vertexSource: string, fragmentSource: string): ShaderProgram | null {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        
        if (!vertexShader || !fragmentShader) return null;

        const program = this.gl.createProgram();
        if (!program) return null;

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            Logger.error('Unable to initialize shader program:', this.gl.getProgramInfoLog(program));
            return null;
        }

        return {
            program,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(program, 'a_position'),
            },
            uniformLocations: {
                color: this.gl.getUniformLocation(program, 'u_color'),
                mvpMatrix: this.gl.getUniformLocation(program, 'u_mvpMatrix'),
            },
        };
    }

    private createShader(type: number, source: string): WebGLShader | null {
        const shader = this.gl.createShader(type);
        if (!shader) return null;

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            Logger.error('An error occurred compiling the shaders:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    public render(elements: SVGElmnt[]) {
        this.clear();
        elements.forEach((el) => this.renderElement(el));
    }

    private clear() {
        this.gl.clearColor(1, 1, 1, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    private renderElement(el: SVGElmnt) {
        switch (el.type) {
            case ESVGElementType.PATH:
                this.drawPath(el);
                break;
            case ESVGElementType.GROUP:
                this.renderGroup(el);
                break;
            // Add other cases as needed
            default:
                Logger.warn("Unsupported SVG element:", el);
                break;
        }
    }

    private renderGroup(group: SVGGroup) {
        if (!group.children) return;
        group.children.forEach((child) => this.renderElement(child));
    }

    private drawPath(el: any) {
        const pathPoints = this.pathCommandsToPoints(el.d);
        
        // Draw fill if present
        if (el.fill && el.fill[3] > 0) { // Check alpha
            const triangles = this.triangulatePolygon(pathPoints);
            this.renderTriangles(triangles, el.fill, el.fillOpacity);
        }
        
        // Draw stroke if present
        if (el.stroke && el.stroke[3] > 0 && el.strokeWidth > 0) {
            const strokeLines = this.generateStrokeGeometry(pathPoints, el.strokeWidth);
            this.renderTriangles(strokeLines, el.stroke, el.strokeOpacity);
        }
    }

    private pathCommandsToPoints(commands: PathCommand[]): Point[] {
        const points: Point[] = [];
        let currentX = 0;
        let currentY = 0;
        let startX = 0;
        let startY = 0;

        for (const cmd of commands) {
            switch (cmd.type) {
                case EPathDType.M: // Move to (absolute)
                    currentX = cmd.params[0];
                    currentY = cmd.params[1];
                    startX = currentX;
                    startY = currentY;
                    points.push([currentX, currentY]);
                    break;
                    
                case EPathDType.m: // Move to (relative)
                    currentX += cmd.params[0];
                    currentY += cmd.params[1];
                    startX = currentX;
                    startY = currentY;
                    points.push([currentX, currentY]);
                    break;
                    
                case EPathDType.L: // Line to (absolute)
                    currentX = cmd.params[0];
                    currentY = cmd.params[1];
                    points.push([currentX, currentY]);
                    break;
                    
                case EPathDType.l: // Line to (relative)
                    currentX += cmd.params[0];
                    currentY += cmd.params[1];
                    points.push([currentX, currentY]);
                    break;
                    
                case EPathDType.H: // Horizontal line to (absolute)
                    currentX = cmd.params[0];
                    points.push([currentX, currentY]);
                    break;
                    
                case EPathDType.h: // Horizontal line to (relative)
                    currentX += cmd.params[0];
                    points.push([currentX, currentY]);
                    break;
                    
                case EPathDType.V: // Vertical line to (absolute)
                    currentY = cmd.params[0];
                    points.push([currentX, currentY]);
                    break;
                    
                case EPathDType.v: // Vertical line to (relative)
                    currentY += cmd.params[0];
                    points.push([currentX, currentY]);
                    break;
                    
                case EPathDType.Z: // Close path
                case EPathDType.z:
                    if (currentX !== startX || currentY !== startY) {
                        points.push([startX, startY]);
                    }
                    currentX = startX;
                    currentY = startY;
                    break;
                    
                // TODO: Add support for curves (C, c, S, s, Q, q, T, t, A, a)
                default:
                    Logger.warn(`Unsupported path command: ${cmd.type}`);
                    break;
            }
        }

        return points;
    }

    private triangulatePolygon(points: Point[]): Point[] {
        if (points.length < 3) return [];
        
        // Simple ear clipping triangulation
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
                Logger.warn("Failed to triangulate polygon");
                break;
            }
        }
        
        // Add the last triangle
        if (vertices.length === 3) {
            triangles.push(...vertices);
        }
        
        return triangles;
    }

    private isEar(prev: Point, curr: Point, next: Point, vertices: Point[]): boolean {
        // Check if the triangle is convex (cross product > 0)
        const cross = (next[0] - curr[0]) * (prev[1] - curr[1]) - (next[1] - curr[1]) * (prev[0] - curr[0]);
        if (cross <= 0) return false;
        
        // Check if any other vertex is inside the triangle
        for (const vertex of vertices) {
            if (vertex === prev || vertex === curr || vertex === next) continue;
            if (this.pointInTriangle(vertex, prev, curr, next)) return false;
        }
        
        return true;
    }

    private pointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
        const denom = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
        const alpha = ((b[1] - c[1]) * (p[0] - c[0]) + (c[0] - b[0]) * (p[1] - c[1])) / denom;
        const beta = ((c[1] - a[1]) * (p[0] - c[0]) + (a[0] - c[0]) * (p[1] - c[1])) / denom;
        const gamma = 1 - alpha - beta;
        
        return alpha > 0 && beta > 0 && gamma > 0;
    }

    private generateStrokeGeometry(points: Point[], strokeWidth: number): Point[] {
        if (points.length < 2) return [];
        
        const halfWidth = strokeWidth / 2;
        const triangles: Point[] = [];
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Calculate perpendicular vector
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length === 0) continue;
            
            const perpX = (-dy / length) * halfWidth;
            const perpY = (dx / length) * halfWidth;
            
            // Create quad as two triangles
            const v1: Point = [p1[0] + perpX, p1[1] + perpY];
            const v2: Point = [p1[0] - perpX, p1[1] - perpY];
            const v3: Point = [p2[0] + perpX, p2[1] + perpY];
            const v4: Point = [p2[0] - perpX, p2[1] - perpY];
            
            // First triangle
            triangles.push(v1, v2, v3);
            // Second triangle
            triangles.push(v2, v4, v3);
        }
        
        return triangles;
    }

    private renderTriangles(triangles: Point[], color: Color, opacity: number = 1) {
        if (!this.fillShader || triangles.length === 0) return;
        
        // Create vertex buffer
        const vertices = new Float32Array(triangles.length * 2);
        for (let i = 0; i < triangles.length; i++) {
            vertices[i * 2] = triangles[i][0];
            vertices[i * 2 + 1] = triangles[i][1];
        }
        
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        
        // Use shader program
        this.gl.useProgram(this.fillShader.program);
        
        // Set attributes
        this.gl.enableVertexAttribArray(this.fillShader.attribLocations.vertexPosition);
        this.gl.vertexAttribPointer(this.fillShader.attribLocations.vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
        
        // Set uniforms
        this.gl.uniformMatrix4fv(this.fillShader.uniformLocations.mvpMatrix, false, this.mvpMatrix);
        this.gl.uniform4f(this.fillShader.uniformLocations.color, color[0], color[1], color[2], (color[3] ?? 1) * opacity);

        // Draw
        this.gl.drawArrays(this.gl.TRIANGLES, 0, triangles.length);
        
        // Cleanup
        this.gl.deleteBuffer(buffer);
    }

    private drawCircle(el: any) {
        // TODO:
    }

    private drawEllipse(el: any) {
        // TODO:
    }

    private drawRect(el: any) {
        // TODO:
    }

    private drawPolygon(el: any) {
        // TODO:
    }

    private drawPolyline(el: any) {
        // TODO:
    }

    private drawLine(el: any) {
        // TODO:
    }
}
