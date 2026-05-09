'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { accountCreateSchema } from '@/lib/validations/schemas';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { Account } from '@/types/finance';
import { z } from 'zod';

type FormValues = z.infer<typeof accountCreateSchema>;

interface AccountFormProps {
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel: () => void;
}

const DEBT_TYPES = ['credit_card', 'personal_loan', 'mortgage', 'auto_loan', 'student_loan'];

export default function AccountForm({ defaultValues, onSubmit, onCancel }: AccountFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(accountCreateSchema),
    defaultValues: defaultValues ?? { type: 'checking', balance: 0 },
  });

  const type = watch('type');
  const isDebt = DEBT_TYPES.includes(type ?? '');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Name" id="name" {...register('name')} error={errors.name?.message} placeholder="e.g. Chase Checking" />
      <Select label="Type" id="type" {...register('type')} error={errors.type?.message}>
        <option value="checking">Checking</option>
        <option value="savings">Savings</option>
        <option value="credit_card">Credit Card</option>
        <option value="personal_loan">Personal Loan</option>
        <option value="mortgage">Mortgage</option>
        <option value="auto_loan">Auto Loan</option>
        <option value="student_loan">Student Loan</option>
      </Select>
      <Input
        label="Balance"
        id="balance"
        type="number"
        step="0.01"
        {...register('balance', { valueAsNumber: true })}
        error={errors.balance?.message}
        placeholder="0.00"
      />
      {isDebt && (
        <>
          <Input
            label="APR (%)"
            id="apr"
            type="number"
            step="0.001"
            {...register('apr', { valueAsNumber: true })}
            error={errors.apr?.message}
            placeholder="e.g. 24.99"
          />
          <Input
            label="Minimum Payment"
            id="minimum_payment"
            type="number"
            step="0.01"
            {...register('minimum_payment', { valueAsNumber: true })}
            error={errors.minimum_payment?.message}
          />
          <Input
            label="Due Day"
            id="due_day"
            type="number"
            min={1}
            max={31}
            {...register('due_day', { valueAsNumber: true })}
            error={errors.due_day?.message}
          />
        </>
      )}
      {type === 'credit_card' && (
        <Input
          label="Credit Limit"
          id="credit_limit"
          type="number"
          step="0.01"
          {...register('credit_limit', { valueAsNumber: true })}
          error={errors.credit_limit?.message}
        />
      )}
      <Input
        label="Notes (optional)"
        id="notes"
        {...register('notes')}
        error={errors.notes?.message}
      />
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}
