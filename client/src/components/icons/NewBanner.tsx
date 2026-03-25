export default function NewBanner() {
    return (
        <div
            className="absolute w-full right-0 top-0 flex justify-end"
            style={{ top: -12, right: -12 }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 112 112"
                width={112}
                height={112}
            >
                <polygon
                    points="20,0 8,12, 32,12"
                    fill="var(--primary)"
                    stroke="none"
                    style={{ opacity: 0.5 }}
                />
                <polygon
                    points="112,90 100,100 100,78"
                    fill="var(--primary)"
                    stroke="none"
                    style={{ opacity: 0.5 }}
                />
                <polygon points="20,0 70,0 112,40 112,90 50" fill="var(--primary)" stroke="none" />
                <g transform="rotate(45, 100, 100)">
                    <text
                        x="40"
                        y="70"
                        fill="white"
                        font-size="25"
                        text-anchor="middle"
                        alignmentBaseline="middle"
                        fontFamily="monospace"
                    >
                        NEW!
                    </text>
                </g>
            </svg>
        </div>
    );
}
