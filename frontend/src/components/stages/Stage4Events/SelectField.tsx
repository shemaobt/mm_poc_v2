import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { CreatableSelect } from '../../ui/creatable-select'

interface SelectFieldProps {
    label: string
    value?: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
    placeholder?: string
    clearable?: boolean
    category?: string
}

export function SelectField({
    label,
    value,
    options,
    onChange,
    placeholder = "Select...",
    clearable = true,
    category
}: SelectFieldProps) {
    if (category) {
        return (
            <div>
                <label className="text-sm font-medium text-preto mb-1.5 block">{label}</label>
                <CreatableSelect
                    category={category}
                    value={value}
                    onValueChange={onChange}
                    placeholder={placeholder}
                    includeNA={clearable}
                    fallbackOptions={options}
                />
            </div>
        )
    }

    return (
        <div>
            <label className="text-sm font-medium text-preto mb-1.5 block">{label}</label>
            <Select value={value || '__na__'} onValueChange={(v) => onChange(v === '__na__' ? '' : v)}>
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {clearable && (
                        <SelectItem value="__na__" className="text-gray-500 italic">N/A</SelectItem>
                    )}
                    {options.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
