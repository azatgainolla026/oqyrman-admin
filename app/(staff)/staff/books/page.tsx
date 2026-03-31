'use client'

import { useEffect, useState, useCallback } from 'react'
import { Table, Input, Typography, Tag, Select, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'
import type { BookViewResponse, Genre, LibraryBookSearchItem } from '@/lib/types'
import Cookies from 'js-cookie'

const { Title } = Typography

interface EnrichedBook {
  library_book_id: string
  book_id: string
  title: string
  author_id: string
  isbn: string
  language: string
  year: number
  cover_url?: string
  total_copies: number
  available_copies: number
  genre?: string
}

export default function StaffBooksPage() {
  const [allBooks, setAllBooks] = useState<EnrichedBook[]>([])
  const [filtered, setFiltered] = useState<EnrichedBook[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedGenre, setSelectedGenre] = useState<string | undefined>(undefined)

  const applyGenreFilter = useCallback(
    (books: EnrichedBook[], genre: string | undefined) => {
      if (!genre) return books
      return books.filter((b) => b.genre === genre)
    },
    []
  )

  const fetchGenres = useCallback(async () => {
    try {
      const { data } = await api.get<unknown>('/genres')
      const dataObj = data as { items?: Genre[] }
      const list = Array.isArray(data) ? (data as Genre[]) : Array.isArray(dataObj.items) ? dataObj.items : []
      setGenres(list)
    } catch {
      // silently ignore – genre filter will just be empty
    }
  }, [])

  const fetchAllBooks = useCallback(async () => {
    const libraryId = Cookies.get('library_id')
    if (!libraryId) {
      message.error('Library ID not found')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data } = await api.get<unknown>(`/library-books/library/${libraryId}`)
      const dataObj = data as { items?: Array<{
        id?: string
        library_book_id?: string
        book_id?: string
        book?: { id?: string }
        available_copies?: number
        total_copies?: number
      }> }

      const libraryBooks = (Array.isArray(data) ? data : dataObj.items) ?? []

      // Fetch book details for each library book
      const enriched = await Promise.all(
        libraryBooks.map(async (lb) => {
          const libraryBookId = lb.id ?? lb.library_book_id ?? ''
          const bookId = lb.book_id ?? lb.book?.id ?? ''
          const availableCopies = lb.available_copies ?? 0
          const totalCopies = lb.total_copies ?? 0

          if (!libraryBookId || !bookId) {
            return {
              library_book_id: libraryBookId || (bookId ? `unknown-${bookId}` : 'unknown'),
              book_id: bookId || '',
              title: '—',
              author_id: '',
              isbn: '',
              language: '',
              year: 0,
              cover_url: '',
              total_copies: totalCopies,
              available_copies: availableCopies,
            }
          }

          try {
            const { data: book } = await api.get<BookViewResponse>(`/books/${bookId}`)
            return {
              library_book_id: libraryBookId,
              book_id: bookId,
              title: book.title,
              author_id: book.author?.id ?? '',
              isbn: book.isbn,
              language: book.language,
              year: book.year,
              cover_url: book.cover_url,
              total_copies: totalCopies,
              available_copies: availableCopies,
              genre: book.genre?.name,
            }
          } catch {
            return {
              library_book_id: libraryBookId,
              book_id: bookId,
              title: '—',
              author_id: '',
              isbn: '',
              language: '',
              year: 0,
              cover_url: '',
              total_copies: totalCopies,
              available_copies: availableCopies,
              genre: undefined,
            }
          }
        })
      )

      setAllBooks(enriched)
      setFiltered(enriched)
    } catch {
      message.error('Failed to load books')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllBooks()
    fetchGenres()
  }, [fetchAllBooks, fetchGenres])

  // Re-apply genre filter whenever selectedGenre changes
  useEffect(() => {
    if (!query.trim()) {
      setFiltered(applyGenreFilter(allBooks, selectedGenre))
    }
  }, [selectedGenre, allBooks, query, applyGenreFilter])

  const handleSearch = async (value: string) => {
    setQuery(value)
    if (!value.trim()) {
      setFiltered(applyGenreFilter(allBooks, selectedGenre))
      return
    }
    setSearchLoading(true)
    try {
      const { data } = await api.get<unknown>(
        '/staff/books/search',
        { params: { q: value, limit: 50 } }
      )

      const dataObj = data as { items?: LibraryBookSearchItem[] }
      const items = Array.isArray(dataObj.items) ? dataObj.items : []

      const mapped: EnrichedBook[] = items.map((item) => ({
        library_book_id: item.library_book_id,
        book_id: item.book_id,
        title: item.title,
        author_id: item.author ?? '',
        isbn: '',
        language: '',
        year: item.year,
        cover_url: item.cover_url,
        total_copies: item.total_copies,
        available_copies: item.available_copies,
        genre: item.genre,
      }))

      setFiltered(applyGenreFilter(mapped, selectedGenre))
    } catch {
      message.error('Failed to search books')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleClear = () => {
    setQuery('')
    setFiltered(applyGenreFilter(allBooks, selectedGenre))
  }

  const handleGenreChange = (value: string | undefined) => {
    setSelectedGenre(value)
    // If there's an active search, re-run it so genre filter applies to search results
    if (query.trim()) {
      handleSearch(query)
    }
  }

  const columns: ColumnsType<EnrichedBook> = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'ISBN', dataIndex: 'isbn', key: 'isbn' },
    { title: 'Language', dataIndex: 'language', key: 'language', width: 100 },
    { title: 'Year', dataIndex: 'year', key: 'year', width: 80 },
    {
      title: 'Copies',
      key: 'copies',
      width: 100,
      render: (_, record) =>
        `${record.available_copies} / ${record.total_copies}`,
    },
    {
      title: 'Available',
      key: 'available',
      width: 100,
      render: (_, record) =>
        record.available_copies > 0 ? (
          <Tag color="green">Yes</Tag>
        ) : (
          <Tag color="red">No</Tag>
        ),
    },
  ]

  return (
    <div>
      <Title level={4} className="!mb-6">
        Books
      </Title>

      <div className="flex flex-wrap items-center gap-4 !mb-6">
        <Input.Search
          placeholder="Search books by title, author..."
          prefix={<SearchOutlined />}
          size="large"
          allowClear
          value={query}
          onChange={(e) => {
            if (!e.target.value) handleClear()
            else setQuery(e.target.value)
          }}
          onSearch={handleSearch}
          enterButton
          loading={searchLoading}
          className="max-w-xl"
        />

        <Select
          placeholder="Filter by genre"
          size="large"
          allowClear
          value={selectedGenre}
          onChange={handleGenreChange}
          className="min-w-[200px]"
          options={genres.map((g) => ({ label: g.name, value: g.name }))}
        />
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="library_book_id"
        loading={loading || searchLoading}
        scroll={{ x: 700 }}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: 'No books found' }}
      />
    </div>
  )
}
