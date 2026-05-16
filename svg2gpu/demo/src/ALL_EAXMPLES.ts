export type TExample = {
    name: string,
    path: string,
} | {
    categoryName: string;
    examples: TExample[]
}

export const ALL_EXAMPLES: TExample[] = [
    {
        categoryName: "LINE",
        examples: [
            {
                name: "LINE - Simple",
                path: "line-simple"
            },
            {
                name: "LINE - Stroke Thickness",
                path: "line-stroke-thickness"
            }
        ]
    },
    {
        name: "BAR  - Simple",
        path: "bar-simple"
    },
    {
        name: "BAR - Stroke Thickness",
        path: "bar-stroke-thickness"
    }
]

import type { ComponentType } from "react"
import BarSimplePreview from "./examples/bar-simple/Preview"
import BarStrokeThicknessPreview from "./examples/bar-stroke-thickness/Preview"
import LineSimplePreview from "./examples/line-simple/Preview"
import LineStrokeThicknessPreview from "./examples/line-stroke-thickness/Preview"

export const EXAMPLE_COMPONENTS: Record<string, ComponentType> = {
    "line-simple": LineSimplePreview,
    "line-stroke-thickness": LineStrokeThicknessPreview,
    "bar-simple": BarSimplePreview,
    "bar-stroke-thickness": BarStrokeThicknessPreview,
}
