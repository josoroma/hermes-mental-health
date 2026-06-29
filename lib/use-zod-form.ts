'use client';

import { useForm, type UseFormProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

/**
 * Wraps `useForm` with `zodResolver` so every form gets Zod validation by default.
 *
 * Usage:
 *   const schema = z.object({ name: z.string() });
 *   const form = useZodForm(schema, { defaultValues: { name: '' } });
 */
export function useZodForm<TSchema extends z.ZodType>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, 'resolver'>,
) {
  return useForm<z.infer<TSchema>>({
    ...options,
    resolver: zodResolver(schema),
  });
}