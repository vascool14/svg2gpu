import "./components.css";

export default function Button({
    children,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button className="primary-button" {...props}>
            {children}
        </button>
    );
}
