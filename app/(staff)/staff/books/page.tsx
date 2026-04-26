'use client'

import { useEffect, useState, useCallback } from 'react'
import { Table, Input, Typography, Tag, Select, message, Image } from 'antd'
import { SearchOutlined, BookOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import type { Genre, LibraryBookSearchItem } from '@/lib/types'
import Cookies from 'js-cookie'

const { Title } = Typography

interface EnrichedBook {
  library_book_id: string
  book_id: string
  title: string
  author: string
  genre?: string
  year: number
  total_pages?: number
  cover_url?: string
  total_copies: number
  available_copies: number
}

export default function StaffBooksPage() {
  const { t } = useTranslation()
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
      // silently ignore
    }
  }, [])

  const fetchAllBooks = useCallback(async () => {
    const libraryId = Cookies.get('library_id')
    if (!libraryId) {
      message.error(t('staff.libraryIdNotFound'))
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data } = await api.get<unknown>(`/library-books/library/${libraryId}`)
      type LibraryBookViewApiItem = {
        id?: string
        available_copies?: number
        total_copies?: number
        book?: {
          id?: string
          title?: string
          year?: number
          total_pages?: number
          cover_url?: string
          author?: { name?: string }
          genre?: { name?: string }
        }
      }

      const dataObj = data as { items?: unknown }
      const itemsCandidate = (Array.isArray(data) ? data : (dataObj.items as unknown)) as unknown
      const libraryBooks: LibraryBookViewApiItem[] = Array.isArray(itemsCandidate) ? (itemsCandidate as LibraryBookViewApiItem[]) : []

      const enriched: EnrichedBook[] = libraryBooks.map((lb) => {
        const libraryBookId = String(lb.id ?? '')
        const bookId = String(lb.book?.id ?? '')
        return {
          library_book_id: libraryBookId || (bookId ? `unknown-${bookId}` : 'unknown'),
          book_id: bookId,
          title: String(lb.book?.title ?? '—'),
          author: String(lb.book?.author?.name ?? '—'),
          genre: lb.book?.genre?.name ? String(lb.book.genre.name) : undefined,
          year: Number(lb.book?.year ?? 0),
          total_pages: lb.book?.total_pages,
          cover_url: lb.book?.cover_url,
          total_copies: Number(lb.total_copies ?? 0),
          available_copies: Number(lb.available_copies ?? 0),
        }
      })

      setAllBooks(enriched)
      setFiltered(enriched)
    } catch {
      message.error(t('books.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchAllBooks()
    fetchGenres()
  }, [fetchAllBooks, fetchGenres])

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
        author: item.author ?? '—',
        year: item.year,
        cover_url: item.cover_url,
        total_copies: item.total_copies,
        available_copies: item.available_copies,
        genre: item.genre,
        total_pages: undefined,
      }))

      setFiltered(applyGenreFilter(mapped, selectedGenre))
    } catch {
      message.error(t('books.searchFailed'))
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
    if (query.trim()) {
      handleSearch(query)
    }
  }

  const columns: ColumnsType<EnrichedBook> = [
    {
      title: t('books.cover'),
      key: 'cover',
      width: 70,
      align: 'center',
      render: (_, record) =>
        record.cover_url ? (
          <Image
            src={record.cover_url}
            alt={record.title}
            width={40}
            height={56}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            preview={{ mask: false }}
          />
        ) : (
          <div
            className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded mx-auto"
            style={{ width: 40, height: 56 }}
          >
            <BookOutlined className="text-gray-300 text-lg" />
          </div>
        ),
    },
    { title: t('books.bookTitle'), dataIndex: 'title', key: 'title' },
    { title: t('books.author'), dataIndex: 'author', key: 'author' },
    { title: t('books.genre'), dataIndex: 'genre', key: 'genre', width: 140, ellipsis: true, render: (v: string | undefined) => v ?? '—' },
    { title: t('books.year'), dataIndex: 'year', key: 'year', width: 80 },
    { title: t('books.pages'), dataIndex: 'total_pages', key: 'total_pages', width: 80, render: (v: number | undefined) => v ?? '—' },
    {
      title: t('books.copies'),
      key: 'copies',
      width: 100,
      render: (_, record) =>
        `${record.available_copies} / ${record.total_copies}`,
    },
    {
      title: t('books.available'),
      key: 'available',
      width: 100,
      render: (_, record) =>
        record.available_copies > 0 ? (
          <Tag color="green">{t('books.yesShort')}</Tag>
        ) : (
          <Tag color="red">{t('books.noShort')}</Tag>
        ),
    },
  ]

  return (
    <div>
      <Title level={4} className="!mb-6">
        {t('books.title')}
      </Title>

      <div className="flex flex-wrap items-center gap-4 !mb-6">
        <Input.Search
          placeholder={t('books.searchPlaceholder')}
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
          placeholder={t('books.filterByGenre')}
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
        scroll={{ x: 860 }}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: t('books.booksNotFound') }}
      />
    </div>
  )
}
