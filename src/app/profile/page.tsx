'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ProfileData {
  id?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  updated_at?: string;
}

export default function Profile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/login');
    } else if (user) {
      fetchProfile();
    }
  }, [user, isLoading, router]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
      } else {
        // Create a profile if it doesn't exist
        const newProfile = {
          id: user.id,
          username: '',
          full_name: '',
          avatar_url: '',
          updated_at: new Date().toISOString(),
        };
        
        const { error: createError } = await supabase
          .from('profiles')
          .insert(newProfile);
          
        if (createError) {
          console.error('Error creating profile:', createError);
          return;
        }
        
        setProfile(newProfile);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <button
          onClick={handleSignOut}
          className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-700"
            />
            <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={profile.username || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              placeholder="Choose a username"
            />
          </div>

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={profile.full_name || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-700">
              Avatar URL
            </label>
            <input
              id="avatar_url"
              name="avatar_url"
              type="text"
              value={profile.avatar_url || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none disabled:bg-blue-400"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 