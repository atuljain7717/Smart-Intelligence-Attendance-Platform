
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

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
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

      localStorage.setItem(
        "access_token",
        response.access_token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(response.user)
      );

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

  const setAuthSession = (
    newToken: string,
    newUser: AuthUser
  ) => {
    try {
      localStorage.setItem(
        "access_token",
        newToken
      );

      localStorage.setItem(
        "user",
        JSON.stringify(newUser)
      );

      setToken(newToken);
      setUser(newUser);
      setLoading(false);

      console.log(
        "Google authentication session saved."
      );
    } catch (error) {
      console.error(
        "Failed to save authentication session:",
        error
      );

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

  const logout = () => {
    try {
      logoutRequest();
    } catch (error) {
      console.error(
        "Logout request failed:",
        error
      );
    }

    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem("user");

    setUser(null);
    setToken(null);
    setLoading(false);
  };

  const isAuthenticated =
    Boolean(token && user);

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
