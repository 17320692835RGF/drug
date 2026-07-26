import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import VisitTracker from "./components/VisitTracker";

export const metadata: Metadata = {
  title: "RDCdb：The Database of Radionuclide Drug Conjugates",
  description: "Next.js mock implementation for the Radioligand Drug Conjugates API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        <header className="site-header">
          <img className="site-header__banner" src="/header.svg" alt="" />
          <div className="site-nav-bar">
            <nav className="site-nav">
              <li>
              <Link href="/" className="site-nav__item">
                <span className="site-nav__icon" aria-hidden="true">⌂</span>
                <span>Home</span>
              </Link>
              </li>
              <li>
              <div className="dropdown">
                <button className="dropdown-toggle" aria-haspopup="menu" aria-expanded="false">
                  <span className="site-nav__icon" aria-hidden="true">⌕</span>
                  <span>Search</span>
                  <span className="dropdown-caret" aria-hidden="true">▾</span>
                </button>
                <div className="dropdown-menu" role="menu">
                  <Link href="/?tab=rdc" role="menuitem">Search for RDC</Link>
                  <Link href="/?tab=cold_compound" role="menuitem">Search for Compound</Link>
                  <Link href="/?tab=ligand" role="menuitem">Search for Ligand</Link>
                  <Link href="/?tab=linker" role="menuitem">Search for Linker</Link>
                  <Link href="/?tab=chelator" role="menuitem">Search for Chelator</Link>
                  <Link href="/?tab=radionuclide" role="menuitem">Search for Radionuclide</Link>
                </div>
              </div>
              </li>
              <li>
              <Link href="/about" className="site-nav__item">
                <span className="site-nav__icon" aria-hidden="true">ℹ</span>
                <span>About</span>
              </Link>
              </li>
              <li>
              <Link href="/manual" className="site-nav__item">
                <span className="site-nav__icon" aria-hidden="true">📖</span>
                <span>Manual</span>
              </Link>
              </li>
            </nav>
          </div>
        </header>
        {children}
        <VisitTracker />
      </body>
    </html>
  );
}
