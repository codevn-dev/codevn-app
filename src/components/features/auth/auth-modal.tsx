'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores';

export function AuthModal() {
  const { authModalOpen, authMode, setAuthModalOpen, setAuthMode } = useUIStore();
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOauthLoading, setIsOauthLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (authMode === 'signup') {
        // Validate email availability and format
        if (emailError) {
          throw new Error(emailError);
        }
        if (emailAvailable === false) {
          throw new Error('Email already exists');
        }

        // Validate password confirmation
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Registration failed');
        }

        const _registrationData = await response.json();

        // Wait a moment to ensure user is properly created in database
        await new Promise((resolve) => setTimeout(resolve, 500));

        // After successful registration, sign in the user
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          console.error('[AUTH] Sign-in error:', result.error);
          // Show success message but ask to sign in manually
          setSuccess('Account created successfully! Please sign in with your credentials.');
          setAuthMode('signin');
          return;
        }

        if (result?.ok) {
          // Optimistic: close modal and refresh immediately
          setAuthModalOpen(false);
          try {
            router.refresh();
          } catch {}
          if (typeof window !== 'undefined') {
            window.location.replace(window.location.href);
          }
        } else {
          // Registration succeeded but signin had an issue
          setSuccess('Account created successfully! Please sign in with your credentials.');
          setAuthMode('signin');
        }
      } else {
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          throw new Error('Invalid credentials');
        }

        // Optimistic refresh
        setAuthModalOpen(false);
        try {
          router.refresh();
        } catch {}
        if (typeof window !== 'undefined') {
          window.location.replace(window.location.href);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const checkEmailAvailability = async (email: string) => {
    if (!email) {
      setEmailAvailable(null);
      setEmailError(null);
      return;
    }

    setIsCheckingEmail(true);
    setEmailError(null);
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailAvailable(data.available);
        setEmailError(null);
      } else {
        // Handle API errors (like invalid email format)
        setEmailAvailable(false);
        setEmailError(data.message || 'Invalid email');
      }
    } catch (error) {
      console.error('Error checking email availability:', error);
      setEmailAvailable(null);
      setEmailError(null);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFormData = {
      ...formData,
      [e.target.name]: e.target.value,
    };
    setFormData(newFormData);

    // Clear error and success when user starts typing
    if (error) setError('');
    if (success) setSuccess('');

    // Real-time email availability check (only for signup)
    if (e.target.name === 'email' && authMode === 'signup') {
      if (newFormData.email) {
        // Clear previous timeout
        if (emailCheckTimeoutRef.current) {
          clearTimeout(emailCheckTimeoutRef.current);
        }

        // Set new timeout for email availability check (debounce 500ms)
        emailCheckTimeoutRef.current = setTimeout(() => {
          checkEmailAvailability(newFormData.email);
        }, 500);
      } else {
        setEmailAvailable(null);
        setEmailError(null);
        if (emailCheckTimeoutRef.current) {
          clearTimeout(emailCheckTimeoutRef.current);
        }
      }
    }

    // Real-time password validation for signup mode
    if (
      authMode === 'signup' &&
      (e.target.name === 'password' || e.target.name === 'confirmPassword')
    ) {
      if (newFormData.password && newFormData.confirmPassword) {
        setPasswordMatch(newFormData.password === newFormData.confirmPassword);
      } else {
        setPasswordMatch(null);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
    });
    setError('');
    setSuccess('');
    setPasswordMatch(null);
    setEmailAvailable(null);
    setEmailError(null);
    setIsCheckingEmail(false);
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }
  };

  const handleModeSwitch = (newMode: 'signin' | 'signup') => {
    setAuthMode(newMode);
    setError('');
    setSuccess('');
    setPasswordMatch(null);

    // Clear email availability check when switching to signin
    if (newMode === 'signin') {
      setEmailAvailable(null);
      setEmailError(null);
      setIsCheckingEmail(false);
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    }

    // Keep email if switching modes, but clear other fields
    setFormData((prev) => ({
      email: prev.email,
      name: '',
      password: '',
      confirmPassword: '',
    }));
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsOauthLoading(true);
      setError('');
      const callbackUrl = typeof window !== 'undefined' ? window.location.href : '/';
      await signIn('google', { callbackUrl });
    } catch {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setIsOauthLoading(false);
    }
  };

  return (
    <Dialog
      open={authModalOpen}
      onOpenChange={(open) => {
        setAuthModalOpen(open);
        if (!open) {
          resetForm();
        }
      }}
    >
      <DialogContent className="bg-white text-gray-900 sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
            <span className="text-2xl font-bold text-white">D</span>
          </div>
          <DialogTitle className="text-3xl font-bold text-gray-900">
            {authMode === 'signin' ? 'Welcome Back' : 'Join Our Community'}
          </DialogTitle>
          <DialogDescription className="mt-3 font-medium text-gray-700">
            {authMode === 'signin'
              ? 'Sign in to continue your coding journey'
              : 'Create your account and start connecting with professionals'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isOauthLoading}
            onClick={handleGoogleSignIn}
          >
            {isOauthLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Continuing with Google...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="mr-2 h-5 w-5"
                  aria-hidden="true"
                >
                  {/* Google G logo */}
                  <path
                    fill="#FFC107"
                    d="M43.611 20.083H42V20H24v8h11.303C33.602 31.91 29.197 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.84 1.154 7.961 3.039l5.657-5.657C34.869 5.053 29.702 3 24 3 12.955 3 4 11.955 4 23s8.955 20 20 20c11.045 0 20-8.955 20-20 0-1.341-.138-2.651-.389-3.917z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306 14.691l6.571 4.819C14.464 16.108 18.861 13 24 13c3.059 0 5.84 1.154 7.961 3.039l5.657-5.657C34.869 5.053 29.702 3 24 3 16.318 3 9.656 7.337 6.306 14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 43c5.132 0 9.81-1.97 13.328-5.178l-6.157-5.205C29.122 34.488 26.671 35 24 35c-5.179 0-9.594-3.108-11.292-7.444l-6.5 5.017C9.525 39.982 16.227 43 24 43z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611 20.083H42V20H24v8h11.303c-1.084 3.087-3.353 5.485-6.132 6.939l.001-.001 6.157 5.205C37.004 38.864 40 33.5 40 27c0-1.341-.138-2.651-.389-3.917z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <div className="my-1">
            <div className="flex items-center">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="px-3 text-xs tracking-wide text-gray-500 uppercase">or</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="relative">
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
                className={`pr-8 ${authMode === 'signup' && (emailAvailable === false || emailError) ? 'border-red-500 focus:border-red-500' : authMode === 'signup' && emailAvailable === true ? 'border-green-500 focus:border-green-500' : ''}`}
              />
              {authMode === 'signup' && isCheckingEmail && (
                <div className="absolute top-1/2 right-2 -translate-y-1/2 transform">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
            {authMode === 'signup' && (emailAvailable !== null || emailError) && (
              <div
                className={`text-xs ${emailAvailable === true ? 'text-green-600' : 'text-red-600'}`}
              >
                {emailError
                  ? `✗ ${emailError}`
                  : emailAvailable
                    ? '✓ Email is available!'
                    : '✗ Email already exists'}
              </div>
            )}
          </div>

          {authMode === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Full Name
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
            />
          </div>

          {authMode === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                required
                className={
                  passwordMatch === false
                    ? 'border-red-500 focus:border-red-500'
                    : passwordMatch === true
                      ? 'border-green-500 focus:border-green-500'
                      : ''
                }
              />
              {passwordMatch !== null && (
                <div className={`text-xs ${passwordMatch ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordMatch ? '✓ Perfect match!' : "✗ Passwords don't match"}
                </div>
              )}
            </div>
          )}

          {error && (
            <Badge
              variant="outline"
              className="w-full justify-center border-red-200 bg-red-50 text-red-600"
            >
              {error}
            </Badge>
          )}

          {success && (
            <Badge
              variant="default"
              className="w-full justify-center border-green-200 bg-green-100 text-green-800"
            >
              {success}
            </Badge>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {authMode === 'signin' ? 'Signing In...' : 'Creating Account...'}
              </>
            ) : authMode === 'signin' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </Button>

          <Separator />

          <Button
            variant="outline"
            onClick={() => handleModeSwitch(authMode === 'signin' ? 'signup' : 'signin')}
            className="w-full"
            type="button"
          >
            {authMode === 'signin'
              ? 'Need an account? Sign up'
              : 'Already have an account? Sign in'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
