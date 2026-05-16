import { ESVGElementType, EPathDType } from "../types/index";
import {
	Point,
	ParsedSVGDocument,
	SVGDocumentMetadata,
	SVGElmnt,
	SVGStyleProps,
	SVGStrokeOnlyStyleProps,
	TStrokeLineCap,
	TStrokeLineJoin,
	TFillRule,
	PathCommand,
} from "../types/index";
import { ColorParser } from "./ColorParser";
import { Defaults } from "../utils/Defaults";
import { Guard } from "../utils/Guard";
import { Logger } from "../utils/Logger";

/**
 * The SVG Parser class.
 *
 * Use the `this.parse()` method to convert an SVG string into an array of SVG elements.
 *
 * This parser supports basic SVG shapes like paths, circles, ellipses, rectangles, polygons, polylines, lines, and text.
 * It handles attributes like `fill`, `stroke`, `stroke-width`, and coordinates, ensuring they are valid and fall within expected ranges.
 * It also supports nested groups (`<g>` elements) and parses their children recursively.
 */
export class SVGParser {
	static elementToString(el?: Element): string {
		if (!el) return "";
		// Example: <rect x="1" y="2" width="3" />
		const attrs = Array.from(el.attributes)
			.map((attr) => `${attr.name}="${attr.value}"`)
			.join(" ");
		return `<${el.tagName.toLowerCase()}${attrs ? " " + attrs : ""}>`;
	}

	/** Helper: Parse float attribute with fallback */
	static parseFloatAttr(
		el: Element,
		name: string,
		fallback?: number
	): number | undefined {
		const v = el.getAttribute(name);
		if (v === null || v === undefined || v === "") return fallback;
		const n = parseFloat(v);
		return isNaN(n) ? fallback : n;
	}

	/** Helper: Parse points attribute (for polygon/polyline) */
	static parsePointsAttr(attr: string): Point[] {
		// "0,0 50,50 100,0" or "0 0 50 50 100 0"
		const nums = attr
			.trim()
			.split(/[\s,]+/)
			.map(Number)
			.filter((n) => !isNaN(n));
		const points: Point[] = [];
		for (let i = 0; i + 1 < nums.length; i += 2) {
			points.push([nums[i], nums[i + 1]]);
		}
		return points;
	}

	private static parseCommonStyles(el: Element): SVGStyleProps {
		const specifiedStyle: SVGStyleProps["specifiedStyle"] = {
			fill: el.hasAttribute("fill"),
			fillOpacity: el.hasAttribute("fill-opacity"),
			stroke: el.hasAttribute("stroke"),
			strokeWidth: el.hasAttribute("stroke-width"),
			strokeOpacity: el.hasAttribute("stroke-opacity"),
			strokeLinecap: el.hasAttribute("stroke-linecap"),
			strokeLinejoin: el.hasAttribute("stroke-linejoin"),
			strokeDasharray: el.hasAttribute("stroke-dasharray"),
			strokeDashoffset: el.hasAttribute("stroke-dashoffset"),
			opacity: el.hasAttribute("opacity"),
			transform: el.hasAttribute("transform"),
			visibility: el.hasAttribute("visibility"),
			display: el.hasAttribute("display"),
		};

		return {
			fill: ColorParser.parse(el.getAttribute("fill")) ?? Defaults.FILL,
			fillOpacity: this.parseFloatAttr(el, "fill-opacity") ?? Defaults.FILL_OPACITY,
			stroke: ColorParser.parse(el.getAttribute("stroke")) ?? Defaults.STROKE,
			strokeWidth: this.parseFloatAttr(el, "stroke-width") ?? Defaults.STROKE_WIDTH,
			strokeOpacity:
				this.parseFloatAttr(el, "stroke-opacity") ?? Defaults.STROKE_OPACITY,
			strokeLinecap:
				(el.getAttribute("stroke-linecap") as TStrokeLineCap) ??
				Defaults.STROKE_LINECAP,
			strokeLinejoin:
				(el.getAttribute("stroke-linejoin") as TStrokeLineJoin) ??
				Defaults.STROKE_LINEJOIN,
			strokeDasharray:
				this.parseDashArray(el.getAttribute("stroke-dasharray")) ??
				Defaults.STROKE_DASHARRAY,
			strokeDashoffset:
				this.parseFloatAttr(el, "stroke-dashoffset") ??
				Defaults.STROKE_DASHOFFSET,
			opacity: this.parseFloatAttr(el, "opacity") ?? Defaults.OPACITY,
			transform: el.getAttribute("transform") ?? Defaults.TRANSFORM,
			visibility:
				(el.getAttribute("visibility") as SVGStyleProps["visibility"]) ??
				Defaults.VISIBILITY,
			display:
				(el.getAttribute("display") as SVGStyleProps["display"]) ??
				Defaults.DISPLAY,
			specifiedStyle,
		};
	}

