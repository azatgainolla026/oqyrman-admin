'use client'

import { useEffect, useState } from 'react'
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Skeleton,
  Space,
  message,
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BookOutlined,
  InboxOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  StopOutlined,
} from '@ant-design/icons'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import api from '@/lib/api'
import type { Library, StaffStats } from '@/lib/types'
import Cookies from 'js-cookie'

const { Title, Text } = Typography

const RESERVATION_COLORS = {
  Ожидают: '#f97316',
  Активные: '#1E5945',
  Завершённые: '#14b8a6',
  Отменённые: '#ef4444',
}

const BOOK_COLORS = {
  total: '#1E5945',
  available: '#4fd1a5',
}

export default function StaffDashboardPage() {
  const [library, setLibrary] = useState<Library | null>(null)
  const [stats, setStats] = useState<StaffStats | null>(null)
  const [loadingPage, setLoadingPage] = useState(true)

  useEffect(() => {
    const libraryId = Cookies.get('library_id')

    Promise.all([
      api.get(`/libraries/${libraryId}`),
      api.get('/staff/library/stats'),
    ])
      .then(([libraryRes, statsRes]) => {
        setLibrary(libraryRes.data)
        setStats(statsRes.data)
      })
      .catch(() => message.error('Не удалось загрузить данные'))
      .finally(() => setLoadingPage(false))
  }, [])

  const statCards = [
    {
      title: 'Ожидают',
      value: stats?.pending_reservations,
      icon: <ClockCircleOutlined className="text-orange-500 text-2xl" />,
    },
    {
      title: 'Активные',
      value: stats?.active_reservations,
      icon: <CheckCircleOutlined className="text-emerald-700 text-2xl" />,
    },
    {
      title: 'Завершённые',
      value: stats?.completed_reservations,
      icon: <CalendarOutlined className="text-teal-500 text-2xl" />,
    },
    {
      title: 'Отменённые',
      value: stats?.cancelled_reservations,
      icon: <StopOutlined className="text-red-400 text-2xl" />,
    },
    {
      title: 'Книг всего',
      value: stats?.total_books,
      icon: <BookOutlined className="text-purple-500 text-2xl" />,
    },
    {
      title: 'Книг доступно',
      value: stats?.available_books,
      icon: <InboxOutlined className="text-cyan-500 text-2xl" />,
    },
  ]

  const pieData = stats
    ? [
        { name: 'Ожидают', value: stats.pending_reservations },
        { name: 'Активные', value: stats.active_reservations },
        { name: 'Завершённые', value: stats.completed_reservations },
        { name: 'Отменённые', value: stats.cancelled_reservations },
      ]
    : []
  const pieDataNonZero = pieData.filter((item) => item.value > 0)

  const barData = stats
    ? [
        { name: 'Книг всего', value: stats.total_books, fill: BOOK_COLORS.total },
        { name: 'Книг доступно', value: stats.available_books, fill: BOOK_COLORS.available },
      ]
    : []

  return (
    <div>
      <Title level={4} className="!mb-6">
        Моя библиотека
      </Title>

      <Card className="!mb-6">
        {loadingPage ? (
          <Skeleton active paragraph={{ rows: 1 }} />
        ) : (
          <Space size="large" wrap>
            <Text strong className="text-lg">
              {library?.name}
            </Text>
            <a
              href={`https://2gis.kz/almaty/search/${encodeURIComponent(library?.address || '')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Space size="small" className="hover:opacity-70 transition-opacity">
                <EnvironmentOutlined className="text-emerald-700" />
                <Text className="text-emerald-700 underline">{library?.address}</Text>
              </Space>
            </a>
            <Space size="small">
              <PhoneOutlined className="text-gray-400" />
              <Text className="text-gray-600">{library?.phone}</Text>
            </Space>
          </Space>
        )}
      </Card>

      <Row gutter={[16, 16]}>
        {statCards.map((card) => (
          <Col key={card.title} xs={24} sm={12} lg={6}>
            <Card>
              {loadingPage ? (
                <Skeleton active paragraph={false} title={{ width: '60%' }} />
              ) : (
                <Statistic
                  title={card.title}
                  value={card.value ?? 0}
                  prefix={card.icon}
                />
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {!loadingPage && stats && (
        <Row gutter={[16, 16]} className="!mt-4">
          <Col xs={24} lg={12}>
            <Card title="Распределение броней">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieDataNonZero}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => (value && value > 0 ? `${name}: ${value}` : '')}
                    labelLine={false}
                  >
                    {pieDataNonZero.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={RESERVATION_COLORS[entry.name as keyof typeof RESERVATION_COLORS]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Книжный фонд">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Количество">
                    {barData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}