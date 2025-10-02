'use client';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useI18n } from '@/components/providers';

type Props = ButtonProps & { label?: string; labelKey?: string };

export function CreateButton({
  label,
  children,
  variant,
  labelKey = 'common.create',
  ...props
}: Props) {
  const { t } = useI18n();
  return (
    <Button variant={variant ?? 'primary'} {...props}>
      <Plus className="mr-2 h-4 w-4" />
      {children ?? label ?? t(labelKey)}
    </Button>
  );
}
