import "./globals.css";

export const metadata = {
  title: "ContextFlow - Nested Thread AI Chat",
  description: "A linear AI chat with Notion-style branching.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-50 font-sans">{children}</body>
    </html>
  );
}
