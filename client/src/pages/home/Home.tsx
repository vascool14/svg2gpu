import LightningAnimation from "./LightningAnimation";

export default function Lightning() {
    return (
        <div className="w-full h-full">
            <section className="relative flex h-[155vh] w-full flex-col items-center justify-center overflow-hidden">
                <LightningAnimation />
            </section>

            <section className="px-(--side-padding) py-12 bg-(--bg) h-screen border-t border-(--gray)">
                <h2><code>svg2gpu</code> is a lightweight toolkit for parsing SVG data and rendering it through GPU pipelines. The current renderer implementation is WebGPU-based, but the project is designed with a general GPU-oriented direction in mind: predictable geometry processing, typed rendering data, and tooling that maps well to modern GPU workflows.</h2>
                
                <br /><br />
                <h2>The Playground is the fastest way to understand the project in practice. You can load multiple SVG examples, edit them live, and instantly compare native SVG output with the GPU-rendered result. It also includes validation feedback and a terminal-style log so you can iterate safely while experimenting with complex shapes.</h2>

                <br /><br />
                {/* <h2>TypeDoc is included to make the API surface easy to explore. It documents core parser and renderer types, enums, and utilities, so you can quickly move from interactive experimentation to real integration in your own app.</h2> */}
            </section>
        </div>
    );
}
