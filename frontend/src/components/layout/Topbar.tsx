
import {
  Bell,
  Search,
  Sun,
  Moon,
  ShieldCheck,
  LogOut,
} from "lucide-react";

import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
  }

  return (
    <header className="topbar">
      <div className="topbar-search">
        <Search size={18} />

        <input
          type="text"
          placeholder="Search employees, attendance, reports..."
        />

        <kbd>Ctrl K</kbd>
      </div>

      <div className="topbar-actions">

        <div className="system-pill">
          <span className="status-dot" />
          System Online
        </div>

        <button
          className="icon-button"
          onClick={toggleTheme}
          title={
            theme === "light"
              ? "Switch to dark mode"
              : "Switch to light mode"
          }
        >
          {theme === "light" ? (
            <Moon size={19} />
          ) : (
            <Sun size={19} />
          )}
        </button>

        <button
          className="icon-button notification-button"
          title="Notifications"
        >
          <Bell size={19} />
          <span className="notification-dot" />
        </button>

        <div className="admin-profile">
          <div className="admin-avatar">
            A
          </div>

          <div className="admin-info">
            <strong>Administrator</strong>
            <span>System Admin</span>
          </div>
        </div>

        <ShieldCheck
          size={18}
          className="verified-icon"
        />

        <button
          className="icon-button logout-button"
          onClick={handleLogout}
          title="Logout"
        >
          <LogOut size={19} />
        </button>

      </div>
    </header>
  );
}

