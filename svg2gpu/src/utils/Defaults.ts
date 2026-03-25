import {
	Color,
	TDisplay,
	TFillRule,
	TStrokeLineCap,
	TStrokeLineJoin,
	TVisibility,
} from "../types";

export class Defaults {
	/** Default value for the stroke-width attribute in SVG elements */
	static STROKE_WIDTH: number = 1;
	/** rgba(0, 0, 0, 0) - Black with full transparency */
	static FILL: Color = [0, 0, 0, 0];
	/** rgba(1, 1, 1, 1) - White with full opacity */
	static STROKE: Color = [1, 1, 1, 1];
	/** Default value for the roundness of corners in SVG elements. */
	static ROUNDING: number = 0;
	/** Full opacity - From 0.0 to 1.0 */
	static OPACITY: number = 1;
	/** Default stroke line cap */
	static STROKE_LINECAP: TStrokeLineCap = "butt";
	/** Default stroke line join */
	static STROKE_LINEJOIN: TStrokeLineJoin = "miter";
	/** Default visibility */
	static VISIBILITY: TVisibility = "visible";
	/** Default display */
	static DISPLAY: TDisplay = "inline";
	/** 50% fill opacity - From 0.0 to 1.0 */
	static FILL_OPACITY: number = 0.5;
	/** Full stroke opacity - From 0.0 to 1.0 */
	static STROKE_OPACITY: number = 1;
	/** Default fill rule */
	static FILL_RULE: TFillRule = "nonzero";

	// Undefined:
	/** Default stroke dash offset */
	static STROKE_DASHOFFSET = undefined;
	/** Default stroke dash array */
	static STROKE_DASHARRAY = undefined;
	/** Default transform */
	static TRANSFORM = undefined;
}
