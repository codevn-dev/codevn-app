'use client';

import { useState, useEffect, useRef } from 'react';
// Removed Dialog imports - using custom overlay
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { useUIStore } from '@/stores';

import GoogleIcon from '@/icons/google.svg';
import { useAuthActions } from '@/hooks/use-auth-actions';
import { useI18n } from '@/components/providers';

export function AuthModal() {
  const { authModalOpen, authMode, setAuthModalOpen, setAuthMode } = useUIStore();
  const { signIn, signUp, checkEmail } = useAuthActions();
  const { t } = useI18n();

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
      setError(t('auth.fillAllFields'));
      return;
    }

    setIsLoading(true);
    try {
      await signIn(formData.email, formData.password);
      setSuccess(t('auth.loginSuccessful'));
      setAuthModalOpen(false);
      // Do not navigate away; keep current page
      // router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!formData.email || !formData.name || !formData.password) {
      setError(t('auth.fillAllFields'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordsDoNotMatchError'));
      return;
    }

    if (formData.password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (emailAvailable === false) {
      setError(t('auth.emailTaken'));
      return;
    }

    setIsLoading(true);
    try {
      await signUp(formData.email, formData.name, formData.password);
      // Auto-login occurs on server; close modal and stay on page
      setAuthModalOpen(false);
      // router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('auth.registrationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsOauthLoading(true);
    try {
      // Redirect to Google OAuth
      const { createApiUrl } = await import('@/lib/utils/api-client');
      const returnUrl = window.location.href;
      window.location.href = createApiUrl(
        `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`
      );
    } catch {
      setError(t('auth.googleLoginFailed'));
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
            setEmailError(t('auth.emailTaken'));
          }
        } catch {
          setEmailError(t('auth.emailCheckFailed'));
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

  if (!authModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl shadow-gray-300/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            {authMode === 'signin' ? t('auth.welcomeBack') : t('auth.createAccount')}
          </h2>
          <p className="text-sm text-gray-600">
            {authMode === 'signin' ? t('auth.signInDescription') : t('auth.signUpDescription')}
          </p>
        </div>

        <div className="space-y-4">
          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="border-brand bg-brand hover:border-brand-600 hover:bg-brand-600 w-full font-semibold text-white shadow-lg"
            onClick={handleGoogleLogin}
            disabled={isOauthLoading}
          >
            {isOauthLoading ? (
              <Spinner className="mr-2 h-6 w-6" />
            ) : (
              <GoogleIcon className="mr-2 h-6 w-6" />
            )}
            {t('auth.continueWithGoogle')}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">
                {t('auth.orContinueWith')}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  {t('common.fullName')}
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t('common.email')}
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
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
                      {t('auth.available')}
                    </Badge>
                  </div>
                )}
                {emailAvailable === false && !isCheckingEmail && (
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    <Badge variant="destructive" className="text-xs">
                      {t('auth.taken')}
                    </Badge>
                  </div>
                )}
              </div>
              {emailError && <p className="text-destructive text-sm">{emailError}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {t('common.password')}
              </label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.passwordPlaceholder')}
                value={formData.password}
                onChange={handlePasswordChange}
                required
              />
            </div>

            {authMode === 'signup' && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  {t('auth.confirmPassword')}
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  value={formData.confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  required
                />
                {formData.confirmPassword && passwordMatch !== null && (
                  <p className={`text-sm ${passwordMatch ? 'text-green-600' : 'text-destructive'}`}>
                    {passwordMatch ? t('auth.passwordsMatch') : t('auth.passwordsDoNotMatch')}
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

            <Button
              type="submit"
              className="bg-brand hover:bg-brand-600 w-full py-3 text-lg font-bold text-white shadow-xl shadow-gray-400/50"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {authMode === 'signin' ? t('auth.signingIn') : t('auth.creatingAccount')}
                </>
              ) : authMode === 'signin' ? (
                t('common.signIn')
              ) : (
                t('auth.createAccount')
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            {authMode === 'signin' ? (
              <>
                {t('auth.dontHaveAccount')}{' '}
                <button type="button" onClick={switchMode} className="text-primary hover:underline">
                  {t('auth.signUp')}
                </button>
              </>
            ) : (
              <>
                {t('auth.alreadyHaveAccount')}{' '}
                <button type="button" onClick={switchMode} className="text-primary hover:underline">
                  {t('common.signIn')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
