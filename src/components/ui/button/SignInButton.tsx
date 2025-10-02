'use client';
import { Button, type ButtonProps } from './button';
import { LogIn } from 'lucide-react';
import { useI18n } from '@/components/providers';

type Props = ButtonProps & { label?: string; labelKey?: string };

export function SignInButton({
  label,
  children,
  variant,
  labelKey = 'common.signIn',
  ...props
}: Props) {
  const { t } = useI18n();
  return (
    <Button variant={variant ?? 'primary'} {...props}>
      <LogIn className="mr-2 h-4 w-4" />
      {children ?? label ?? t(labelKey)}
    </Button>
  );
}
