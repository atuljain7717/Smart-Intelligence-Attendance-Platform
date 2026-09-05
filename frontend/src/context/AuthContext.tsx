import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import {
  login as loginRequest,
  logout as logoutRequest,
  getStoredUser,
  getToken,
  type AuthUser,
} from "../services/authService";

// ============================================================
// TYPES
// ============================================================

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<AuthUser>;

  setAuthSession: (
    token: string,
    user: AuthUser
  ) => void;

  logout: () => void;

  isAuthenticated: boolean;
}

// ============================================================
// CONTEXT
// ============================================================

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

// ============================================================
// AUTH PROVIDER
// ============================================================

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  // ----------------------------------------------------------
  // INITIAL AUTH STATE
  // ----------------------------------------------------------

  const [user, setUser] =
    useState<AuthUser | null>(() => {
      try {
        return getStoredUser();
      } catch (error) {
        console.error(
          "Failed to load stored user:",
          error
        );

        localStorage.removeItem("user");

        return null;
      }
    });

  const [token, setToken] =
    useState<string | null>(() => {
      try {
        return getToken();
      } catch (error) {
        console.error(
          "Failed to load stored token:",
          error
        );

        localStorage.removeItem(
          "access_token"
        );

        return null;
      }
    });

  const [loading, setLoading] =
    useState(false);

  // ----------------------------------------------------------
  // NORMAL EMAIL/PASSWORD LOGIN
  // ----------------------------------------------------------

  const login = async (
    email: string,
    password: string
  ): Promise<AuthUser> => {
    setLoading(true);

    try {
      const response =
        await loginRequest({
          email,
          password,
        });

      // Save token
      localStorage.setItem(
        "access_token",
        response.access_token
      );

      // Save user
      localStorage.setItem(
        "user",
        JSON.stringify(response.user)
      );

      // Update React state immediately
      setToken(response.access_token);
      setUser(response.user);

      return response.user;
    } catch (error) {
      console.error(
        "Login failed:",
        error
      );

      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------
  // GOOGLE OAUTH SESSION
  // ----------------------------------------------------------

  const setAuthSession = (
    newToken: string,
    newUser: AuthUser
  ) => {
    try {
      // Store authentication data
      localStorage.setItem(
        "access_token",
        newToken
      );

      localStorage.setItem(
        "user",
        JSON.stringify(newUser)
      );

      // Update React state immediately
      setToken(newToken);
      setUser(newUser);

      // Google authentication is already complete.
      setLoading(false);

      console.log(
        "Google authentication session saved."
      );
    } catch (error) {
      console.error(
        "Failed to save authentication session:",
        error
      );

      // Clean up incomplete session
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem("user");

      setToken(null);
      setUser(null);
      setLoading(false);

      throw error;
    }
  };

  // ----------------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------------

  const logout = () => {
    try {
      logoutRequest();
    } catch (error) {
      console.error(
        "Logout request failed:",
        error
      );
    }

    // Remove authentication data
    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem("user");

    // Clear React state
    setUser(null);
    setToken(null);
    setLoading(false);
  };

  // ----------------------------------------------------------
  // AUTHENTICATION STATUS
  // ----------------------------------------------------------

  const isAuthenticated =
    Boolean(token && user);

  // ----------------------------------------------------------
  // PROVIDER
  // ----------------------------------------------------------

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        setAuthSession,
        logout,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// USE AUTH HOOK
// ============================================================

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}