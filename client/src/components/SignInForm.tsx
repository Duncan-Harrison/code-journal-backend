import { type FormEvent, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from './useUser.ts';
import { User } from '../lib';

type AuthData = {
  user: User;
  token: string;
};

export function SignInForm() {
  const { handleSignIn } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setIsLoading(true);
      const formData = new FormData(event.currentTarget);
      const userData = Object.fromEntries(formData);
      const req = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      };

      const res = await fetch('/api/auth/sign-in', req);
      if (!res.ok) {
        throw new Error(`fetch Error ${res.status}`);
      }

      const { user, token } = (await res.json()) as AuthData;
      handleSignIn(user, token);
      navigate('/');
    } catch (err) {
      alert(`Error signing in: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div>
        <h1>Sign In</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input type="text" required name="username" />
        </label>
        <br />
        <label>
          Password
          <input type="password" required name="password" />
        </label>
        <br />
        <button type="submit" disabled={isLoading}>
          Sign In
        </button>
        <Link to="/sign-up">New User? Join Here!</Link>
      </form>
    </div>
  );
}
