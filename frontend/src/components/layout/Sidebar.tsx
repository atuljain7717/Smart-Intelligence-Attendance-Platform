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
} from "lucide-react";

import { NavLink } from "react-router-dom";

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
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          SA
        </div>

        <div className="brand-text">
          <strong>Smart Attendance</strong>
          <span>Intelligence Platform</span>
        </div>
      </div>

      <div className="sidebar-section-title">
        PLATFORM
      </div>

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
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={19}
                    strokeWidth={isActive ? 2.4 : 2}
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