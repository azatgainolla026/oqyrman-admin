'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Typography,
  message,
  Modal,
  Form,
  Input,
  DatePicker,
  Space,
  Popconfirm,
  Image,
  Upload,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import api from '@/lib/api'
import type { Event } from '@/lib/types'

const { Title } = Typography
const { RangePicker } = DatePicker

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [form] = Form.useForm()
  const [createCoverFile, setCreateCoverFile] = useState<File | null>(null)
  const pageSize = 20

  const extractItems = (payload: unknown): Event[] => {
    if (Array.isArray(payload)) return payload as Event[]

    const obj = payload as { items?: unknown }
    const itemsCandidate = obj.items
    if (Array.isArray(itemsCandidate)) return itemsCandidate as Event[]

    if (itemsCandidate && typeof itemsCandidate === 'object') {
      const nested = itemsCandidate as { items?: unknown }
      if (Array.isArray(nested.items)) return nested.items as Event[]
    }

    return []
  }

  const extractTotal = (payload: unknown): number | undefined => {
    const obj = payload as { total?: unknown }
    if (typeof obj.total === 'number') return obj.total
    return undefined
  }

  const fetchEvents = async (p: number, q?: string) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { limit: pageSize, offset: (p - 1) * pageSize }
      const { data } = await api.get('/events', { params })
      const items = extractItems(data)
      const query = (q ?? search).trim()
      const filtered = query
        ? items.filter((e) => {
            const title = String(e.title ?? '').toLowerCase()
            const location = String(e.location ?? '').toLowerCase()
            return title.includes(query.toLowerCase()) || location.includes(query.toLowerCase())
          })
        : items
      setEvents(filtered)
      setTotal(extractTotal(data) ?? filtered.length)
    } catch {
      message.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(page)
  }, [page])

  const handleSearch = (value: string) => {
    const trimmed = value.trim()
    setSearch(trimmed)
    setPage(1)
    fetchEvents(1, trimmed)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setCreateCoverFile(null)
    setModalOpen(true)
  }

  const openEdit = (event: Event) => {
    setEditing(event)
    form.setFieldsValue({
      title: event.title,
      description: event.description,
      location: event.location,
      dates: [dayjs(event.starts_at), dayjs(event.ends_at)],
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()

    setSubmitting(true)
    try {
      if (editing) {
        // Обновление события по JSON (обложка не меняется этим эндпоинтом)
        const payload = {
          title: values.title,
          description: values.description,
          location: values.location,
          starts_at: values.dates[0].toISOString(),
          ends_at: values.dates[1].toISOString(),
        }
        await api.put(`/admin/events/${editing.id}`, payload)
        message.success('Event updated')
      } else {
        if (!createCoverFile) {
          message.error('Please upload a cover image')
          setSubmitting(false)
          return
        }

        const formData = new FormData()
        formData.append('title', values.title)
        if (values.description) formData.append('description', values.description)
        if (values.location) formData.append('location', values.location)
        formData.append('starts_at', values.dates[0].toISOString())
        formData.append('ends_at', values.dates[1].toISOString())
        formData.append('cover', createCoverFile)

        await api.post('/admin/events', formData)
        message.success('Event created')
      }
      setModalOpen(false)
      fetchEvents(page)
    } catch {
      message.error('Failed to save event')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/events/${id}`)
      message.success('Event deleted')
      fetchEvents(page)
    } catch {
      message.error('Failed to delete event')
    }
  }

  const columns: ColumnsType<Event> = [
    {
      title: 'Cover',
      key: 'cover',
      width: 80,
      align: 'center',
      render: (_, record) =>
        record.cover_url ? (
          <Image
            src={record.cover_url}
            alt={record.title}
            width={48}
            height={48}
            style={{ objectFit: 'cover', borderRadius: 6 }}
            fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSI4IiBmaWxsPSIjZjVmNWY1Ii8+PHBhdGggZD0iTTI0IDI4QzI2LjIwOTEgMjggMjggMjYuMjA5MSAyOCAyNEMyOCAyMS43OTA5IDI2LjIwOTEgMjAgMjQgMjBDMjEuNzkwOSAyMCAyMCAyMS43OTA5IDIwIDI0QzIwIDI2LjIwOTEgMjEuNzkwOSAyOCAyNCAyOFoiIGZpbGw9IiNjY2MiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjIwIiByPSI0IiBmaWxsPSIjZWVlIi8+PC9zdmc+"
            preview={{ mask: false }}
          />
        ) : (
          <div
            className="flex items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded-md mx-auto"
            style={{ width: 48, height: 48 }}
          >
            <PictureOutlined className="text-gray-300 text-lg" />
          </div>
        ),
    },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Start',
      dataIndex: 'starts_at',
      key: 'starts_at',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: 'End',
      dataIndex: 'ends_at',
      key: 'ends_at',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Delete this event?"
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Title level={4} className="!mb-0">
          Events
        </Title>
        <div className="flex flex-1 items-center justify-end gap-3">
          <Input.Search
            placeholder="Search by title or location"
            allowClear
            onSearch={handleSearch}
            style={{ maxWidth: 320 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Event
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={events}
        rowKey="id"
        loading={loading}
        scroll={{ x: 800 }}
        pagination={{
          current: page,
          total,
          pageSize,
          onChange: setPage,
          showSizeChanger: false,
        }}
      />

      <Modal
        title={editing ? 'Edit Event' : 'Add Event'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="location" label="Location" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {!editing && (
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
          )}
          <Form.Item name="dates" label="Date Range" rules={[{ required: true }]}>
            <RangePicker className="!w-full" showTime />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
