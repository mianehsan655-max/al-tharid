import type { Metadata } from "next";
import NavBar from "./NavBar";
import CartProvider from "./CartProvider";
import Footer from "./Footer";
import { getSite } from "@/lib/store";
import "./globals.css";
import "./mobile.css";
import "./enhancements.css";

const base = process.env.NEXT_PUBLIC_SITE_URL;
export const metadata: Metadata = {
  metadataBase: base ? new URL(base) : undefined,
  title:
    "Al-Tharid Jaranwala | Crispy Chicken Broast, Burgers, Shawarma & Loaded Fries",
  description:
    "Order Jaranwala's best Crispy Chicken Broast, Zinger Burgers, Arabic Garlic Shawarma, Loaded Cheesy Fries and Cold Drinks at Al-Tharid. Free delivery in Jaranwala from Rs 500 + Loyalty Stamp Rewards!",
  keywords: [
    "Al-Tharid Jaranwala",
    "best fast food in Jaranwala",
    "crispy chicken broast in Jaranwala",
    "best zinger burger in Jaranwala",
    "arabic chicken shawarma Jaranwala",
    "loaded cheese fries Jaranwala",
    "fast food home delivery Jaranwala",
  ],
  openGraph: {
    type: "website",
    locale: "en_PK",
    siteName: "Al-Tharid Jaranwala",
    title: "Al-Tharid — Good Food, Happy People | Jaranwala",
    description:
      "Shawarma, Zinger Burgers, Crispy Chicken Broast, Loaded Fries & Cold Drinks in Jaranwala, Punjab.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { settings } = await getSite();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <CartProvider>
          <a className="skip" href="#main">
            Skip to content
          </a>
          <NavBar />
          {children}
          <Footer settings={settings} />
        </CartProvider>
      </body>
    </html>
  );
}
