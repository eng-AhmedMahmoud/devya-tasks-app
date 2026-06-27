import { Sidebar } from './sidebar';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-grid">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="px-6 lg:px-10 py-8 max-w-[1400px] mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
