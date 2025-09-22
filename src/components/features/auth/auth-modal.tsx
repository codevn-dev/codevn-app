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
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores';
import { useAuthActions } from '@/hooks/use-auth-actions';

export function AuthModal() {
  const { authModalOpen, authMode, setAuthModalOpen, setAuthMode } = useUIStore();
  const router = useRouter();
  const { signIn, signUp, checkEmail } = useAuthActions();

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
    setError('');
    setSuccess('');

    if (authMode === 'signin') {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(formData.email, formData.password);
      setSuccess('Login successful!');
      setAuthModalOpen(false);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!formData.email || !formData.name || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (emailAvailable === false) {
      setError('Email is already taken');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(formData.email, formData.name, formData.password);
      // Auto-login occurs on server; close modal and refresh UI
      setAuthModalOpen(false);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsOauthLoading(true);
    try {
      // Redirect to Google OAuth
      const { createApiUrl } = await import('@/lib/utils/api-client');
      window.location.href = createApiUrl('/api/auth/google');
    } catch {
      setError('Google login failed');
      setIsOauthLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData((prev) => ({ ...prev, email }));
    setEmailError(null);
    setEmailAvailable(null);

    // Clear existing timeout
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    // Only check if email is valid format and not empty
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && emailRegex.test(email)) {
      setIsCheckingEmail(true);
      emailCheckTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await checkEmail(email);
          setEmailAvailable(result.available);
          if (!result.available) {
            setEmailError('Email is already taken');
          }
        } catch {
          setEmailError('Failed to check email availability');
        } finally {
          setIsCheckingEmail(false);
        }
      }, 500);
    } else {
      setIsCheckingEmail(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setFormData((prev) => ({ ...prev, password }));

    if (authMode === 'signup' && formData.confirmPassword) {
      setPasswordMatch(password === formData.confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const confirmPassword = e.target.value;
    setFormData((prev) => ({ ...prev, confirmPassword }));
    setPasswordMatch(formData.password === confirmPassword);
  };

  const switchMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
    setError('');
    setSuccess('');
    setFormData({ email: '', name: '', password: '', confirmPassword: '' });
    setPasswordMatch(null);
    setEmailAvailable(null);
    setEmailError(null);
  };

  const closeModal = () => {
    setAuthModalOpen(false);
    setError('');
    setSuccess('');
    setFormData({ email: '', name: '', password: '', confirmPassword: '' });
    setPasswordMatch(null);
    setEmailAvailable(null);
    setEmailError(null);
  };

  return (
    <Dialog open={authModalOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{authMode === 'signin' ? 'Welcome back' : 'Create an account'}</DialogTitle>
          <DialogDescription>
            {authMode === 'signin'
              ? 'Sign in to your account to continue'
              : 'Enter your details to create a new account'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isOauthLoading}
          >
            {isOauthLoading ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">Or continue with</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  required
                />
                {isCheckingEmail && (
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    <Spinner className="h-4 w-4" />
                  </div>
                )}
                {emailAvailable === true && !isCheckingEmail && (
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    <Badge variant="secondary" className="text-xs">
                      Available
                    </Badge>
                  </div>
                )}
                {emailAvailable === false && !isCheckingEmail && (
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    <Badge variant="destructive" className="text-xs">
                      Taken
                    </Badge>
                  </div>
                )}
              </div>
              {emailError && <p className="text-destructive text-sm">{emailError}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handlePasswordChange}
                required
              />
            </div>

            {authMode === 'signup' && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  required
                />
                {formData.confirmPassword && passwordMatch !== null && (
                  <p className={`text-sm ${passwordMatch ? 'text-green-600' : 'text-destructive'}`}>
                    {passwordMatch ? 'Passwords match' : 'Passwords do not match'}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-destructive/15 rounded-md p-3">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-500/15 p-3">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {authMode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : authMode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            {authMode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button type="button" onClick={switchMode} className="text-primary hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={switchMode} className="text-primary hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
