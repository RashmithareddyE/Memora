import { Outlet } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';

function Layout() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;