'use client';
import { Button, type ButtonProps } from './button';
import { X } from 'lucide-react';
import { useI18n } from '@/components/providers';

type Props = ButtonProps & { label?: string; labelKey?: string };

export function CancelButton({
  label,
  children,
  variant,
  labelKey = 'common.cancel',
  ...props
}: Props) {
  const { t } = useI18n();
  return (
    <Button variant={variant ?? 'outline'} {...props}>
      <X className="mr-2 h-4 w-4" />
      {children ?? label ?? t(labelKey)}
    </Button>
  );
}
