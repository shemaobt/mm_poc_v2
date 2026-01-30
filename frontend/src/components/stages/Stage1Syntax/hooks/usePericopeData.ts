import { useState, useEffect, useCallback } from 'react'
import { pericopesAPI, Pericope, PericopeContributor } from '../../../../services/api'

interface UsePericopeDataParams {
    userId?: string
}

export function usePericopeData({ userId }: UsePericopeDataParams) {
    const [pericopes, setPericopes] = useState<Pericope[]>([])
    const [books, setBooks] = useState<string[]>([])
    const [selectedBook, setSelectedBook] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')
    const [filterByUser, setFilterByUser] = useState<string>('')
    const [contributors, setContributors] = useState<PericopeContributor[]>([])
    const [showDropdown, setShowDropdown] = useState(false)
    const [selectedPericope, setSelectedPericope] = useState<Pericope | null>(null)

    const fetchBooks = useCallback(async () => {
        try {
            const bookList = await pericopesAPI.getBooks()
            setBooks(bookList)
        } catch (err) {
            console.error('Failed to fetch books:', err)
        }
    }, [])

    const fetchContributors = useCallback(async () => {
        try {
            const list = await pericopesAPI.getContributors()
            setContributors(list)
        } catch (err) {
            console.error('Failed to fetch contributors:', err)
        }
    }, [])

    const fetchPericopes = useCallback(async () => {
        try {
            const params: { book?: string; search?: string; limit?: number; created_by_user_id?: string } = { limit: 50 }
            if (selectedBook) params.book = selectedBook
            if (searchTerm) params.search = searchTerm
            if (filterByUser === 'mine' && userId) params.created_by_user_id = userId
            else if (filterByUser && filterByUser !== 'mine') params.created_by_user_id = filterByUser
            const pericopeList = await pericopesAPI.list(params)
            setPericopes(pericopeList)
        } catch (err) {
            console.error('Failed to fetch pericopes:', err)
        }
    }, [selectedBook, searchTerm, filterByUser, userId])

    useEffect(() => {
        fetchBooks()
        fetchContributors()
    }, [])

    useEffect(() => {
        fetchPericopes()
    }, [selectedBook, searchTerm, filterByUser])

    return {
        pericopes,
        books,
        selectedBook,
        setSelectedBook,
        searchTerm,
        setSearchTerm,
        filterByUser,
        setFilterByUser,
        contributors,
        showDropdown,
        setShowDropdown,
        selectedPericope,
        setSelectedPericope,
        fetchPericopes
    }
}
