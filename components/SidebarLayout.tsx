'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Layout, Menu, Button, Typography, Avatar, Tooltip, Drawer } from 'antd'
import {
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import type { ItemType } from 'antd/es/menu/interface'
import { removeToken, getRefreshToken } from '@/lib/auth'
import api from '@/lib/api'

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface SidebarLayoutProps {
  children: ReactNode
  menuItems: ItemType[]
  title: string
  collapsedIcon: ReactNode
}

export default function SidebarLayout({
  children,
  menuItems,
  title,
  collapsedIcon,
}: SidebarLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    api
      .get<{ full_name: string; role: string; avatar_url?: string }>('/users/me')
      .then(({ data }) => {
        setFullName(data.full_name || 'User')
        setRole(data.role || '')
      })
      .catch(() => setFullName('User'))
  }, [])

  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken })
      }
    } catch {
      // ignore
    }
    removeToken()
    window.location.href = '/login'
  }

  const handleMenuClick = (key: string) => {
    router.push(key)
    if (isMobile) setMobileOpen(false)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo + Toggle */}
      <div
        className="flex items-center justify-between px-4 border-b border-white/10 shrink-0"
        style={{ height: 64, minHeight: 64 }}
      >
        {(!collapsed || isMobile) && (
          <Text strong className="!text-white text-lg tracking-wide whitespace-nowrap">
            {title}
          </Text>
        )}
        {!isMobile && (
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="!text-gray-400 hover:!text-white"
            size="small"
          />
        )}
      </div>

      {/* Menu */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[pathname]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
        style={{
          background: 'transparent',
          borderRight: 'none',
          flex: 1,
          marginTop: 8,
          padding: '0 8px',
          overflow: 'auto',
        }}
      />

      {/* User profile at bottom */}
      {(!collapsed || isMobile) && (
        <div
          className="border-t border-white/10 flex items-center gap-3 cursor-default shrink-0"
          style={{ padding: '12px 16px' }}
        >
          <Avatar
            icon={<UserOutlined />}
            style={{ backgroundColor: '#6366f1', flexShrink: 0 }}
          />
          <div className="flex flex-col overflow-hidden min-w-0 flex-1">
            <Text className="!text-white text-sm font-medium truncate">
              {fullName}
            </Text>
            <Text className="!text-gray-400 text-xs truncate">
              {role}
            </Text>
          </div>
          <Tooltip title="Logout" placement="top">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              className="!text-gray-500 hover:!text-red-400"
              size="small"
            />
          </Tooltip>
        </div>
      )}
    </div>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          trigger={null}
          width={250}
          collapsedWidth={70}
          style={{
            background: 'linear-gradient(180deg, #1a1d2e 0%, #13152b 100%)',
            height: '100vh',
            position: 'sticky',
            top: 0,
            overflow: 'hidden',
            zIndex: 10,
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          size="default"
          styles={{
            body: { padding: 0, background: 'linear-gradient(180deg, #1a1d2e 0%, #13152b 100%)' },
            header: { display: 'none' },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Layout style={{ minWidth: 0 }}>
        <Header
          className="!bg-white flex items-center justify-between shadow-sm !h-16"
          style={{ padding: '0 16px', position: 'sticky', top: 0, zIndex: 9 }}
        >
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileOpen(true)}
              className="!text-gray-600"
            />
          )}
          <div className="flex-1" />
          <Text className="text-gray-700 text-sm">{fullName}</Text>
        </Header>

        <Content
          style={{ margin: isMobile ? 12 : 24, padding: isMobile ? 16 : 24 }}
          className="bg-white rounded-lg"
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
