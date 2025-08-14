import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authenticateUser } from '@/data/mockData';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      
      login: async (email: string, password: string) => {
        try {
          const user = authenticateUser(email, password);
          if (user) {
            set({ user, isAuthenticated: true });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Login error:', error);
          return false;
        }
      },
      
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
      
      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      }
    }),
    {
      name: 'tamagochii-auth'
    }
  )
);