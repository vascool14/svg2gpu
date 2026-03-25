import { SVGParser } from "../../src/core/SvgParser";
import { ESVGElementType } from "../../src/types";
import { Logger } from "../../src/utils/Logger";

describe("<path>", () => {
	Logger.SHOW_ERRORS = false;

	it("parses minimal path", () => {
		const svg = `<svg><path d="M0 0 L10 10" /></svg>`;
		const result = SVGParser.parse(svg);
		expect(result[0]).toMatchObject({
			type: ESVGElementType.PATH,
			d: "M0 0 L10 10",
		});
	});

	it("parses full path attributes", () => {
		const svg = `<svg><path d="M0 0 L10 10" fill="#123456" stroke="#abcdef" stroke-width="3" opacity="0.5" fill-rule="evenodd"/></svg>`;
		const result = SVGParser.parse(svg);
		expect(result[0]).toMatchObject({
			type: ESVGElementType.PATH,
			fill: [0.07058823529411765, 0.20392156862745098, 0.33725490196078434, 1],
			stroke: [0.6705882352941176, 0.803921568627451, 0.9372549019607843, 1],
			strokeWidth: 3,
			opacity: 0.5,
			fillRule: "evenodd",
		});
	});

	it("fails on missing 'd'", () => {
		const svg = `<svg><path stroke="#000"/></svg>`;
		const result = SVGParser.parse(svg);
		expect(result).toHaveLength(0);
	});

	it("parses \"d\" with spacesa and types", () => {})
});
