import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seazone Criativos | Gerador de Criativos com IA",
  description:
    "Plataforma de geração automatizada de criativos para marketing imobiliário com IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
