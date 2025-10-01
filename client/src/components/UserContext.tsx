import { ReactNode, createContext, useState, useEffect } from 'react';
import { User, saveAuth, removeAuth, readToken, readUser } from '../lib';

export type UserContextValues = {
  user: User | undefined;
  token: string | undefined;
  handleSignIn: (user: User, token: string) => void;
  handleSignOut: () => void;
};

export const UserContext = createContext<UserContextValues>({
  user: undefined,
  token: undefined,
  handleSignIn: () => {
    throw new Error('No UserProvider');
  },
  handleSignOut: () => {
    throw new Error('No UserProvider');
  },
});

type Props = {
  children: ReactNode;
};

export function UserProvider({ children }: Props) {
  const [user, setUser] = useState<User>();
  const [token, setToken] = useState<string>();
  useEffect(() => {
    setUser(readUser());
    setToken(readToken());
  }, []);
  function handleSignIn(user: User, token: string): void {
    setUser(user);
    setToken(token);
    saveAuth(user, token);
  }

  function handleSignOut() {
    setUser(undefined);
    setToken(undefined);
    removeAuth();
  }

  const contextValues = { user, token, handleSignIn, handleSignOut };

  return (
    <UserContext.Provider value={contextValues}>
      {children}
    </UserContext.Provider>
  );
}
