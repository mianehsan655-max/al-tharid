import type { Metadata } from "next";
import NavBar from "./NavBar";
import CartProvider from "./CartProvider";
import Footer from "./Footer";
import { getSite } from "@/lib/store";
import "./globals.css";
import "./mobile.css";

const base = process.env.NEXT_PUBLIC_SITE_URL;
export const metadata: Metadata = {
  metadataBase: base ? new URL(base) : undefined,
  title: "Al-Tharid | Shawarma, Burgers, Loaded Fries & Cold Drinks in Jaranwala",
  description: "Explore Al-Tharid's shawarma, chicken burgers, loaded fries and cold drinks in Jaranwala, Pakistan. Opening soon.",
  openGraph: { type: "website", locale: "en_PK", siteName: "Al-Tharid", title: "Al-Tharid — Good food, happy people", description: "Shawarma, burgers, loaded fries and cold drinks. Opening soon in Jaranwala." },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { settings } = await getSite();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <CartProvider>
          <a className="skip" href="#main">Skip to content</a>
          <NavBar />
          {children}
          <Footer settings={settings} />
        </CartProvider>
      </body>
    </html>
  );
}
