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
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import type { AdminStats } from '@/lib/types'

const { Title } = Typography

const PIE_COLORS = ['#1E5945', '#f59e0b', '#4fd1a5']

export default function DashboardPage() {
  const { t } = useTranslation()
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
      title: t('dashboard.usersTotal'),
      value: stats?.users_total,
      icon: <UserOutlined className="text-blue-500 text-2xl" />,
    },
    {
      title: t('dashboard.booksTotal'),
      value: stats?.books_total,
      icon: <BookOutlined className="text-purple-500 text-2xl" />,
    },
    {
      title: t('dashboard.authorsTotal'),
      value: stats?.authors_total,
      icon: <EditOutlined className="text-teal-500 text-2xl" />,
    },
    {
      title: t('dashboard.reservationsTotal'),
      value: stats?.reservations_total,
      icon: <CalendarOutlined className="text-orange-500 text-2xl" />,
    },
    {
      title: t('dashboard.activeReservations'),
      value: stats?.reservations_active,
      icon: <CheckCircleOutlined className="text-emerald-500 text-2xl" />,
    },
    {
      title: t('dashboard.pendingReservations'),
      value: stats?.reservations_pending,
      icon: <ClockCircleOutlined className="text-amber-500 text-2xl" />,
    },
    {
      title: t('dashboard.reviewsTotal'),
      value: stats?.reviews_total,
      icon: <StarOutlined className="text-yellow-500 text-2xl" />,
    },
  ]

  const completedReservations =
    (stats?.reservations_total ?? 0) -
    (stats?.reservations_active ?? 0) -
    (stats?.reservations_pending ?? 0)

  const pieData = [
    { name: t('dashboard.statusActive'), value: stats?.reservations_active ?? 0 },
    { name: t('dashboard.statusPending'), value: stats?.reservations_pending ?? 0 },
    { name: t('dashboard.statusCompleted'), value: completedReservations },
  ]
  const pieDataNonZero = pieData.filter((item) => item.value > 0)

  const usersLabel = t('dashboard.chartUsers')
  const booksLabel = t('dashboard.chartBooks')
  const authorsLabel = t('dashboard.chartAuthors')
  const reviewsLabel = t('dashboard.chartReviews')

  const BAR_COLORS: Record<string, string> = {
    [usersLabel]: '#1E5945',
    [booksLabel]: '#2a7a5e',
    [authorsLabel]: '#14b8a6',
    [reviewsLabel]: '#f59e0b',
  }

  const barData = [
    { name: usersLabel, value: stats?.users_total ?? 0 },
    { name: booksLabel, value: stats?.books_total ?? 0 },
    { name: authorsLabel, value: stats?.authors_total ?? 0 },
    { name: reviewsLabel, value: stats?.reviews_total ?? 0 },
  ]

  return (
    <div>
      <Title level={4} className="!mb-6">
        {t('dashboard.title')}
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
            <Card title={t('dashboard.reservationDistribution')}>
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
            <Card title={t('dashboard.overallStats')}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name={t('dashboard.chartCount')} radius={[4, 4, 0, 0]}>
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
