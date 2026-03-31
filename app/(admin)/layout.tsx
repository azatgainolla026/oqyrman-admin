'use client'

import {
  DashboardOutlined,
  UserOutlined,
  BankOutlined,
  BookOutlined,
  CalendarOutlined,
  ScheduleOutlined,
} from '@ant-design/icons'
import SidebarLayout from '@/components/SidebarLayout'

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/admin/users', icon: <UserOutlined />, label: 'Users' },
  { key: '/admin/libraries', icon: <BankOutlined />, label: 'Libraries' },
  { key: '/admin/books', icon: <BookOutlined />, label: 'Books' },
  { key: '/admin/reservations', icon: <CalendarOutlined />, label: 'Reservations' },
  { key: '/admin/events', icon: <ScheduleOutlined />, label: 'Events' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout
      menuItems={menuItems}
      title="Oqyrman Admin"
      collapsedIcon={<BookOutlined className="text-white text-xl" />}
    >
      {children}
    </SidebarLayout>
  )
}
