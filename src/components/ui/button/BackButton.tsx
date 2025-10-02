'use client';
import { Button, type ButtonProps } from './button';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/components/providers';

type Props = ButtonProps & { label?: string; labelKey?: string };

export function BackButton({
  label,
  children,
  variant,
  labelKey = 'common.back',
  ...props
}: Props) {
  const { t } = useI18n();
  return (
    <Button variant={variant ?? 'back'} {...props}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      {children ?? label ?? t(labelKey)}
    </Button>
  );
}
