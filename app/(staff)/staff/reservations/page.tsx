'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Table, Tabs, Tag, Button, Space, Typography, Input, Modal, message, Descriptions, List, Avatar } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { QrcodeOutlined, UserOutlined, BookOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false })

const { Title, Text } = Typography
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
  user?: { name?: string; surname?: string }
  book?: { title?: string; cover_url?: string }
  library?: { name?: string }
  user_name?: string
  book_title?: string
  library_name?: string
}

interface LookupUser {
  id: string
  name: string
  surname: string
  email: string
  phone: string
  avatar_url?: string
}

interface LookupReservation {
  id: string
  book_title: string
  book_cover_url: string
  reserved_at: string
  due_date: string
}

interface LookupResult {
  user: LookupUser
  pending: LookupReservation[]
  active: LookupReservation[]
}

const STATUS_COLOR: Record<ReservationStatus, string> = {
  pending: 'orange',
  active: 'green',
  completed: 'cyan',
  cancelled: 'default',
}

export default function StaffReservationsPage() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState('all')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [actionId, setActionId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [scanOpen, setScanOpen] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)

  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [lookupOpen, setLookupOpen] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [returningId, setReturningId] = useState<string | null>(null)

  const pageSize = 20
  const isInitialMount = useRef(true)
  const dateLocale = i18n.language?.startsWith('kk') ? 'kk-KZ' : 'ru-RU'

  const STATUS_LABEL: Record<ReservationStatus, string> = {
    pending: t('reservations.statusPending'),
    active: t('reservations.statusActive'),
    completed: t('reservations.statusCompleted'),
    cancelled: t('reservations.statusCancelled'),
  }

  const TAB_ITEMS = [
    { key: 'all', label: t('reservations.tabAll') },
    { key: 'pending', label: t('reservations.tabPending') },
    { key: 'active', label: t('reservations.tabActive') },
    { key: 'completed', label: t('reservations.tabCompleted') },
    { key: 'cancelled', label: t('reservations.tabCancelled') },
  ]

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
        message.error(t('reservations.loadFailed'))
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setSearchTerm(value.trim())
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
      message.error(t('common.actionFailed'))
    } finally {
      setActionId(null)
    }
  }

  const mapLookupItems = (items: ReservationViewApiItem[]): LookupReservation[] =>
    items.map((r) => ({
      id: String(r.id ?? ''),
      book_title: String(r.book?.title ?? r.book_title ?? ''),
      book_cover_url: String((r.book as { cover_url?: string } | undefined)?.cover_url ?? ''),
      reserved_at: String(r.reserved_at ?? ''),
      due_date: String(r.due_date ?? ''),
    }))

  const handleScan = useCallback(
    async (qrCode: string) => {
      setScanLoading(true)
      try {
        const { data } = await api.post('/staff/users/qr-lookup', { qr_code: qrCode })
        const user = data.user as LookupUser
        const pending = mapLookupItems((data.pending_reservations ?? []) as ReservationViewApiItem[])
        const active = mapLookupItems((data.active_reservations ?? []) as ReservationViewApiItem[])
        setLookupResult({ user, pending, active })
        setScanOpen(false)
        setLookupOpen(true)
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404) {
          message.error(t('reservations.userNotFound'))
        } else {
          message.error(t('reservations.lookupFailed'))
        }
        setScanOpen(false)
      } finally {
        setScanLoading(false)
      }
    },
    [t]
  )

  const handleConfirmReservation = async (reservationId: string) => {
    setConfirmingId(reservationId)
    try {
      await api.patch(`/staff/reservations/${reservationId}/status`, { status: 'active' })
      message.success(t('reservations.bookIssued'))
      setLookupOpen(false)
      setLookupResult(null)
      fetchReservations(activeTab, page, searchTerm)
    } catch {
      message.error(t('reservations.issueFailed'))
    } finally {
      setConfirmingId(null)
    }
  }

  const handleReturnReservation = async (reservationId: string) => {
    setReturningId(reservationId)
    try {
      await api.patch(`/staff/reservations/${reservationId}/return`)
      message.success(t('reservations.bookAccepted'))
      setLookupOpen(false)
      setLookupResult(null)
      fetchReservations(activeTab, page, searchTerm)
    } catch {
      message.error(t('reservations.returnFailed'))
    } finally {
      setReturningId(null)
    }
  }

  const confirm = (id: string) =>
    handleAction(
      id,
      () => api.patch(`/staff/reservations/${id}/status`, { status: 'active' }),
      t('reservations.reservationConfirmed')
    )

  const returnBook = (id: string) =>
    handleAction(
      id,
      () => api.patch(`/staff/reservations/${id}/return`),
      t('reservations.bookReturned')
    )

  const cancel = (id: string) =>
    handleAction(
      id,
      () => api.patch(`/staff/reservations/${id}/cancel`),
      t('reservations.reservationCancelled')
    )

  const columns: ColumnsType<Reservation> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 90, ellipsis: true },
    { title: t('reservations.user'), dataIndex: 'user_name', key: 'user_name' },
    { title: t('reservations.book'), dataIndex: 'book_title', key: 'book_title' },
    {
      title: t('reservations.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: ReservationStatus) => (
        <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>
      ),
    },
    {
      title: t('reservations.reservedAt'),
      dataIndex: 'reserved_at',
      key: 'reserved_at',
      render: (val: string) => new Date(val).toLocaleDateString(dateLocale),
    },
    {
      title: t('reservations.dueDate'),
      dataIndex: 'due_date',
      key: 'due_date',
      render: (val: string) => new Date(val).toLocaleDateString(dateLocale),
    },
    {
      title: t('common.actions'),
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
              {t('reservations.confirm')}
            </Button>
          )}
          {record.status === 'active' && (
            <Button
              size="small"
              loading={actionId === record.id}
              onClick={() => returnBook(record.id)}
            >
              {t('reservations.return')}
            </Button>
          )}
          {(record.status === 'pending' || record.status === 'active') && (
            <Button
              danger
              size="small"
              loading={actionId === record.id}
              onClick={() => cancel(record.id)}
            >
              {t('reservations.cancel')}
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
          {t('reservations.title')}
        </Title>
        <Button
          type="primary"
          icon={<QrcodeOutlined />}
          onClick={() => setScanOpen(true)}
        >
          {t('reservations.scanQR')}
        </Button>
      </div>

      <Modal
        title={t('reservations.scanLibraryCard')}
        open={scanOpen}
        onCancel={() => setScanOpen(false)}
        footer={null}
        width={400}
        destroyOnHidden
      >
        {scanLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p>{t('reservations.searchingUser')}</p>
          </div>
        ) : (
          <QRScanner active={scanOpen && !scanLoading} onScan={handleScan} />
        )}
      </Modal>

      <Modal
        title={t('reservations.issueOrReturn')}
        open={lookupOpen}
        onCancel={() => { setLookupOpen(false); setLookupResult(null) }}
        footer={null}
        width={560}
        destroyOnHidden
      >
        {lookupResult && (
          <div>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 20 }}>
              <Descriptions.Item label={<><UserOutlined /> {t('reservations.user')}</>}>
                <Text strong>{lookupResult.user.name} {lookupResult.user.surname}</Text>
              </Descriptions.Item>
              {lookupResult.user.email && (
                <Descriptions.Item label="Email">{lookupResult.user.email}</Descriptions.Item>
              )}
              {lookupResult.user.phone && (
                <Descriptions.Item label={t('users.phone')}>{lookupResult.user.phone}</Descriptions.Item>
              )}
            </Descriptions>

            {lookupResult.pending.length > 0 && (
              <>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  {t('reservations.pendingPickup')}
                </Text>
                <List
                  dataSource={lookupResult.pending}
                  style={{ marginBottom: 16 }}
                  renderItem={(res) => (
                    <List.Item
                      actions={[
                        <Button
                          key="issue"
                          type="primary"
                          loading={confirmingId === res.id}
                          onClick={() => handleConfirmReservation(res.id)}
                        >
                          {t('reservations.issue')}
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          res.book_cover_url
                            ? <Avatar shape="square" size={48} src={res.book_cover_url} />
                            : <Avatar shape="square" size={48} icon={<BookOutlined />} />
                        }
                        title={res.book_title}
                        description={t('reservations.reservedDate', {
                          date: new Date(res.reserved_at).toLocaleDateString(dateLocale),
                        })}
                      />
                    </List.Item>
                  )}
                />
              </>
            )}

            {lookupResult.active.length > 0 && (
              <>
                {lookupResult.pending.length > 0 && <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: 16 }} />}
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                  {t('reservations.onHands')}
                </Text>
                <List
                  dataSource={lookupResult.active}
                  renderItem={(res) => (
                    <List.Item
                      actions={[
                        <Button
                          key="return"
                          loading={returningId === res.id}
                          onClick={() => handleReturnReservation(res.id)}
                        >
                          {t('reservations.returnBtn')}
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          res.book_cover_url
                            ? <Avatar shape="square" size={48} src={res.book_cover_url} />
                            : <Avatar shape="square" size={48} icon={<BookOutlined />} />
                        }
                        title={res.book_title}
                        description={t('reservations.dueDateLabel', {
                          date: new Date(res.due_date).toLocaleDateString(dateLocale),
                        })}
                      />
                    </List.Item>
                  )}
                />
              </>
            )}

            {lookupResult.pending.length === 0 && lookupResult.active.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#888' }}>
                <BookOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                <p>{t('reservations.noReservations')}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Tabs
        activeKey={activeTab}
        items={TAB_ITEMS}
        onChange={setActiveTab}
        className="!mb-4"
      />

      <Search
        placeholder={t('reservations.searchPlaceholder')}
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
