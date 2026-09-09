import { cn } from '@/lib/utils'
import type { SelectHTMLAttributes } from 'react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  options: Array<{ value: string; label: string }>
}

export const Select = ({
  label,
  options,
  id,
  className,
  ...props
}: SelectProps) => {
  const selectId = id ?? props.name

  return (
    <label className="flex w-full flex-col gap-1.5" htmlFor={selectId}>
      <span className="text-sm font-medium text-mute">{label}</span>
      <select
        id={selectId}
        className={cn(
          'h-11 rounded border border-line bg-surface-2 px-3 text-ink transition focus:border-accent',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
