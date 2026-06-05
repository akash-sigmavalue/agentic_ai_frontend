import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";
import "leaflet/dist/leaflet.css";
import "./data_retrieval/data_retieval.css";
import "./valuation/valuation.css"
import Header from "@/components/shared/Header";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
 
export const metadata: Metadata = {
  title: "Sigmavalue AI Pilot | Intelligent Workspace",
  description: "Enterprise-grade AI control center for workflow visualization and geospatial analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var theme = localStorage.getItem('sigmavalue_theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark-mode');
                    document.documentElement.dataset.theme = 'dark';
                  } else {
                    document.documentElement.dataset.theme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Header />
        {children}
      </body>
    </html>
  );
}
