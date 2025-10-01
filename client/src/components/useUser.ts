import { useContext } from 'react';
import { UserContext, UserContextValues } from './UserContext';

export function useUser(): UserContextValues {
  return useContext(UserContext);
}
