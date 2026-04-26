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
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import type { Event } from '@/lib/types'

const { Title } = Typography
const { RangePicker } = DatePicker

export default function EventsPage() {
  const { t } = useTranslation()
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
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null)
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
      message.error(t('events.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setEditCoverFile(null)
    form.setFieldsValue({
      title: event.title,
      title_kk: (event as Event & { title_kk?: string }).title_kk,
      description: event.description,
      description_kk: (event as Event & { description_kk?: string }).description_kk,
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
        const formData = new FormData()
        formData.append('title', values.title)
        if (values.title_kk) formData.append('title_kk', values.title_kk)
        if (values.description) formData.append('description', values.description)
        if (values.description_kk) formData.append('description_kk', values.description_kk)
        if (values.location) formData.append('location', values.location)
        formData.append('starts_at', values.dates[0].toISOString())
        formData.append('ends_at', values.dates[1].toISOString())
        if (editCoverFile) formData.append('cover', editCoverFile)
        await api.put(`/admin/events/${editing.id}`, formData)
        message.success(t('events.eventUpdated'))
      } else {
        if (!createCoverFile) {
          message.error(t('events.coverRequired'))
          setSubmitting(false)
          return
        }

        const formData = new FormData()
        formData.append('title', values.title)
        if (values.title_kk) formData.append('title_kk', values.title_kk)
        if (values.description) formData.append('description', values.description)
        if (values.description_kk) formData.append('description_kk', values.description_kk)
        if (values.location) formData.append('location', values.location)
        formData.append('starts_at', values.dates[0].toISOString())
        formData.append('ends_at', values.dates[1].toISOString())
        formData.append('cover', createCoverFile)

        await api.post('/admin/events', formData)
        message.success(t('events.eventCreated'))
      }
      setModalOpen(false)
      fetchEvents(page)
    } catch {
      message.error(t('events.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/events/${id}`)
      message.success(t('events.eventDeleted'))
      fetchEvents(page)
    } catch {
      message.error(t('events.deleteFailed'))
    }
  }

  const columns: ColumnsType<Event> = [
    {
      title: t('events.cover'),
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
    { title: t('events.eventTitle'), dataIndex: 'title', key: 'title' },
    { title: t('events.location'), dataIndex: 'location', key: 'location' },
    { title: t('events.description'), dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: t('events.starts'),
      dataIndex: 'starts_at',
      key: 'starts_at',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: t('events.ends'),
      dataIndex: 'ends_at',
      key: 'ends_at',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title={t('events.deletePrompt')}
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Title level={4} className="!mb-0">
          {t('events.title')}
        </Title>
        <div className="flex flex-1 items-center justify-end gap-3">
          <Input.Search
            placeholder={t('events.searchPlaceholder')}
            allowClear
            onSearch={handleSearch}
            style={{ maxWidth: 320 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('events.addEvent')}
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
        title={editing ? t('events.editEvent') : t('events.addEvent')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="title" label={`${t('events.eventTitle')} (RU)`} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="title_kk" label={`${t('events.eventTitle')} (KK)`}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={`${t('events.description')} (RU)`} rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="description_kk" label={`${t('events.description')} (KK)`}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="location" label={t('events.locationFull')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {!editing ? (
            <Form.Item
              label={t('events.cover')}
              required
              help={createCoverFile ? undefined : t('events.required')}
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
                <Button icon={<UploadOutlined />}>{t('events.chooseCover')}</Button>
              </Upload>
            </Form.Item>
          ) : (
            <Form.Item label={t('events.cover')}>
              <Space direction="vertical">
                {editing.cover_url && !editCoverFile && (
                  <img src={editing.cover_url} alt="cover" className="w-24 h-24 object-cover rounded border" />
                )}
                <Upload
                  beforeUpload={(file) => {
                    setEditCoverFile(file)
                    return false
                  }}
                  onRemove={() => setEditCoverFile(null)}
                  maxCount={1}
                  accept="image/*"
                  listType="picture"
                >
                  <Button icon={<UploadOutlined />}>
                    {editing.cover_url ? t('events.replaceCover') : t('events.uploadCover')}
                  </Button>
                </Upload>
              </Space>
            </Form.Item>
          )}
          <Form.Item name="dates" label={t('events.period')} rules={[{ required: true }]}>
            <RangePicker className="!w-full" showTime />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
