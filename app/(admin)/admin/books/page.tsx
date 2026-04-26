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
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PictureOutlined,
  FileTextOutlined,
  BookOutlined,
  UploadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import type { Book, BookViewResponse, Author, Genre, PaginatedResponse } from '@/lib/types'

const { Title } = Typography

export default function BooksPage() {
  const { t } = useTranslation()
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
  const [createCoverFile, setCreateCoverFile] = useState<File | null>(null)
  const [createBookFile, setCreateBookFile] = useState<File | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [genreFilter, setGenreFilter] = useState<string | undefined>(undefined)
  const [form] = Form.useForm()
  const pageSize = 20

  const fetchBooks = useCallback(
    async (p: number, q?: string, genreId?: string) => {
      setLoading(true)
      try {
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

        const start = (p - 1) * pageSize
        const paginatedItems = isGenreEndpoint && !serverHasPagination ? items.slice(start, start + pageSize) : items

        const filteredItems = q && genreId ? paginatedItems.filter((b) => b.genre?.id === genreId) : paginatedItems

        setBooks(filteredItems)
        setTotal(isGenreEndpoint && !serverHasPagination ? items.length : dataObj.total ?? filteredItems.length)
      } catch {
        message.error(t('books.loadFailed'))
      } finally {
        setLoading(false)
      }
    },
    [t]
  )

  useEffect(() => {
    fetchBooks(page, searchQuery, genreFilter)
  }, [page, fetchBooks, searchQuery, genreFilter])

  useEffect(() => {
    api
      .get<PaginatedResponse<Author>>('/authors', { params: { limit: 200 } })
      .then(({ data }) => setAuthors(data.items))
    api.get('/genres').then(({ data }) => {
      setGenres(Array.isArray(data) ? data : data.items ?? [])
    })
  }, [])

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
      description_kk: book.description_kk,
      language: book.language,
      year: book.year,
      total_pages: book.total_pages,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()

    if (!editing && !createCoverFile) {
      message.error(t('books.coverRequired'))
      return
    }

    setSubmitting(true)
    try {
      if (editing) {
        await api.put(`/admin/books/${editing.id}`, values)
        message.success(t('books.bookUpdated'))
      } else {
        const formData = new FormData()
        formData.append('title', values.title)
        formData.append('author_id', values.author_id)
        formData.append('genre_id', values.genre_id)
        formData.append('isbn', values.isbn)
        formData.append('description', values.description)
        if (values.description_kk) formData.append('description_kk', values.description_kk)
        formData.append('language', values.language)
        formData.append('year', String(values.year))
        if (createCoverFile) formData.append('cover', createCoverFile)

        const { data: newBook } = await api.post<Book>('/admin/books', formData)
        message.success(t('books.bookCreated'))

        if (createBookFile) {
          const fileData = new FormData()
          fileData.append('book_id', newBook.id)
          fileData.append('file', createBookFile)
          try {
            await api.post('/admin/book-files/upload', fileData)
            message.success(t('books.fileBookUploaded'))
          } catch {
            message.warning(t('books.fileBookUploadWarn'))
          }
        }
      }
      setModalOpen(false)
      fetchBooks(page, searchQuery, genreFilter)
    } catch {
      message.error(t('books.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/books/${id}`)
      message.success(t('books.bookDeleted'))
      fetchBooks(page, searchQuery, genreFilter)
    } catch {
      message.error(t('books.deleteFailed'))
    }
  }

  const handleCoverUpload = async (bookId: string, file: File) => {
    const formData = new FormData()
    formData.append('cover', file)
    try {
      await api.post(`/admin/books/${bookId}/cover`, formData)
      message.success(t('books.coverUploaded'))
      fetchBooks(page, searchQuery, genreFilter)
    } catch {
      message.error(t('books.coverUploadFailed'))
    }
  }

  const openFileUpload = (bookId: string) => {
    setFileUploadBookId(bookId)
    setFileUploadFile(null)
    setFileModalOpen(true)
  }

  const handleFileUpload = async () => {
    if (!fileUploadFile) {
      message.error(t('books.selectFilePrompt'))
      return
    }
    const formData = new FormData()
    formData.append('book_id', fileUploadBookId)
    formData.append('file', fileUploadFile)
    try {
      await api.post('/admin/book-files/upload', formData)
      message.success(t('books.fileUploaded'))
      setFileModalOpen(false)
      fetchBooks(page, searchQuery, genreFilter)
    } catch {
      message.error(t('books.fileUploadFailed'))
    }
  }

  const columns: ColumnsType<BookViewResponse> = [
    {
      title: t('books.cover'),
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
    { title: t('books.bookTitle'), dataIndex: 'title', key: 'title', ellipsis: true, fixed: 'left', width: 200 },
    {
      title: t('books.author'),
      key: 'author',
      width: 150,
      ellipsis: true,
      render: (_, record) => record.author?.name ?? '—',
    },
    {
      title: t('books.genre'),
      key: 'genre',
      width: 120,
      ellipsis: true,
      render: (_, record) => record.genre?.name ?? '—',
    },
    { title: t('books.year'), dataIndex: 'year', key: 'year', width: 70 },
    { title: t('books.pages'), dataIndex: 'total_pages', key: 'total_pages', width: 80, align: 'center', render: (v: number) => v ?? '—' },
    { title: t('books.isbn'), dataIndex: 'isbn', key: 'isbn', width: 160 },
    { title: t('books.language'), dataIndex: 'language', key: 'language', width: 90, align: 'center' },
    {
      title: t('books.rating'),
      dataIndex: 'avg_rating',
      key: 'avg_rating',
      width: 70,
      align: 'center',
      render: (val: number) => val?.toFixed(1) ?? '—',
    },
    {
      title: t('common.actions'),
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
              title={t('books.uploadCoverHint')}
              className={record.cover_url ? '!text-green-500 !border-green-300' : ''}
            />
          </Upload>
          <Button
            size="small"
            icon={<FileTextOutlined />}
            title={t('books.uploadBookFileHint')}
            onClick={() => openFileUpload(record.id)}
            className={record.file ? '!text-green-500 !border-green-300' : ''}
          />
          <Popconfirm
            title={t('books.deletePrompt')}
            okText={t('common.yes')}
            cancelText={t('common.no')}
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
          {t('books.title')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('books.addBook')}
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Input.Search
          placeholder={t('books.searchPlaceholder')}
          allowClear
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
          style={{ maxWidth: 360 }}
        />
        <Select
          allowClear
          placeholder={t('books.filterByGenre')}
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
        title={editing ? t('books.editBook') : t('books.addBook')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={600}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="title" label={t('books.bookTitle')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="author_id" label={t('books.author')} rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder={t('books.selectAuthor')}
              options={authors.map((a) => ({ value: a.id, label: a.name }))}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="genre_id" label={t('books.genre')} rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder={t('books.selectGenre')}
              options={genres.map((g) => ({ value: g.id, label: g.name }))}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="isbn" label={t('books.isbn')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('books.descriptionRu')} rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="description_kk" label={t('books.descriptionKk')}>
            <Input.TextArea rows={3} placeholder={t('books.descriptionKkPlaceholder')} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="language" label={t('books.language')} rules={[{ required: true }]}>
              <Input placeholder="ru" />
            </Form.Item>
            <Form.Item name="year" label={t('books.year')} rules={[{ required: true }]}>
              <InputNumber className="!w-full" />
            </Form.Item>
          </div>

          {editing && (
            <Form.Item name="total_pages" label={t('books.pages')}>
              <InputNumber min={1} className="!w-full" placeholder={t('books.pagesPlaceholder')} />
            </Form.Item>
          )}

          {!editing && (
            <>
              <Form.Item
                label={t('books.cover')}
                required
                help={createCoverFile ? undefined : t('books.required')}
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
                  <Button icon={<UploadOutlined />}>{t('books.chooseCover')}</Button>
                </Upload>
              </Form.Item>

              <div className="border-t pt-4 mt-2">
                <Typography.Text type="secondary" className="block mb-3">
                  {t('books.bookFile')}
                </Typography.Text>
                <Upload
                  beforeUpload={(file) => {
                    setCreateBookFile(file)
                    return false
                  }}
                  onRemove={() => setCreateBookFile(null)}
                  maxCount={1}
                  accept=".pdf,.epub,.mp3"
                >
                  <Button icon={<UploadOutlined />}>{t('books.chooseFile')}</Button>
                </Upload>
              </div>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title={t('books.uploadFileTitle')}
        open={fileModalOpen}
        onOk={handleFileUpload}
        onCancel={() => setFileModalOpen(false)}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form layout="vertical" className="mt-4">
          <Upload
            beforeUpload={(file) => {
              setFileUploadFile(file)
              return false
            }}
            onRemove={() => setFileUploadFile(null)}
            maxCount={1}
            accept=".pdf,.epub,.mp3"
          >
            <Button icon={<PlusOutlined />}>{t('books.chooseFile')}</Button>
          </Upload>
        </Form>
      </Modal>
    </div>
  )
}
