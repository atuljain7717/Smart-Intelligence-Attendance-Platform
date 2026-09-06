import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  MapPin,
  Camera,
  BarChart3,
  FileText,
  Map,
  ClipboardList,
  Settings,
  Activity,
  Menu,
  X,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useState } from "react";

const navigation = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Employees",
    path: "/employees",
    icon: Users,
  },
  {
    name: "Attendance",
    path: "/attendance",
    icon: CalendarCheck,
  },
  {
    name: "Live Operations",
    path: "/live-operations",
    icon: Activity,
  },
  {
    name: "Live Location",
    path: "/locations",
    icon: MapPin,
  },
  {
    name: "Face Recognition",
    path: "/face-recognition",
    icon: Camera,
  },
  {
    name: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
  {
    name: "Reports",
    path: "/reports",
    icon: FileText,
  },
  {
    name: "Locations",
    path: "/location-management",
    icon: Map,
  },
  {
    name: "Audit Logs",
    path: "/audit-logs",
    icon: ClipboardList,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setMobileOpen((previous) => !previous);
  };

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };

  return (
    <aside
      className={`sidebar ${
        mobileOpen ? "mobile-sidebar-open" : "mobile-sidebar-closed"
      }`}
    >
      {/* =====================================================
          SIDEBAR BRAND
          ===================================================== */}

      <div className="sidebar-brand">
        <div className="brand-logo">
          SA
        </div>

        <div className="brand-text">
          <strong>Smart Attendance</strong>
          <span>Intelligence Platform</span>
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          className="mobile-sidebar-toggle"
          onClick={toggleMobileSidebar}
          aria-label={
            mobileOpen
              ? "Minimize sidebar"
              : "Open sidebar"
          }
        >
          {mobileOpen ? (
            <X size={20} />
          ) : (
            <Menu size={20} />
          )}
        </button>
      </div>

      {/* =====================================================
          SECTION TITLE
          ===================================================== */}

      <div className="sidebar-section-title">
        PLATFORM
      </div>

      {/* =====================================================
          NAVIGATION
          ===================================================== */}

      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={closeMobileSidebar}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={19}
                    strokeWidth={
                      isActive ? 2.4 : 2
                    }
                  />

                  <span>{item.name}</span>

                  {isActive && (
                    <span className="nav-active-dot" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* =====================================================
          SIDEBAR FOOTER
          ===================================================== */}

      <div className="sidebar-footer">
        <div className="system-status">
          <span className="status-dot" />

          <div>
            <strong>System Online</strong>

            <small>
              All services operational
            </small>
          </div>
        </div>
      </div>
    </aside>
  );
}