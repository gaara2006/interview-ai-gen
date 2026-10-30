import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const DashboardLayout = ({ children }) => {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-white lg:h-dvh lg:flex-row">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-visible lg:overflow-hidden">
        <Navbar />
        <main className="min-h-0 flex-1 overflow-visible overscroll-y-contain scroll-smooth bg-zinc-950 px-4 py-5 sm:px-6 sm:py-7 lg:overflow-y-auto lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
