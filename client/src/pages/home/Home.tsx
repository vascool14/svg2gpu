import LightningAnimation from "./LightningAnimation";

export default function Lightning() {
    return (
        <div className="w-full h-full">
            <section className="relative flex h-[300vh] w-full flex-col items-center justify-center overflow-hidden">
                <LightningAnimation />
            </section>

            <section className="px-[var(--side-padding)]">
                <div className="w-full bg-red-500">afaef</div>
            </section>
        </div>
    );
}
