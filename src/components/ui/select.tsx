'use client'

import type { ChangeEvent } from 'react'
import { Dropdown, DropdownItem } from '@/components/ui/dropdown'

type SelectProps = {
  label: string
  name?: string
  value?: string
  options: Array<{ value: string; label: string }>
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
  className?: string
  id?: string
}

export const Select = ({
  label,
  name,
  value = '',
  options,
  onChange,
}: SelectProps) => {
  const selected =
    options.find((option) => option.value === value)?.label ?? options[0]?.label ?? ''

  const handlePick = (nextValue: string) => {
    onChange?.({
      target: { value: nextValue, name: name ?? '' },
    } as ChangeEvent<HTMLSelectElement>)
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-mute">{label}</span>
      <Dropdown
        ariaLabel={label}
        matchTriggerWidth
        className="w-full"
        triggerClassName="h-11 w-full justify-between rounded-lg border border-line bg-surface-2 px-3 text-left text-ink hover:border-mute"
        trigger={<span className="min-w-0 truncate">{selected}</span>}
      >
        {options.map((option) => (
          <DropdownItem
            key={option.value || option.label}
            active={option.value === value}
            onClick={() => handlePick(option.value)}
          >
            {option.label}
          </DropdownItem>
        ))}
      </Dropdown>
    </div>
  )
}
