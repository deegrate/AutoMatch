import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "AutoMatch Dashboard | Millennium Engine",
    description: "Official Product Match Finder for QiQiYG",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} bg-millennium-bg text-slate-100 antialiased`}>
                {children}
            </body>
        </html>
    );
}