	private static parseLength(value: string | null): number | undefined {
		if (!value) return undefined;
		const parsed = parseFloat(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}

	private static parseDocumentMetadata(svg: Element): SVGDocumentMetadata {
		const width = this.parseLength(svg.getAttribute("width"));
		const height = this.parseLength(svg.getAttribute("height"));
		const viewBoxAttr = svg.getAttribute("viewBox") ?? svg.getAttribute("viewbox");
		const nums = viewBoxAttr
			?.trim()
			.split(/[\s,]+/)
			.map(Number)
			.filter((n) => Number.isFinite(n));

		if (nums && nums.length === 4 && nums[2] > 0 && nums[3] > 0) {
			return {
				viewBox: {
					x: nums[0],
					y: nums[1],
					width: nums[2],
					height: nums[3],
				},
				width,
				height,
			};
		}

		return {
			viewBox: {
				x: 0,
				y: 0,
				width: width && width > 0 ? width : Defaults.VIEWBOX_WIDTH,
				height: height && height > 0 ? height : Defaults.VIEWBOX_HEIGHT,
			},
			width,
			height,
		};
	}

	private static parseStrokeOnlyStyle(el: Element): SVGStrokeOnlyStyleProps {
		const style = this.parseCommonStyles(el);
		delete style.fill;
		delete style.fillOpacity;
		return style;
	}

	private static parseDashArray(value: string | null): string | number[] | undefined {
		if (!value) return undefined;
		if (value.includes(",")) {
			return value.split(",").map(Number);
		} else if (value.includes(" ")) {
			return value.split(/\s+/).map(Number);
		}
		return value;
	}

	public static parsePathDToJSON(d: string): PathCommand[] {
		if (!/^[MmLlHhVvCcSsQqTtAaZz\s0-9.,-]+$/.test(d)) {
			Logger.error(`Invalid svg path "d": "${d}"`);
			return [];
		}

		const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
		const commands: PathCommand[] = [];
		let match: RegExpExecArray | null;

		while ((match = regex.exec(d)) !== null) {
			const cmd = match[1];        // the command letter (e.g., M, L, etc.)
			const paramsStr = match[2];  // the parameters after the command

			// Improved number extraction that handles:
			// - regular numbers (42)
			// - decimal numbers (.42, 0.42, 42.)
			// - negative numbers (-42)
			// - negative decimal numbers (-.42, -0.42, -42.)
			// - numbers with exponents (not as common in SVG but possible)
			const params = paramsStr
				.replace(/([^eE\d.-])-/, '$1 -')  // space negative numbers but not in exponents
				.split(/[\s,]+/)
				.filter(Boolean)
				.flatMap(s => {
					// Split on numbers but keep the negative sign with the number
					const numbers = s.match(/-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/g) || [];
					return numbers.map(n => Number(n));
				});

			if (params.some(isNaN)) {
				Logger.warn(`Invalid number in path command "${cmd}": "${paramsStr}"`);
				continue;
			}

			commands.push({
				type: EPathDType[cmd as keyof typeof EPathDType],
				params,
			});
		}

		return commands;
	}

	/** Parses **1** SVG sub-tag element */
	public static parseElement(el: Element): SVGElmnt | null {
		const tag = el.tagName.toLowerCase();

		switch (tag) {
			case "path": {
				const d = el.getAttribute("d");
				if (!d) {
					Logger.error(
						`<path> element is missing "d" attribute: ${SVGParser.elementToString(el)}`
					);
					return null;
				}
				const style = this.parseCommonStyles(el);
				return {
					type: ESVGElementType.PATH,
					d: SVGParser.parsePathDToJSON(d),
					fillRule:
						(el.getAttribute("fill-rule") as TFillRule) ?? Defaults.FILL_RULE,
					...style,
					specifiedStyle: {
						...style.specifiedStyle,
						fillRule: el.hasAttribute("fill-rule"),
					},
				};
			}

			case "circle": {
				const cx = this.parseFloatAttr(el, "cx");
				const cy = this.parseFloatAttr(el, "cy");
				const r = this.parseFloatAttr(el, "r");

				if (cx === undefined || cy === undefined || r === undefined) {
					return null;
				}

				return {
					type: ESVGElementType.CIRCLE,
					cx,
					cy,
					r,
					...this.parseCommonStyles(el),
				};
			}

			case "ellipse": {
				const cx = Guard.number("cx", this.parseFloatAttr(el, "cx"), el);
				const cy = Guard.number("cy", this.parseFloatAttr(el, "cy"), el);
				const rx = Guard.positiveNumber("rx", this.parseFloatAttr(el, "rx"), el);
				const ry = Guard.positiveNumber("ry", this.parseFloatAttr(el, "ry"), el);
				if (
					cx === undefined ||
					cy === undefined ||
					rx === undefined ||
					ry === undefined
				) {
					return null;
				}
				return {
					type: ESVGElementType.ELLIPSE,
					cx,
					cy,
					rx,
					ry,
					...this.parseCommonStyles(el),
				};
			}

			case "rect": {
				const x = Guard.number("x", this.parseFloatAttr(el, "x"), el);
				const y = Guard.number("y", this.parseFloatAttr(el, "y"), el);
				const width = Guard.positiveNumber(
					"width",
					this.parseFloatAttr(el, "width"),
					el
				);
				const height = Guard.positiveNumber(
					"height",
					this.parseFloatAttr(el, "height"),
					el
				);
				if (
					width === undefined ||
					height === undefined ||
					x === undefined ||
					y === undefined
				) {
					return null;
				}
				return {
					type: ESVGElementType.RECT,
					x,
					y,
					width,
					height,
					...this.parseCommonStyles(el),
					rx: this.parseFloatAttr(el, "rx") ?? Defaults.ROUNDING,
					ry: this.parseFloatAttr(el, "ry") ?? Defaults.ROUNDING,
				};
			}

			case "polygon": {
				const pointsAttr = el.getAttribute("points") || "";
				const points = this.parsePointsAttr(pointsAttr);
				const validPoints = Guard.pointArray(points, "points", 3, el);
				if (!validPoints) return null;
				const style = this.parseCommonStyles(el);
				return {
					type: ESVGElementType.POLYGON,
					points: validPoints,
					fillRule:
						(el.getAttribute("fill-rule") as TFillRule) ?? Defaults.FILL_RULE,
					...style,
					specifiedStyle: {
						...style.specifiedStyle,
						fillRule: el.hasAttribute("fill-rule"),
					},
				};
			}

			case "polyline": {
				const pointsAttr = el.getAttribute("points") || "";
				const points = this.parsePointsAttr(pointsAttr);
				const validPoints = Guard.pointArray(points, "points", 2, el);
				if (!validPoints) return null;
				const style = this.parseCommonStyles(el);
				return {
					type: ESVGElementType.POLYLINE,
					points: validPoints,
					fillRule:
						(el.getAttribute("fill-rule") as TFillRule) ?? Defaults.FILL_RULE,
					...style,
					specifiedStyle: {
						...style.specifiedStyle,
						fillRule: el.hasAttribute("fill-rule"),
					},
				};
			}

			case "line": {
				const x1 = Guard.number("x1", this.parseFloatAttr(el, "x1"), el);
				const y1 = Guard.number("y1", this.parseFloatAttr(el, "y1"), el);
				const x2 = Guard.number("x2", this.parseFloatAttr(el, "x2"), el);
				const y2 = Guard.number("y2", this.parseFloatAttr(el, "y2"), el);
				if (
					x1 === undefined ||
					y1 === undefined ||
					x2 === undefined ||
					y2 === undefined
				) {
					return null;
				}
				return {
					type: ESVGElementType.LINE,
					x1,
					y1,
					x2,
					y2,
					...this.parseStrokeOnlyStyle(el),
				};
			}

			// !!! TODO
			case "text": {
				Logger.info(`<text> elements are not supported yet.`);
				return null;
			}

			case "g": {
				const children: SVGElmnt[] = [];
				for (let i = 0; i < el.children.length; i++) {
					const child = this.parseElement(el.children[i]); // parse children
					if (child) {
						children.push(child);
					}
				}

				if (children.length === 0) {
					Logger.warn(
						"SVG <g> group has no valid children:",
						SVGParser.elementToString(el)
					);
				}

				return {
					type: ESVGElementType.GROUP,
					children,
					...this.parseCommonStyles(el),
				};
			}

			default:
				Logger.error(
					`Unsupported SVG element: <${tag}>`,
					SVGParser.elementToString(el)
				);
				return null;
		}
	}

	/**
	 * ### The main method to parse an SVG string into an array of SVG elements.
	 * @param svgString - The valid SVG string to parse
	 * @returns An array of parsed SVG element(s)
	 *
	 * @example
	 * ```typescript
	 * const svgString = `<svg xmlns="http://www.w3.org/2000/svg">
	 * 	<circle cx="50" cy="50" r="40" fill="red" stroke="black" stroke-width="2" />
	 * 	<path d="M10 10 H 90 V 90 H 10 L 10 10" fill="none" stroke="blue" stroke-width="1.5" />
	 * </svg>`;
	 *
	 * const elements = this.parse(svgString);
	 * console.log(elements);
	 *
	 * // Output:
	 * [
	 *   {
	 *     type: 'circle',
	 *     cx: 50,
	 *     cy: 50,
	 *     r: 40,
	 *     fill: [1, 0, 0, 1],
	 *     stroke: [0, 0, 0, 1],
	 *     strokeWidth: 2
	 *   },
	 *   {
	 *     type: 'path',
	 *     d: 'M10 10 H 90 V 90 H 10 L 10 10',
	 *     fill: undefined,
	 *     stroke: [0, 0, 1, 1],
	 *     strokeWidth: 1.5
	 *   }
	 * ]
	 * ```
	 */
	public static parse(svgString: string): SVGElmnt[] {
		return this.parseDocument(svgString).children;
	}

	/**
	 * Parses an SVG string and preserves root-level document metadata used by
	 * the renderer, especially `viewBox`, `width`, and `height`.
	 */
	public static parseDocument(svgString: string): ParsedSVGDocument {
		const parser = new DOMParser();
		const doc = parser.parseFromString(svgString, "image/svg+xml");
		const svg = doc.documentElement;
		const parserError = doc.querySelector("parsererror");

		if (parserError || !svg || svg.tagName.toLowerCase() !== "svg") {
			Logger.error(
				parserError?.textContent?.trim() ||
					"Invalid SVG document. Root element must be <svg>."
			);
			return {
				metadata: {
					viewBox: {
						x: 0,
						y: 0,
						width: Defaults.VIEWBOX_WIDTH,
						height: Defaults.VIEWBOX_HEIGHT,
					},
				},
				children: [],
			};
		}

		// Parse all top-level children (skip <svg> root itself)
		const result: SVGElmnt[] = [];
		for (let i = 0; i < svg.children.length; i++) {
			const parsed = this.parseElement(svg.children[i]);
			if (parsed) {
				Logger.debug(
					`Parsed SVG element: ${parsed.type}`,
					JSON.stringify(parsed, null, 2)
				);
				result.push(parsed);
			}
		}
		return {
			metadata: this.parseDocumentMetadata(svg),
			children: result,
		};
	}
}
