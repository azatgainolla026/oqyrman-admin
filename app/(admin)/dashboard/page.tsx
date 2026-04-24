'use client'

import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Typography, Skeleton } from 'antd'
import {
  UserOutlined,
  BookOutlined,
  EditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
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
import type { AdminStats } from '@/lib/types'

const { Title } = Typography

const PIE_COLORS = ['#1E5945', '#f59e0b', '#4fd1a5']
const BAR_COLORS: Record<string, string> = {
  Пользователи: '#1E5945',
  Книги: '#2a7a5e',
  Авторы: '#14b8a6',
  Отзывы: '#f59e0b',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<AdminStats>('/admin/stats')
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    {
      title: 'Пользователей',
      value: stats?.users_total,
      icon: <UserOutlined className="text-blue-500 text-2xl" />,
    },
    {
      title: 'Книг',
      value: stats?.books_total,
      icon: <BookOutlined className="text-purple-500 text-2xl" />,
    },
    {
      title: 'Авторов',
      value: stats?.authors_total,
      icon: <EditOutlined className="text-teal-500 text-2xl" />,
    },
    {
      title: 'Броней всего',
      value: stats?.reservations_total,
      icon: <CalendarOutlined className="text-orange-500 text-2xl" />,
    },
    {
      title: 'Активных броней',
      value: stats?.reservations_active,
      icon: <CheckCircleOutlined className="text-emerald-500 text-2xl" />,
    },
    {
      title: 'Ожидающих броней',
      value: stats?.reservations_pending,
      icon: <ClockCircleOutlined className="text-amber-500 text-2xl" />,
    },
    {
      title: 'Отзывов',
      value: stats?.reviews_total,
      icon: <StarOutlined className="text-yellow-500 text-2xl" />,
    },
  ]

  const completedReservations =
    (stats?.reservations_total ?? 0) -
    (stats?.reservations_active ?? 0) -
    (stats?.reservations_pending ?? 0)

  const pieData = [
    { name: 'Активные', value: stats?.reservations_active ?? 0 },
    { name: 'Ожидают', value: stats?.reservations_pending ?? 0 },
    { name: 'Завершённые', value: completedReservations },
  ]
  const pieDataNonZero = pieData.filter((item) => item.value > 0)

  const barData = [
    { name: 'Пользователи', value: stats?.users_total ?? 0 },
    { name: 'Книги', value: stats?.books_total ?? 0 },
    { name: 'Авторы', value: stats?.authors_total ?? 0 },
    { name: 'Отзывы', value: stats?.reviews_total ?? 0 },
  ]

  return (
    <div>
      <Title level={4} className="!mb-6">
        Главная
      </Title>

      <Row gutter={[16, 16]}>
        {cards.map((card) => (
          <Col key={card.title} xs={24} sm={12} lg={6}>
            <Card>
              {loading ? (
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

      {!loading && stats && (
        <Row gutter={[16, 16]} className="mt-4">
          <Col xs={24} lg={12}>
            <Card title="Распределение броней">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieDataNonZero}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent, value }) =>
                      value && value > 0 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {pieDataNonZero.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
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
            <Card title="Общая статистика">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Количество" radius={[4, 4, 0, 0]}>
                    {barData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={BAR_COLORS[entry.name]}
                      />
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
