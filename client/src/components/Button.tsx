import "./components.css";

export default function Button({
    children,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button className="bg-(--text) text-(--bg) rounded-md px-4 py-2 text-lg mt-4 mr-auto" {...props}>
            {children}
        </button>
    );
}
