'use client'

import { useEffect, useState, useCallback } from 'react'
import { Table, Tabs, Tag, Button, Space, Typography, message, Input } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'

const { Title } = Typography
const { Search } = Input

type ReservationStatus = 'pending' | 'active' | 'completed' | 'cancelled'

interface AdminReservation {
  id: string
  user_name: string
  book_title: string
  library_name: string
  status: ReservationStatus
  reserved_at: string
  due_date: string
}

type ReservationViewApiItem = {
  id?: string
  status?: ReservationStatus | string
  reserved_at?: string
  due_date?: string
  // Nested structure from Swagger
  user?: { name?: string; surname?: string }
  book?: { title?: string }
  library?: { name?: string }
  // Possible flat structure (older backend)
  user_name?: string
  book_title?: string
  library_name?: string
}

const STATUS_COLOR: Record<ReservationStatus, string> = {
  pending: 'orange',
  active: 'green',
  completed: 'cyan',
  cancelled: 'default',
}

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: 'Ожидает',
  active: 'Активна',
  completed: 'Завершена',
  cancelled: 'Отменена',
}

const TAB_ITEMS = [
  { key: 'all', label: 'Все' },
  { key: 'pending', label: 'Ожидают' },
  { key: 'active', label: 'Активные' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'cancelled', label: 'Отменённые' },
]

export default function AdminReservationsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [reservations, setReservations] = useState<AdminReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [actionId, setActionId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const pageSize = 20

  const extractItems = (payload: unknown): ReservationViewApiItem[] => {
    if (Array.isArray(payload)) return payload as ReservationViewApiItem[]

    const obj = payload as { items?: unknown }
    const itemsCandidate = obj.items
    if (Array.isArray(itemsCandidate)) return itemsCandidate as ReservationViewApiItem[]

    if (itemsCandidate && typeof itemsCandidate === 'object') {
      const nested = itemsCandidate as { items?: unknown }
      if (Array.isArray(nested.items)) return nested.items as ReservationViewApiItem[]
    }

    return []
  }

  const extractTotal = (payload: unknown): number | undefined => {
    const obj = payload as { total?: unknown }
    if (typeof obj.total === 'number') return obj.total
    return undefined
  }

  const normalize = (item: ReservationViewApiItem): AdminReservation => {
    const statusRaw = item.status
    const status: ReservationStatus =
      statusRaw === 'pending' || statusRaw === 'active' || statusRaw === 'completed' || statusRaw === 'cancelled'
        ? statusRaw
        : 'pending'

    const fullName = [item.user?.name, item.user?.surname]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(' ')

    return {
      id: String(item.id ?? ''),
      status,
      reserved_at: String(item.reserved_at ?? ''),
      due_date: String(item.due_date ?? ''),
      user_name: fullName || String(item.user_name ?? ''),
      book_title: String(item.book?.title ?? item.book_title ?? ''),
      library_name: String(item.library?.name ?? item.library_name ?? ''),
    }
  }

  const fetchReservations = useCallback(
    async (status: string, p: number, q: string) => {
      setLoading(true)
      try {
        const params: Record<string, unknown> = {
          limit: pageSize,
          offset: (p - 1) * pageSize,
        }
        if (status !== 'all') params.status = status
        const { data } = await api.get('/admin/reservations', { params })
        const itemsRaw = extractItems(data)
        const items = itemsRaw.map(normalize)
        const query = q.trim().toLowerCase()
        const filtered = query
          ? items.filter((r) => String(r.user_name ?? '').toLowerCase().includes(query))
          : items
        setReservations(filtered)
        setTotal(extractTotal(data) ?? filtered.length)
      } catch {
        message.error('Не удалось загрузить брони')
      } finally {
        setLoading(false)
      }
    },
    [pageSize]
  )

  useEffect(() => {
    setPage(1)
    fetchReservations(activeTab, 1, searchQuery)
  }, [activeTab, searchQuery, fetchReservations])

  useEffect(() => {
    fetchReservations(activeTab, page, searchQuery)
  }, [page, activeTab, searchQuery, fetchReservations])

  const handleSearch = (value: string) => {
    setSearchQuery(value.trim())
  }

  const handleAction = async (
    id: string,
    action: () => Promise<unknown>,
    successMsg: string
  ) => {
    setActionId(id)
    try {
      await action()
      message.success(successMsg)
      fetchReservations(activeTab, page, searchQuery)
    } catch {
      message.error('Действие не выполнено')
    } finally {
      setActionId(null)
    }
  }

  const changeStatus = (id: string, status: string) =>
    handleAction(
      id,
      () => api.patch(`/admin/reservations/${id}/status`, { status }),
      'Статус обновлён'
    )

  const returnBook = (id: string) =>
    handleAction(
      id,
      () => api.patch(`/admin/reservations/${id}/return`),
      'Книга возвращена'
    )

  const columns: ColumnsType<AdminReservation> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 90, ellipsis: true },
    { title: 'Пользователь', dataIndex: 'user_name', key: 'user_name' },
    { title: 'Книга', dataIndex: 'book_title', key: 'book_title' },
    { title: 'Библиотека', dataIndex: 'library_name', key: 'library_name' },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: ReservationStatus) => (
        <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>
      ),
    },
    {
      title: 'Забронирована',
      dataIndex: 'reserved_at',
      key: 'reserved_at',
      render: (val: string) => new Date(val).toLocaleDateString('ru'),
    },
    {
      title: 'Срок',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (val: string) => new Date(val).toLocaleDateString('ru'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              loading={actionId === record.id}
              onClick={() => changeStatus(record.id, 'active')}
            >
              Подтвердить
            </Button>
          )}
          {record.status === 'active' && (
            <Button
              size="small"
              loading={actionId === record.id}
              onClick={() => returnBook(record.id)}
            >
              Возврат
            </Button>
          )}
          {(record.status === 'pending' || record.status === 'active') && (
            <Button
              danger
              size="small"
              loading={actionId === record.id}
              onClick={() => changeStatus(record.id, 'cancelled')}
            >
              Отменить
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Title level={4} className="!mb-6">
        Брони
      </Title>

      <Tabs
        activeKey={activeTab}
        items={TAB_ITEMS}
        onChange={setActiveTab}
        className="!mb-4"
      />

      <Search
        placeholder="Поиск по имени пользователя"
        allowClear
        onSearch={handleSearch}
        className="!mb-4"
        style={{ maxWidth: 360 }}
      />

      <Table
        columns={columns}
        dataSource={reservations}
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
    </div>
  )
}
