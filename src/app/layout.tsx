import "~/styles/globals.css";

import { type Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/app-sidebar";
import { TooltipProvider } from "~/components/ui/tooltip";

export const metadata: Metadata = {
    title: "Interview Assistant",
    description: "AI-powered interview assistant",
    icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const instrumentSans = Instrument_Sans({
    subsets: ["latin"],
    variable: "--font-instrument-sans",
    display: "swap",
});

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        // h-dvh on html+body anchors the full height chain so flex children
        // get a concrete height — this is what makes scroll stay inside messages
        <html lang="en" className={`${instrumentSans.variable} dark h-dvh`}>
            <body className="antialiased h-full overflow-hidden">
                <TooltipProvider>
                    {/* className="h-full" overrides min-h-svh → gives SidebarInset a real height */}
                    <SidebarProvider className="h-full">
                        <AppSidebar />
                        <SidebarInset className="overflow-hidden">
                            {children}
                        </SidebarInset>
                    </SidebarProvider>
                </TooltipProvider>
            </body>
        </html>
    );
}
