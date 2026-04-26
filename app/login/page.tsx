'use client'

import { useState } from 'react'
import { Button, Card, Form, Input, Typography, Alert } from 'antd'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { setTokens, getRole, removeToken } from '@/lib/auth'

const { Title } = Typography

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.oqyrman.app/api/v1'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, values)
      setTokens(data.access_token, data.refresh_token)

      await new Promise((r) => setTimeout(r, 100))

      const role = getRole()
      if (role === 'admin') {
        window.location.href = '/dashboard'
      } else if (role === 'library' || role === 'staff') {
        window.location.href = '/staff/dashboard'
      } else {
        removeToken()
        setLoading(false)
        setError(t('login.accessDenied'))
        return
      }
    } catch (err: unknown) {
      setLoading(false)
      if (axios.isAxiosError(err) && err.response) {
        const msg =
          err.response.data?.error ||
          err.response.data?.message ||
          (err.response.status === 401
            ? t('login.invalidCredentials')
            : t('login.serverError', { status: err.response.status }))
        setError(msg)
      } else {
        setError(t('login.connectError'))
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm shadow-md">
        <div className="mb-6 text-center flex flex-col items-center">
          <img
            src="https://api.oqyrman.app/minio/oqyrman/static/logo_circle.svg"
            alt="Oqyrman"
            width={64}
            height={64}
            className="mb-3"
          />
          <Title level={3} className="!mb-1">
            {t('login.title')}
          </Title>
          <p className="text-gray-500 text-sm">{t('login.subtitle')}</p>
        </div>

        {error && (
          <Alert
            title={error}
            type="error"
            showIcon
            className="mb-4"
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          autoComplete="off"
        >
          <Form.Item
            label={t('login.email')}
            name="email"
            rules={[
              { required: true, message: t('login.enterEmail') },
              { type: 'email', message: t('login.invalidEmail') },
            ]}
          >
            <Input placeholder="admin@example.com" size="large" />
          </Form.Item>

          <Form.Item
            label={t('login.password')}
            name="password"
            rules={[{ required: true, message: t('login.enterPassword') }]}
          >
            <Input.Password placeholder="••••••••" size="large" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              {t('login.submit')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
