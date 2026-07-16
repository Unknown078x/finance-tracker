import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transactions', label: 'Transactions' },
  { to: '/reports', label: 'Reports' },
  { to: '/goals', label: 'Savings goals' },
  { to: '/categories', label: 'Categories' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">Ledger<span className="dot">.</span></div>
        <div className="sidebar-tagline">Personal finance</div>
      </div>
      <nav className="sidebar-nav">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">{user?.name}</div>
        <button className="sidebar-logout" onClick={logout}>Log out</button>
      </div>
    </aside>
  );
}
