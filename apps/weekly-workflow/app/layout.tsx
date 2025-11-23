import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Governance Workflow App",
  description: "Weekly project governance workflow management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
