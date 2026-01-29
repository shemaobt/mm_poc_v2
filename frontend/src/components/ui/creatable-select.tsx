/**
 * CreatableSelect Component
 * A dropdown select that fetches options from the backend and allows creating new options.
 * Extends the shadcn Select component with "Create new..." functionality.
 */
import * as React from 'react'
import { useState, useCallback } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { useOptions } from '../../hooks/useOptions'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './select'
import { Input } from './input'
import { Button } from './button'
import { cn } from '../../utils/cn'

interface CreatableSelectProps {
    /** The option category to fetch from the backend */
    category: string
    /** Current selected value */
    value: string | undefined
    /** Callback when value changes */
    onValueChange: (value: string) => void
    /** Placeholder text when no value is selected */
    placeholder?: string
    /** Whether to include an N/A option */
    includeNA?: boolean
    /** Label for the N/A option */
    naLabel?: string
    /** Fallback options to use if API fails or while loading */
    fallbackOptions?: Array<{ value: string; label: string }>
    /** Whether the select is disabled */
    disabled?: boolean
    /** Additional class name for the trigger */
    className?: string
    /** Whether to show labels instead of values in the dropdown */
    showLabels?: boolean
}

export function CreatableSelect({
    category,
    value,
    onValueChange,
    placeholder = 'Select...',
    includeNA = true,
    naLabel = 'N/A',
    fallbackOptions = [],
    disabled = false,
    className,
    showLabels = true,
}: CreatableSelectProps) {
    const { options, loading, createOption } = useOptions(category)
    const [isCreating, setIsCreating] = useState(false)
    const [newValue, setNewValue] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Merge API options with fallback options (removing duplicates)
    const mergedOptions = React.useMemo(() => {
        const apiValues = new Set(options.map(o => o.value))
        const fallbacks = fallbackOptions.filter(f => !apiValues.has(f.value))
        return [
            ...options.map(o => ({ value: o.value, label: o.label })),
            ...fallbacks,
        ]
    }, [options, fallbackOptions])

    // Handle the internal __na__ sentinel value
    const internalValue = value === '' || value === null || value === undefined ? '__na__' : value

    const handleValueChange = useCallback((v: string) => {
        if (v === '__na__') {
            onValueChange('')
        } else if (v === '__create__') {
            setIsCreating(true)
        } else {
            onValueChange(v)
        }
    }, [onValueChange])

    const handleCreate = useCallback(async () => {
        if (!newValue.trim()) return

        setIsSubmitting(true)
        try {
            const created = await createOption(newValue.trim())
            if (created) {
                onValueChange(created.value)
            }
            setNewValue('')
            setIsCreating(false)
        } catch (err) {
            console.error('Failed to create option:', err)
        } finally {
            setIsSubmitting(false)
        }
    }, [newValue, createOption, onValueChange])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleCreate()
        } else if (e.key === 'Escape') {
            setIsCreating(false)
            setNewValue('')
        }
    }, [handleCreate])

    // Get display value for the trigger
    const displayValue = React.useMemo(() => {
        if (value === '' || value === null || value === undefined) {
            return naLabel
        }
        const option = mergedOptions.find(o => o.value === value)
        return showLabels && option ? option.label : value
    }, [value, mergedOptions, showLabels, naLabel])

    if (isCreating) {
        return (
            <div className="flex gap-2">
                <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter new value..."
                    className="flex-1"
                    autoFocus
                    disabled={isSubmitting}
                />
                <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={!newValue.trim() || isSubmitting}
                >
                    {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        'Add'
                    )}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        setIsCreating(false)
                        setNewValue('')
                    }}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
            </div>
        )
    }

    return (
        <Select
            value={internalValue}
            onValueChange={handleValueChange}
            disabled={disabled || loading}
        >
            <SelectTrigger className={cn(
                loading && 'opacity-70',
                className
            )}>
                <SelectValue placeholder={placeholder}>
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading...
                        </span>
                    ) : (
                        displayValue
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {/* N/A Option */}
                {includeNA && (
                    <SelectItem value="__na__" className="text-gray-500 italic">
                        {naLabel}
                    </SelectItem>
                )}

                {/* Options from API/fallback */}
                {mergedOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                        {showLabels ? opt.label : opt.value}
                    </SelectItem>
                ))}

                {/* Create new option */}
                <SelectItem value="__create__" className="text-telha font-medium border-t border-areia/30 mt-1 pt-2">
                    <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create new...
                    </span>
                </SelectItem>
            </SelectContent>
        </Select>
    )
}

/**
 * SimpleCreatableSelect - A simpler version that uses local options array
 * Useful for cases where you want creatable behavior but options are managed locally
 */
interface SimpleCreatableSelectProps {
    value: string | undefined
    onValueChange: (value: string) => void
    options: Array<{ value: string; label: string }> | string[]
    placeholder?: string
    includeNA?: boolean
    naLabel?: string
    disabled?: boolean
    className?: string
    onCreateOption?: (value: string) => void
}

export function SimpleCreatableSelect({
    value,
    onValueChange,
    options,
    placeholder = 'Select...',
    includeNA = true,
    naLabel = 'N/A',
    disabled = false,
    className,
    onCreateOption,
}: SimpleCreatableSelectProps) {
    const [isCreating, setIsCreating] = useState(false)
    const [newValue, setNewValue] = useState('')

    // Normalize options to { value, label } format
    const normalizedOptions = React.useMemo(() => {
        return options.map(opt =>
            typeof opt === 'string' ? { value: opt, label: opt } : opt
        )
    }, [options])

    const internalValue = value === '' || value === null || value === undefined ? '__na__' : value

    const handleValueChange = useCallback((v: string) => {
        if (v === '__na__') {
            onValueChange('')
        } else if (v === '__create__') {
            setIsCreating(true)
        } else {
            onValueChange(v)
        }
    }, [onValueChange])

    const handleCreate = useCallback(() => {
        if (!newValue.trim()) return
        
        onCreateOption?.(newValue.trim())
        onValueChange(newValue.trim())
        setNewValue('')
        setIsCreating(false)
    }, [newValue, onCreateOption, onValueChange])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleCreate()
        } else if (e.key === 'Escape') {
            setIsCreating(false)
            setNewValue('')
        }
    }, [handleCreate])

    if (isCreating) {
        return (
            <div className="flex gap-2">
                <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter new value..."
                    className="flex-1"
                    autoFocus
                />
                <Button size="sm" onClick={handleCreate} disabled={!newValue.trim()}>
                    Add
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        setIsCreating(false)
                        setNewValue('')
                    }}
                >
                    Cancel
                </Button>
            </div>
        )
    }

    return (
        <Select value={internalValue} onValueChange={handleValueChange} disabled={disabled}>
            <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {includeNA && (
                    <SelectItem value="__na__" className="text-gray-500 italic">
                        {naLabel}
                    </SelectItem>
                )}

                {normalizedOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                    </SelectItem>
                ))}

                {onCreateOption && (
                    <SelectItem value="__create__" className="text-telha font-medium border-t border-areia/30 mt-1 pt-2">
                        <span className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Create new...
                        </span>
                    </SelectItem>
                )}
            </SelectContent>
        </Select>
    )
}
