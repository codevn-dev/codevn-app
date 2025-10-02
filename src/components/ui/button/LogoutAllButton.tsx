'use client';
import { Button, type ButtonProps } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useI18n } from '@/components/providers';

type Props = ButtonProps & { label?: string; labelKey?: string };

export function LogoutAllButton({
  label,
  children,
  variant,
  labelKey = 'sessions.terminateOtherSessions',
  ...props
}: Props) {
  const { t } = useI18n();
  return (
    <Button variant={variant ?? 'back'} {...props}>
      <LogOut className="mr-2 h-4 w-4" />
      {children ?? label ?? t(labelKey)}
    </Button>
  );
}
