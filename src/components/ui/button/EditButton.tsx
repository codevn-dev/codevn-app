'use client';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useI18n } from '@/components/providers';

type Props = ButtonProps & { label?: string; labelKey?: string };

export function EditButton({
  label,
  children,
  variant,
  labelKey = 'common.edit',
  ...props
}: Props) {
  const { t } = useI18n();
  return (
    <Button variant={variant ?? 'back'} {...props}>
      <Pencil className="mr-2 h-4 w-4" />
      {children ?? label ?? t(labelKey)}
    </Button>
  );
}
