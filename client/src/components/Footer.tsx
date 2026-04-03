import Button from "./Button";
import Logo from "./icons/Logo";
import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer
            className="w-full f-full min-h-(--footer-height) py-12 border-t px-(--side-padding) 
            grid grid-cols-2 lg:grid-cols-4 gap-12"
        >
            <div className="flex flex-col text-left">
                <Logo height="2rem" padding="0.25rem" />
            </div>

            <div className="flex flex-col text-left gap-2">
                <h5 className="mb-2!">Resources</h5>
                <Link to="/playground">
                    <p className="pLink">Playground</p>
                </Link>
                <Link to="/examples">
                    <p className="pLink">Examples</p>
                </Link>
                <Link to="/docs">
                    <p className="pLink">Docs</p>
                </Link>
                <Link to="/typedoc">
                    <p className="pLink">TypeDoc</p>
                </Link>
            </div>
            <div className="flex flex-col text-left gap-2">
                <h5 className="mb-2!">Misc</h5>
                <Link to="/about">
                    <p className="pLink">About me</p>
                </Link>
                <Link to="/license">
                    <p className="pLink">License</p>
                </Link>
                <Link to="/contribute">
                    <p className="pLink">Contribute</p>
                </Link>
            </div>
            <div className="flex flex-col text-left gap-2">
                <h5 className="mb-2!">Contact</h5>
                <Link to="/report-issue">
                    <p className="pLink">Report an Issue</p>
                </Link>
                <Link to="/request-feature">
                    <p className="pLink">Request a Feature</p>
                </Link>
                <Link to="/contact">
                    <Button>Contact</Button>
                </Link>
            </div>
        </footer>
    );
}
