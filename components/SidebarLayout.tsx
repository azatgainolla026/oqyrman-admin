'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Layout, Menu, Button, Typography, Drawer } from 'antd'
import { MenuOutlined } from '@ant-design/icons'
import type { ItemType } from 'antd/es/menu/interface'
import ProfileDropdown from '@/components/ProfileDropdown'

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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleMenuClick = (key: string) => {
    router.push(key)
    if (isMobile) setMobileOpen(false)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full py-4">
      {/* Logo area */}
      <div
        className={`flex items-center gap-3 px-5 mb-6 shrink-0 ${!isMobile ? 'cursor-pointer' : ''}`}
        onClick={() => { if (!isMobile) setCollapsed(!collapsed) }}
      >
        <img
          src="https://api.oqyrman.app/minio/oqyrman/static/logo_circle.svg"
          alt="Oqyrman"
          width={34}
          height={34}
          className="shrink-0"
        />
        {(!collapsed || isMobile) && (
          <Text strong className="!text-white text-[15px] tracking-wide whitespace-nowrap">
            {title}
          </Text>
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
          padding: '0 12px',
          overflow: 'auto',
        }}
      />
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
            background: '#0f2820',
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
            body: { padding: 0, background: '#0f2820' },
            header: { display: 'none' },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Layout style={{ minWidth: 0 }}>
        <Header
          className="!bg-white flex items-center justify-between shadow-sm !h-16"
          style={{ padding: '0 20px', position: 'sticky', top: 0, zIndex: 9 }}
        >
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileOpen(true)}
                className="!text-gray-600"
              />
            )}
          </div>
          <ProfileDropdown />
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
