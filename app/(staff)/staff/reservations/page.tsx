'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Table, Tabs, Tag, Button, Space, Typography, Input, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'

const { Title } = Typography
const { Search } = Input

type ReservationStatus = 'pending' | 'active' | 'completed' | 'cancelled'

interface Reservation {
  id: string
  user_name: string
  book_title: string
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
  completed: 'blue',
  cancelled: 'default',
}

const TAB_ITEMS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default function StaffReservationsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [actionId, setActionId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const pageSize = 20
  const isInitialMount = useRef(true)

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

  const normalize = (item: ReservationViewApiItem): Reservation => {
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
        const { data } = await api.get('/staff/reservations', { params })
        const itemsRaw = extractItems(data)
        const items = itemsRaw.map(normalize)
        const query = q.trim().toLowerCase()
        const filtered = query
          ? items.filter((r) => String(r.user_name ?? '').toLowerCase().includes(query))
          : items
        setReservations(filtered)
        setTotal(extractTotal(data) ?? filtered.length)
      } catch {
        message.error('Failed to load reservations')
      } finally {
        setLoading(false)
      }
    },
    [pageSize]
  )

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      fetchReservations(activeTab, 1, searchTerm)
      return
    }
    setPage(1)
    fetchReservations(activeTab, 1, searchTerm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchTerm, fetchReservations])

  useEffect(() => {
    if (isInitialMount.current) return
    fetchReservations(activeTab, page, searchTerm)
  }, [page, activeTab, searchTerm, fetchReservations])

  const handleSearch = (value: string) => {
    const trimmed = value.trim()
    setSearchTerm(trimmed)
    setPage(1)
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
      fetchReservations(activeTab, page, searchTerm)
    } catch {
      message.error('Action failed')
    } finally {
      setActionId(null)
    }
  }

  const confirm = (id: string) =>
    handleAction(
      id,
      () => api.patch(`/staff/reservations/${id}/status`, { status: 'active' }),
      'Reservation confirmed'
    )

  const returnBook = (id: string) =>
    handleAction(
      id,
      () => api.patch(`/staff/reservations/${id}/return`),
      'Book returned'
    )

  const cancel = (id: string) =>
    handleAction(
      id,
      () => api.patch(`/staff/reservations/${id}/cancel`),
      'Reservation cancelled'
    )

  const columns: ColumnsType<Reservation> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 90, ellipsis: true },
    { title: 'User', dataIndex: 'user_name', key: 'user_name' },
    { title: 'Book', dataIndex: 'book_title', key: 'book_title' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: ReservationStatus) => (
        <Tag color={STATUS_COLOR[status]}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Reserved',
      dataIndex: 'reserved_at',
      key: 'reserved_at',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              loading={actionId === record.id}
              onClick={() => confirm(record.id)}
            >
              Confirm
            </Button>
          )}
          {record.status === 'active' && (
            <Button
              size="small"
              loading={actionId === record.id}
              onClick={() => returnBook(record.id)}
            >
              Return
            </Button>
          )}
          {(record.status === 'pending' || record.status === 'active') && (
            <Button
              danger
              size="small"
              loading={actionId === record.id}
              onClick={() => cancel(record.id)}
            >
              Cancel
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Title level={4} className="!mb-6">
        Reservations
      </Title>

      <Tabs
        activeKey={activeTab}
        items={TAB_ITEMS}
        onChange={setActiveTab}
        className="!mb-4"
      />

      <Search
        placeholder="Search by user name"
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
        scroll={{ x: 700 }}
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
