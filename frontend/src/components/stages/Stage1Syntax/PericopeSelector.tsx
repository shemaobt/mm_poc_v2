import { useRef, useEffect } from 'react'
import { Pericope, PericopeContributor } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Search, Loader2, AlertTriangle, ChevronDown, Filter, Lock, User, CheckCircle2 } from 'lucide-react'
import { hasPartialVerseIndicator } from './types'
import { emptyStateStyles } from '@/styles'

interface PericopeSelectorProps {
    books: string[]
    selectedBook: string
    onBookChange: (book: string) => void
    contributors: PericopeContributor[]
    filterByUser: string
    onFilterByUserChange: (filter: string) => void
    searchTerm: string
    onSearchTermChange: (term: string) => void
    pericopes: Pericope[]
    selectedPericope: Pericope | null
    onSelectPericope: (pericope: Pericope) => void
    onFetchPassage: () => void
    loading: boolean
    bhsaLoaded: boolean
    showDropdown: boolean
    onShowDropdownChange: (show: boolean) => void
}

export function PericopeSelector({
    books,
    selectedBook,
    onBookChange,
    contributors,
    filterByUser,
    onFilterByUserChange,
    searchTerm,
    onSearchTermChange,
    pericopes,
    selectedPericope,
    onSelectPericope,
    onFetchPassage,
    loading,
    bhsaLoaded,
    showDropdown,
    onShowDropdownChange
}: PericopeSelectorProps) {
    const { user } = useAuth()
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onShowDropdownChange(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onShowDropdownChange])

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Select a Pericope</CardTitle>
                <CardDescription>
                    Search and select from the available Old Testament pericopes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-3 items-start flex-wrap">
                    <div className="w-48">
                        <label className="text-xs text-verde/60 mb-1 block">Filter by Book</label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verde/50" />
                            <select
                                value={selectedBook}
                                onChange={(e) => onBookChange(e.target.value)}
                                className="w-full pl-10 pr-8 py-2 border border-areia-escuro/20 rounded-md bg-white text-preto text-sm focus:outline-none focus:ring-2 focus:ring-telha/20 focus:border-telha appearance-none cursor-pointer"
                            >
                                <option value="">All Books</option>
                                {books.map((book) => (
                                    <option key={book} value={book}>{book}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verde/50 pointer-events-none" />
                        </div>
                    </div>

                    <div className="w-48">
                        <label className="text-xs text-verde/60 mb-1 block">Show pericopes by</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verde/50" />
                            <select
                                value={filterByUser}
                                onChange={(e) => onFilterByUserChange(e.target.value)}
                                className="w-full pl-10 pr-8 py-2 border border-areia-escuro/20 rounded-md bg-white text-preto text-sm focus:outline-none focus:ring-2 focus:ring-telha/20 focus:border-telha appearance-none cursor-pointer"
                            >
                                <option value="">All users</option>
                                <option value="mine">Mine only</option>
                                {contributors.map((c) => (
                                    <option key={c.id} value={c.id}>{c.username}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verde/50 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex-1 relative" ref={dropdownRef}>
                        <label className="text-xs text-verde/60 mb-1 block">Pericope Reference</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-verde/50" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => onSearchTermChange(e.target.value)}
                                onFocus={() => onShowDropdownChange(true)}
                                placeholder="Search pericopes (e.g. Genesis 1, Ruth 1:1)..."
                                className="pl-10"
                            />
                        </div>

                        {showDropdown && pericopes.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-areia-escuro/20 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                {pericopes.map((pericope) => {
                                    const isLockedByOther = !!(pericope.lock && pericope.lock.userId !== user?.id)
                                    const isLockedByMe = !!(pericope.lock && pericope.lock.userId === user?.id)
                                    const hasPartialVerse = hasPartialVerseIndicator(pericope.reference)
                                    const isDisabled = isLockedByOther

                                    return (
                                        <button
                                            key={pericope.id}
                                            onClick={() => onSelectPericope(pericope)}
                                            disabled={isDisabled}
                                            className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-2 
                                                ${isDisabled
                                                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                    : selectedPericope?.id === pericope.id
                                                        ? 'bg-telha/10 text-telha'
                                                        : 'text-preto hover:bg-areia/30'
                                                }
                                                ${isLockedByMe ? 'bg-verde-claro/10 border-l-2 border-verde-claro' : ''}
                                                ${hasPartialVerse && !isDisabled ? 'border-l-2 border-amber-400' : ''}
                                            `}
                                        >
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium">
                                                    {pericope.reference}
                                                </span>
                                                {hasPartialVerse && (
                                                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Full verses
                                                    </span>
                                                )}
                                                {isLockedByOther && (
                                                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                        <Lock className="w-3 h-3" />
                                                        {pericope.lock?.userName}
                                                    </span>
                                                )}
                                                {isLockedByMe && (
                                                    <span className="flex items-center gap-1 text-xs text-verde-claro bg-verde-claro/10 px-2 py-0.5 rounded-full">
                                                        <User className="w-3 h-3" />
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-verde/50">{pericope.book}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {showDropdown && pericopes.length === 0 && searchTerm && (
                            <div className={`absolute z-50 w-full mt-1 bg-white border border-areia-escuro/20 rounded-lg shadow-lg p-4 text-center text-verde/60 ${emptyStateStyles.text}`}>
                                No pericopes found matching "{searchTerm}"
                            </div>
                        )}
                    </div>

                    <div className="pt-5">
                        <Button
                            onClick={onFetchPassage}
                            disabled={loading || !bhsaLoaded || !selectedPericope}
                            title={!selectedPericope ? 'Please select a pericope from the list' : ''}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch Passage'}
                        </Button>
                    </div>
                </div>

                {selectedPericope && (
                    <div className="mt-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-verde-claro" />
                        <span className="text-sm text-verde">
                            Selected: <strong className="text-telha">{selectedPericope.reference}</strong>
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
