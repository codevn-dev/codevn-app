'use client';
import { Button, type ButtonProps } from './button';
import { Trash2 } from 'lucide-react';
import { useI18n } from '@/components/providers';

type Props = ButtonProps & { label?: string; labelKey?: string };

export function DeleteButton({
  label,
  children,
  variant,
  labelKey = 'common.delete',
  ...props
}: Props) {
  const { t } = useI18n();
  return (
    <Button variant={variant ?? 'destructive'} {...props}>
      <Trash2 className="mr-2 h-4 w-4" />
      {children ?? label ?? t(labelKey)}
    </Button>
  );
}
