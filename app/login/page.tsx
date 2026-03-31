'use client'

import { useState } from 'react'
import { Button, Card, Form, Input, Typography, Alert } from 'antd'
import axios from 'axios'
import { setTokens, getRole, removeToken } from '@/lib/auth'

const { Title } = Typography

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.oqyrman.app/api/v1'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      // Use raw axios — not the api instance which has 401 interceptor
      const { data } = await axios.post(`${API_URL}/auth/login`, values)
      setTokens(data.access_token, data.refresh_token)

      await new Promise((r) => setTimeout(r, 100))

      const role = getRole()
      if (role === 'admin') {
        window.location.href = '/dashboard'
      } else if (role === 'library' || role === 'staff') {
        window.location.href = '/staff/dashboard'
      } else {
        // Regular users cannot access admin panel
        removeToken()
        setLoading(false)
        setError('Доступ запрещён. Только для администраторов и сотрудников.')
        return
      }
    } catch (err: unknown) {
      setLoading(false)
      if (axios.isAxiosError(err) && err.response) {
        const msg =
          err.response.data?.error ||
          err.response.data?.message ||
          (err.response.status === 401
            ? 'Неверный email или пароль'
            : `Ошибка сервера (${err.response.status})`)
        setError(msg)
      } else {
        setError('Не удалось подключиться к серверу')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm shadow-md">
        <div className="mb-6 text-center">
          <Title level={3} className="!mb-1">
            Oqyrman Admin
          </Title>
          <p className="text-gray-500 text-sm">Войдите в свой аккаунт</p>
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
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input placeholder="admin@example.com" size="large" />
          </Form.Item>

          <Form.Item
            label="Пароль"
            name="password"
            rules={[{ required: true, message: 'Введите пароль' }]}
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
              Войти
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
