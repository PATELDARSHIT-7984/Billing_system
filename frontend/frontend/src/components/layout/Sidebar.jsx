import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../config/navigation';
import { ChevronLeftIcon } from './icons';
import './Sidebar.css';

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">BM</div>
        {!collapsed && (
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">BillMaster</span>
            <span className="sidebar__brand-sub">Billing Suite</span>
          </div>
        )}
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ path, label, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <span className="sidebar__link-icon">
              <Icon />
            </span>
            {!collapsed && <span className="sidebar__link-label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="sidebar__toggle"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className={collapsed ? 'sidebar__toggle-icon--flipped' : ''}>
          <ChevronLeftIcon />
        </span>
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
