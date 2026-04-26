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
  InputNumber,
  Space,
  Popconfirm,
  Upload,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { RcFile } from 'antd/es/upload'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import type { Library, PaginatedResponse } from '@/lib/types'

const { Title } = Typography
const { Search } = Input

export default function LibrariesPage() {
  const { t } = useTranslation()
  const [libraries, setLibraries] = useState<Library[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Library | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [createPhotoFile, setCreatePhotoFile] = useState<File | null>(null)
  const [form] = Form.useForm()
  const pageSize = 20

  const fetchLibraries = async (p: number, q?: string) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { limit: pageSize, offset: (p - 1) * pageSize }
      const { data } = await api.get<PaginatedResponse<Library>>('/libraries', { params })
      const dataObj = data as { items?: Library[] }
      const items: Library[] = Array.isArray(dataObj.items) ? dataObj.items : []

      const query = (q ?? searchTerm).trim().toLowerCase()
      const filtered = query
        ? items.filter((l) => {
            const name = String(l.name ?? '').toLowerCase()
            const address = String(l.address ?? '').toLowerCase()
            return name.includes(query) || address.includes(query)
          })
        : items

      setLibraries(filtered)
      setTotal(filtered.length)
    } catch {
      message.error(t('libraries.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLibraries(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleSearch = (value: string) => {
    const trimmed = value.trim()
    setSearchTerm(trimmed)
    setPage(1)
    fetchLibraries(1, trimmed)
  }

  const openCreate = () => {
    setEditing(null)
    setCreatePhotoFile(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (lib: Library) => {
    setEditing(lib)
    form.setFieldsValue(lib)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      if (editing) {
        await api.put(`/admin/libraries/${editing.id}`, values)
        message.success(t('libraries.libraryUpdated'))
      } else {
        const { data: newLib } = await api.post<Library>('/admin/libraries', values)
        if (createPhotoFile) {
          const formData = new FormData()
          formData.append('photo', createPhotoFile)
          try {
            await api.post(`/admin/libraries/${newLib.id}/photo`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          } catch {
            message.warning(t('libraries.libraryCreatedNoPhoto'))
          }
        }
        message.success(t('libraries.libraryCreated'))
      }
      setModalOpen(false)
      fetchLibraries(page)
    } catch {
      message.error(t('libraries.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePhotoUpload = async (file: RcFile) => {
    if (!editing) return false
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const { data } = await api.post<Library>(`/admin/libraries/${editing.id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setEditing(data)
      message.success(t('libraries.photoUploaded'))
    } catch {
      message.error(t('libraries.photoUploadFailed'))
    } finally {
      setUploading(false)
    }
    return false
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/libraries/${id}`)
      message.success(t('libraries.libraryDeleted'))
      fetchLibraries(page)
    } catch {
      message.error(t('libraries.deleteFailed'))
    }
  }

  const columns: ColumnsType<Library> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 90, ellipsis: true },
    {
      title: t('libraries.photo'),
      dataIndex: 'photo_url',
      key: 'photo_url',
      width: 72,
      render: (url: string) =>
        url ? (
          <img src={url} alt="" className="w-12 h-10 object-cover rounded" />
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        ),
    },
    { title: t('libraries.name'), dataIndex: 'name', key: 'name' },
    { title: t('libraries.address'), dataIndex: 'address', key: 'address' },
    { title: t('libraries.phone'), dataIndex: 'phone', key: 'phone' },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title={t('libraries.deletePrompt')}
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
          {t('libraries.title')}
        </Title>
        <Space>
          <Search
            placeholder={t('libraries.searchPlaceholder')}
            allowClear
            onSearch={handleSearch}
            style={{ width: 250 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('libraries.addLibrary')}
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={libraries}
        rowKey="id"
        loading={loading}
        scroll={{ x: 700 }}
        pagination={{
          current: page,
          total,
          pageSize,
          onChange: setPage,
          showSizeChanger: false,
        }}
      />

      <Modal
        title={editing ? t('libraries.editLibrary') : t('libraries.addLibrary')}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label={t('libraries.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label={t('libraries.address')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label={t('libraries.phone')}>
            <Input />
          </Form.Item>
          <Form.Item name="lat" label={t('libraries.lat')} rules={[{ required: true }]}>
            <InputNumber className="!w-full" />
          </Form.Item>
          <Form.Item name="lng" label={t('libraries.lng')} rules={[{ required: true }]}>
            <InputNumber className="!w-full" />
          </Form.Item>
          <Form.Item label={t('libraries.photo')}>
            {editing ? (
              <Space direction="vertical" className="w-full">
                {editing.photo_url && (
                  <img
                    src={editing.photo_url}
                    alt="preview"
                    className="w-32 h-24 object-cover rounded border"
                  />
                )}
                <Upload
                  accept="image/jpeg,image/png,image/webp"
                  showUploadList={false}
                  beforeUpload={handlePhotoUpload}
                >
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    {t('libraries.uploadPhoto')}
                  </Button>
                </Upload>
              </Space>
            ) : (
              <Upload
                accept="image/jpeg,image/png,image/webp"
                listType="picture"
                maxCount={1}
                beforeUpload={(file) => { setCreatePhotoFile(file); return false }}
                onRemove={() => setCreatePhotoFile(null)}
              >
                <Button icon={<UploadOutlined />}>{t('libraries.choosePhoto')}</Button>
              </Upload>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
