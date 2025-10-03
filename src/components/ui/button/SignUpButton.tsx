'use client';
import { Button, type ButtonProps } from './button';
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
      {children ?? label ?? t(labelKey)}
    </Button>
  );
}
