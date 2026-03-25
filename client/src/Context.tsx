"use client";
import { createContext, useContext, useState } from "react";

// Base types
type LicenseType = "free" | "pro" | "enterprise";
type User = {
    name: string;
    email: string;
    licenseType: LicenseType;
    licenseExpiry: Date | null;
};
type StateType = {
    user: User;
};

const StateContext = createContext<{
    state: StateType;
    setState: React.Dispatch<React.SetStateAction<StateType>>;
} | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<StateType>({
        user: {
            name: "Guest",
            email: "",
            licenseType: "free",
            licenseExpiry: null,
        },
    });

    return <StateContext.Provider value={{ state, setState }}>{children}</StateContext.Provider>;
}

export function _useContext() {
    const ctx = useContext(StateContext);
    if (!ctx) throw new Error("_useContext must be used within a StateProvider");
    return ctx;
}
