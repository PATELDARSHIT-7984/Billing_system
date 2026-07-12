import { BellIcon } from './icons';
import './Navbar.css';

export default function Navbar({ pageTitle }) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="navbar">
      <div className="navbar__title">{pageTitle}</div>

      <div className="navbar__right">
        <span className="navbar__date">{today}</span>

        <button type="button" className="navbar__icon-btn" aria-label="Notifications">
          <BellIcon />
        </button>

        <div className="navbar__user">
          <div className="navbar__avatar">A</div>
          <div className="navbar__user-text">
            <span className="navbar__user-name">Admin</span>
            <span className="navbar__user-role">Owner</span>
          </div>
        </div>
      </div>
    </header>
  );
}
