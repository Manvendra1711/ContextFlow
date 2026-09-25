import "./globals.css";

export const metadata = {
  title: "ContextFlow - Nested Thread AI Chat",
  description: "A linear AI chat with Notion-style branching.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <body className="h-full w-full overflow-hidden fixed inset-0 m-0 p-0 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
