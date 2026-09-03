import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: "GTI Digital Product Passport",
    description: "Follow the documented journey of a Golden Tekstil Indonesia product, from fibre to finished piece.",
    openGraph: { title: "GTI Digital Product Passport", description: "From fibre to finished piece.", images: [{ url: `${origin}/og.png`, width: 1728, height: 909 }] },
    twitter: { card: "summary_large_image", title: "GTI Digital Product Passport", description: "From fibre to finished piece.", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${dmSans.variable} ${manrope.variable}`}>{children}</body></html>;
}
