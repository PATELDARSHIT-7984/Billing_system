import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { NAV_ITEMS } from '../../config/navigation';
import './MainLayout.css';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const currentNavItem = NAV_ITEMS.find((item) =>
    item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="app-shell__main">
        <Navbar pageTitle={currentNavItem?.label || 'BillMaster'} />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
