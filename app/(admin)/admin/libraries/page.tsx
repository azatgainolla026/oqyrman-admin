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
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'
import type { Library, PaginatedResponse } from '@/lib/types'

const { Title } = Typography
const { Search } = Input

export default function LibrariesPage() {
  const [libraries, setLibraries] = useState<Library[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Library | null>(null)
  const [submitting, setSubmitting] = useState(false)
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
      message.error('Не удалось загрузить библиотеки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLibraries(page)
  }, [page])

  const handleSearch = (value: string) => {
    const trimmed = value.trim()
    setSearchTerm(trimmed)
    setPage(1)
    fetchLibraries(1, trimmed)
  }

  const openCreate = () => {
    setEditing(null)
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
        message.success('Библиотека обновлена')
      } else {
        await api.post('/admin/libraries', values)
        message.success('Библиотека создана')
      }
      setModalOpen(false)
      fetchLibraries(page)
    } catch {
      message.error('Не удалось сохранить библиотеку')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/libraries/${id}`)
      message.success('Библиотека удалена')
      fetchLibraries(page)
    } catch {
      message.error('Не удалось удалить библиотеку')
    }
  }

  const columns: ColumnsType<Library> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 90, ellipsis: true },
    { title: 'Название', dataIndex: 'name', key: 'name' },
    { title: 'Адрес', dataIndex: 'address', key: 'address' },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Удалить эту библиотеку?"
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
          Библиотеки
        </Title>
        <Space>
          <Search
            placeholder="Поиск по названию или адресу"
            allowClear
            onSearch={handleSearch}
            style={{ width: 250 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Добавить библиотеку
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
        title={editing ? 'Редактировать библиотеку' : 'Добавить библиотеку'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Адрес" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input />
          </Form.Item>
          <Form.Item name="lat" label="Широта" rules={[{ required: true }]}>
            <InputNumber className="!w-full" />
          </Form.Item>
          <Form.Item name="lng" label="Долгота" rules={[{ required: true }]}>
            <InputNumber className="!w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
