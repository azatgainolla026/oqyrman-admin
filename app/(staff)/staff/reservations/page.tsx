'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Table, Tabs, Tag, Button, Space, Typography, Input, Modal, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { QrcodeOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false })

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

export default function StaffReservationsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [actionId, setActionId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
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
        message.error('Не удалось загрузить брони')
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
      message.error('Действие не выполнено')
    } finally {
      setActionId(null)
    }
  }

  const handleScan = useCallback(async (token: string) => {
    setScanLoading(true)
    try {
      await api.post('/staff/reservations/scan', { qr_token: token })
      message.success('Книга выдана — бронь активирована')
      setScanOpen(false)
      fetchReservations(activeTab, page, searchTerm)
    } catch {
      message.error('QR-код не найден или бронь уже не в статусе pending')
      setScanOpen(false)
    } finally {
      setScanLoading(false)
    }
  }, [activeTab, page, searchTerm, fetchReservations])

  const confirm = (id: string) =>
    handleAction(
      id,
      () => api.patch(`/staff/reservations/${id}/status`, { status: 'active' }),
      'Бронь подтверждена'
    )

  const returnBook = (id: string) =>
    handleAction(
      id,
      () => api.patch(`/staff/reservations/${id}/return`),
      'Книга возвращена'
    )

  const cancel = (id: string) =>
    handleAction(
      id,
      () => api.patch(`/staff/reservations/${id}/cancel`),
      'Бронь отменена'
    )

  const columns: ColumnsType<Reservation> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 90, ellipsis: true },
    { title: 'Пользователь', dataIndex: 'user_name', key: 'user_name' },
    { title: 'Книга', dataIndex: 'book_title', key: 'book_title' },
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
              onClick={() => confirm(record.id)}
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
              onClick={() => cancel(record.id)}
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
      <div className="flex items-center justify-between mb-6">
        <Title level={4} className="!mb-0">
          Брони
        </Title>
        <Button
          type="primary"
          icon={<QrcodeOutlined />}
          onClick={() => setScanOpen(true)}
        >
          Сканировать QR
        </Button>
      </div>

      <Modal
        title="Сканировать QR-код брони"
        open={scanOpen}
        onCancel={() => setScanOpen(false)}
        footer={null}
        width={400}
        destroyOnHidden
      >
        {scanLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p>Обработка...</p>
          </div>
        ) : (
          <QRScanner active={scanOpen && !scanLoading} onScan={handleScan} />
        )}
      </Modal>

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
