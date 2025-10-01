import { type FormEvent, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../lib';
import { useUser } from './useUser';

export function RegistrationForm() {
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

      const res = await fetch('/api/auth/sign-up', req);
      if (!res.ok) {
        throw new Error(`fetch Error ${res.status}`);
      }

      const user = (await res.json()) as User;
      alert(`Succesfully registerd ${user.username} as userId ${user.userId}.`);
      navigate('/sign-in');
    } catch (err) {
      alert(`Error registering user: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div>
        <h1>Registration</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input type="text" required name="username" />
        </label>
        <label>
          Password
          <input type="password" required name="password" />
        </label>
        <button type="submit" disabled={isLoading}>
          Register
        </button>
      </form>
    </div>
  );
}
