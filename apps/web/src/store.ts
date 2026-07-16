import { create } from "zustand";
import type { SystemRole } from "@hirehub/shared";

export type SessionUser = {
  id?: string;
  name: string;
  email?: string;
  role: SystemRole;
  companyId?: string;
};
type Session = {
  token: string | null;
  role: SystemRole | null;
  name: string | null;
  user: SessionUser | null;
  setDemo: (role: SystemRole, name: string) => void;
  setAuth: (
    token: string,
    role: SystemRole,
    name: string,
    user?: Partial<SessionUser>,
  ) => void;
  updateToken: (token: string) => void;
  logout: () => void;
};

const readUser = (): SessionUser | null => {
  try {
    return JSON.parse(sessionStorage.getItem("hirehub_user") || "null");
  } catch {
    return null;
  }
};
const clearSession = () =>
  ["hirehub_token", "hirehub_role", "hirehub_name", "hirehub_user"].forEach(
    (key) => sessionStorage.removeItem(key),
  );

export const useSession = create<Session>((set) => ({
  token: sessionStorage.getItem("hirehub_token"),
  role: sessionStorage.getItem("hirehub_role") as SystemRole | null,
  name: sessionStorage.getItem("hirehub_name"),
  user: readUser(),
  setDemo: (role, name) => {
    clearSession();
    sessionStorage.setItem("hirehub_role", role);
    sessionStorage.setItem("hirehub_name", name);
    set({ role, name, token: null, user: { role, name } });
  },
  setAuth: (token, role, name, partial = {}) => {
    const user = { ...partial, role, name } as SessionUser;
    sessionStorage.setItem("hirehub_token", token);
    sessionStorage.setItem("hirehub_role", role);
    sessionStorage.setItem("hirehub_name", name);
    sessionStorage.setItem("hirehub_user", JSON.stringify(user));
    set({ token, role, name, user });
  },
  updateToken: (token) => {
    sessionStorage.setItem("hirehub_token", token);
    set({ token });
  },
  logout: () => {
    clearSession();
    set({ token: null, role: null, name: null, user: null });
  },
}));
