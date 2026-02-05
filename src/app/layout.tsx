import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { TerminalProvider } from "@/components/TerminalProvider";
import { Sidebar } from "@/components/Sidebar";
import { QuickPortKiller } from '@/components/QuickPortKiller';
import { getProjects } from "@/lib/projects";
import Pm2Manager from "@/components/Pm2Manager";

const geistSans = Geist({ 
  subsets: ["latin"],
  variable: '--font-display',
  display: 'swap',
});

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Project Hub",
  description: "Premium Workspace Dashboard for Developers",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const projects = await getProjects();

  const counts = {
    all: projects.length,
    work: projects.filter(p => p.category === 'work').length,
    personal: projects.filter(p => p.category === 'personal').length,
    tools: projects.filter(p => p.category === 'tools').length,
    study: projects.filter(p => p.category === 'study').length,
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider 
          attribute="data-theme" 
          defaultTheme="system" 
          enableSystem
          disableTransitionOnChange={false}
        >
          <TerminalProvider>
            <div className="flex min-h-screen">
              <Sidebar counts={counts} />
              <main className="flex-1 ml-[280px] p-8 overflow-y-auto transition-colors duration-300">
                {children}
              </main>
            </div>
            <QuickPortKiller />
            <Pm2Manager />
          </TerminalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
