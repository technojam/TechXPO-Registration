import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-emerald-950 text-emerald-50 p-4 border-b border-emerald-900">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-emerald-400 shrink-0">
          <img src="/logo.png" alt="TechXpo" className="h-10 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="px-4 py-2 rounded-lg text-emerald-100 hover:bg-emerald-900/50 hover:text-emerald-300 transition-all duration-200 font-medium"
          >
            Events
          </Link>
          <Link 
            href="/admin" 
            className="whitespace-nowrap px-4 py-2 rounded-lg bg-emerald-900/40 text-emerald-100 hover:bg-emerald-800/60 hover:text-white transition-all duration-200 font-medium border border-emerald-800/50 hover:border-emerald-600"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}
