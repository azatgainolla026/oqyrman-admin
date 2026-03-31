'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Button,
  Typography,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  Popconfirm,
  Upload,
  Select,
  Image,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, FileTextOutlined, BookOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'
import type { Book, BookViewResponse, BookFile, Author, Genre, PaginatedResponse } from '@/lib/types'

const { Title } = Typography

export default function BooksPage() {
  const [books, setBooks] = useState<BookViewResponse[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BookViewResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fileModalOpen, setFileModalOpen] = useState(false)
  const [fileUploadBookId, setFileUploadBookId] = useState<string>('')
  const [fileUploadFile, setFileUploadFile] = useState<File | null>(null)
  const [bookFilesMap, setBookFilesMap] = useState<Record<string, BookFile[]>>({})
  const [createCoverFile, setCreateCoverFile] = useState<File | null>(null)
  const [createBookFile, setCreateBookFile] = useState<File | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [genreFilter, setGenreFilter] = useState<string | undefined>(undefined)
  const [fileForm] = Form.useForm()
  const [form] = Form.useForm()
  const pageSize = 20

  const fetchBooks = useCallback(async (p: number, q?: string, genreId?: string) => {
    setLoading(true)
    try {
      // Swagger-aligned endpoints:
      // - q -> GET /books/search?q=...
      // - genreId -> GET /books/genre/{genre_id}
      // - no filters -> GET /books
      const params: Record<string, unknown> = { limit: pageSize, offset: (p - 1) * pageSize }
      const endpoint = q ? '/books/search' : genreId ? `/books/genre/${genreId}` : '/books'

      const requestConfig = q
        ? { params: { ...params, q } }
        : endpoint.startsWith('/books/genre/')
          ? undefined
          : { params }

      const { data } = requestConfig
        ? await api.get<PaginatedResponse<BookViewResponse> | BookViewResponse[] | unknown>(endpoint, requestConfig)
        : await api.get<PaginatedResponse<BookViewResponse> | BookViewResponse[] | unknown>(endpoint)

      const dataObj = data as { items?: BookViewResponse[]; total?: number; offset?: number; limit?: number }
      const items: BookViewResponse[] = Array.isArray(data) ? data : dataObj.items ?? []
      const isGenreEndpoint = !q && !!genreId
      const serverHasPagination =
        isGenreEndpoint && (typeof dataObj.offset === 'number' || typeof dataObj.limit === 'number')

      // If the server returns a plain list for /books/genre/{genre_id}, paginate on the client.
      const start = (p - 1) * pageSize
      const paginatedItems = isGenreEndpoint && !serverHasPagination ? items.slice(start, start + pageSize) : items

      const filteredItems = q && genreId ? paginatedItems.filter((b) => b.genre?.id === genreId) : paginatedItems

      setBooks(filteredItems)
      setTotal(isGenreEndpoint && !serverHasPagination ? items.length : dataObj.total ?? filteredItems.length)

      // Fetch book files for each book
      const filesMap: Record<string, BookFile[]> = {}
      await Promise.all(
        filteredItems.map(async (book) => {
          try {
            const res = await api.get(`/book-files/book/${book.id}`)
            const files = Array.isArray(res.data) ? res.data : res.data.items ?? []
            filesMap[book.id] = files
          } catch {
            filesMap[book.id] = []
          }
        })
      )
      setBookFilesMap(filesMap)
    } catch {
      message.error('Failed to load books')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBooks(page, searchQuery, genreFilter)
    // Load authors and genres for the form selects
    api
      .get<PaginatedResponse<Author>>('/authors', { params: { limit: 200 } })
      .then(({ data }) => setAuthors(data.items))
    api.get('/genres').then(({ data }) => {
      setGenres(Array.isArray(data) ? data : data.items ?? [])
    })
  }, [page, fetchBooks])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setPage(1)
    fetchBooks(1, value, genreFilter)
  }

  const handleGenreFilter = (value: string | undefined) => {
    setGenreFilter(value)
    setPage(1)
    fetchBooks(1, searchQuery, value)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setCreateCoverFile(null)
    setCreateBookFile(null)
    setModalOpen(true)
  }

  const openEdit = (book: BookViewResponse) => {
    setEditing(book)
    form.setFieldsValue({
      title: book.title,
      author_id: book.author.id,
      genre_id: book.genre.id,
      isbn: book.isbn,
      description: book.description,
      language: book.language,
      year: book.year,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()

    if (!editing && !createCoverFile) {
      message.error('Please upload a cover image')
      return
    }

    setSubmitting(true)
    try {
      if (editing) {
        await api.put(`/admin/books/${editing.id}`, values)
        message.success('Book updated')
      } else {
        const formData = new FormData()
        formData.append('title', values.title)
        formData.append('author_id', values.author_id)
        formData.append('genre_id', values.genre_id)
        formData.append('isbn', values.isbn)
        formData.append('description', values.description)
        formData.append('language', values.language)
        formData.append('year', String(values.year))
        if (createCoverFile) formData.append('cover', createCoverFile)

        const { data: newBook } = await api.post<Book>('/admin/books', formData)
        message.success('Book created')

        // Upload book file if provided
        if (createBookFile && values.file_format) {
          const fileData = new FormData()
          fileData.append('book_id', newBook.id)
          fileData.append('format', values.file_format)
          fileData.append('file', createBookFile)
          if (values.file_total_pages) fileData.append('total_pages', String(values.file_total_pages))
          try {
            await api.post('/admin/book-files/upload', fileData)
            message.success('Book file uploaded')
          } catch {
            message.warning('Book created but file upload failed')
          }
        }
      }
      setModalOpen(false)
      fetchBooks(page, searchQuery, genreFilter)
    } catch {
      message.error('Failed to save book')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/books/${id}`)
      message.success('Book deleted')
      fetchBooks(page, searchQuery, genreFilter)
    } catch {
      message.error('Failed to delete book')
    }
  }

  const handleCoverUpload = async (bookId: string, file: File) => {
    const formData = new FormData()
    formData.append('cover', file)
    try {
      await api.post(`/admin/books/${bookId}/cover`, formData)
      message.success('Cover uploaded')
      fetchBooks(page, searchQuery, genreFilter)
    } catch {
      message.error('Failed to upload cover')
    }
  }

  const openFileUpload = (bookId: string) => {
    setFileUploadBookId(bookId)
    setFileUploadFile(null)
    fileForm.resetFields()
    setFileModalOpen(true)
  }

  const handleFileUpload = async () => {
    const values = await fileForm.validateFields()
    if (!fileUploadFile) {
      message.error('Please select a file')
      return
    }
    const formData = new FormData()
    formData.append('book_id', fileUploadBookId)
    formData.append('format', values.format)
    formData.append('file', fileUploadFile)
    if (values.total_pages) {
      formData.append('total_pages', String(values.total_pages))
    }
    try {
      await api.post('/admin/book-files/upload', formData)
      message.success('File uploaded')
      setFileModalOpen(false)
      fetchBooks(page, searchQuery, genreFilter)
    } catch {
      message.error('Failed to upload file')
    }
  }

  const columns: ColumnsType<BookViewResponse> = [
    {
      title: 'Cover',
      key: 'cover',
      width: 70,
      fixed: 'left',
      align: 'center',
      render: (_, record) =>
        record.cover_url ? (
          <Image
            src={record.cover_url}
            alt={record.title}
            width={40}
            height={56}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCA0MCA1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNTYiIHJ4PSI0IiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iMjAiIHk9IjMyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjY2NjIiBmb250LXNpemU9IjE0Ij7wn5ONPC90ZXh0Pjwvc3ZnPg=="
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
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true, fixed: 'left', width: 200 },
    {
      title: 'Author',
      key: 'author',
      width: 150,
      ellipsis: true,
      render: (_, record) => record.author?.name ?? '—',
    },
    {
      title: 'Genre',
      key: 'genre',
      width: 120,
      ellipsis: true,
      render: (_, record) => record.genre?.name ?? '—',
    },
    { title: 'Year', dataIndex: 'year', key: 'year', width: 70 },
    { title: 'ISBN', dataIndex: 'isbn', key: 'isbn', width: 160 },
    { title: 'Language', dataIndex: 'language', key: 'language', width: 90, align: 'center' },
    {
      title: 'Rating',
      dataIndex: 'avg_rating',
      key: 'avg_rating',
      width: 70,
      align: 'center',
      render: (val: number) => val?.toFixed(1) ?? '—',
    },
    {
      title: 'Files',
      key: 'files_status',
      width: 90,
      align: 'center',
      render: (_, record) => {
        const files = bookFilesMap[record.id] || []
        if (files.length === 0) return <span className="text-gray-300">—</span>
        return (
          <Space size={4}>
            {files.map((f) => (
              <span key={f.id} className="text-green-500 text-xs font-medium uppercase">
                {f.format}
              </span>
            ))}
          </Space>
        )
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Upload
            showUploadList={false}
            accept="image/*"
            beforeUpload={(file) => {
              handleCoverUpload(record.id, file)
              return false
            }}
          >
            <Button
              size="small"
              icon={<PictureOutlined />}
              title="Upload cover"
              className={record.cover_url ? '!text-green-500 !border-green-300' : ''}
            />
          </Upload>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            title="Upload book file"
            onClick={() => openFileUpload(record.id)}
            className={(bookFilesMap[record.id]?.length ?? 0) > 0 ? '!text-green-500 !border-green-300' : ''}
          />
          <Popconfirm
            title="Delete this book?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Title level={4} className="!mb-0">
          Books
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Book
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Input.Search
          placeholder="Search by title or author"
          allowClear
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
          style={{ maxWidth: 360 }}
        />
        <Select
          allowClear
          placeholder="Filter by genre"
          style={{ minWidth: 180 }}
          options={genres.map((g) => ({ value: g.id, label: g.name }))}
          onChange={handleGenreFilter}
          value={genreFilter}
        />
      </div>

      <Table
        columns={columns}
        dataSource={books}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          total,
          pageSize,
          onChange: setPage,
          showSizeChanger: false,
        }}
      />

      <Modal
        title={editing ? 'Edit Book' : 'Add Book'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="author_id" label="Author" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select author"
              options={authors.map((a) => ({ value: a.id, label: a.name }))}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="genre_id" label="Genre" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select genre"
              options={genres.map((g) => ({ value: g.id, label: g.name }))}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="isbn" label="ISBN" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="language" label="Language" rules={[{ required: true }]}>
              <Input placeholder="ru" />
            </Form.Item>
            <Form.Item name="year" label="Year" rules={[{ required: true }]}>
              <InputNumber className="!w-full" />
            </Form.Item>
          </div>

          {!editing && (
            <>
              <Form.Item
                label="Cover Image"
                required
                help={createCoverFile ? undefined : 'Required'}
                validateStatus={createCoverFile ? 'success' : undefined}
              >
                <Upload
                  beforeUpload={(file) => {
                    setCreateCoverFile(file)
                    return false
                  }}
                  onRemove={() => setCreateCoverFile(null)}
                  maxCount={1}
                  accept="image/*"
                  listType="picture"
                >
                  <Button icon={<UploadOutlined />}>Select Cover</Button>
                </Upload>
              </Form.Item>

              <div className="border-t pt-4 mt-2">
                <Typography.Text type="secondary" className="block mb-3">
                  Book File (optional)
                </Typography.Text>
                <Form.Item name="file_format" label="File Format">
                  <Select
                    allowClear
                    placeholder="Select format"
                    options={[
                      { value: 'pdf', label: 'PDF' },
                      { value: 'epub', label: 'EPUB' },
                      { value: 'mp3', label: 'MP3 (Audio)' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="file_total_pages" label="Total Pages (optional)">
                  <InputNumber min={1} className="!w-full" placeholder="e.g. 320" />
                </Form.Item>
                <Upload
                  beforeUpload={(file) => {
                    setCreateBookFile(file)
                    return false
                  }}
                  onRemove={() => setCreateBookFile(null)}
                  maxCount={1}
                  accept=".pdf,.epub,.mp3"
                >
                  <Button icon={<UploadOutlined />}>Select File</Button>
                </Upload>
              </div>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title="Upload Book File"
        open={fileModalOpen}
        onOk={handleFileUpload}
        onCancel={() => setFileModalOpen(false)}
      >
        <Form form={fileForm} layout="vertical" className="mt-4">
          <Form.Item name="format" label="Format" rules={[{ required: true }]}>
            <Select
              placeholder="Select format"
              options={[
                { value: 'pdf', label: 'PDF' },
                { value: 'epub', label: 'EPUB' },
                { value: 'mp3', label: 'MP3 (Audio)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="total_pages" label="Total Pages (optional)">
            <InputNumber min={1} className="!w-full" placeholder="e.g. 320" />
          </Form.Item>
          <Upload
            beforeUpload={(file) => {
              setFileUploadFile(file)
              return false
            }}
            onRemove={() => setFileUploadFile(null)}
            maxCount={1}
            accept=".pdf,.epub,.mp3"
          >
            <Button icon={<PlusOutlined />}>Select File</Button>
          </Upload>
        </Form>
      </Modal>
    </div>
  )
}
