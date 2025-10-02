'use client';
import { Button, type ButtonProps } from './button';
import { UserPlus } from 'lucide-react';
import { useI18n } from '@/components/providers';

type Props = ButtonProps & { label?: string; labelKey?: string };

export function SignUpButton({
  label,
  children,
  variant,
  labelKey = 'common.signUp',
  ...props
}: Props) {
  const { t } = useI18n();
  return (
    <Button variant={variant ?? 'primary'} {...props}>
      <UserPlus className="mr-2 h-4 w-4" />
      {children ?? label ?? t(labelKey)}
    </Button>
  );
}
