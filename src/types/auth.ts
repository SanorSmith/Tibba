export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  permissions: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}
