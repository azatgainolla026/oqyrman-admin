'use client'

import { useState, useEffect } from 'react'
import {
  Avatar,
  Dropdown,
  Modal,
  Form,
  Input,
  Upload,
  Button,
  App,
  Typography,
} from 'antd'
import {
  EditOutlined,
  LockOutlined,
  LogoutOutlined,
  CameraOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { removeToken, getRefreshToken } from '@/lib/auth'

const { Text } = Typography

interface UserProfile {
  id: string
  name: string
  surname: string
  email: string
  phone: string
  role: string
  avatar_url?: string
  qr_code?: string
  created_at: string
}

export default function ProfileDropdown() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()

  const fetchProfile = async () => {
    try {
      const { data } = await api.get<UserProfile>('/users/me')
      setProfile(data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const initials = profile
    ? [profile.name, profile.surname]
        .map((s) => (s ?? '').trim().charAt(0).toUpperCase())
        .filter(Boolean)
        .join('')
    : ''

  const fullName = profile
    ? [profile.name, profile.surname].filter(Boolean).join(' ') || t('profile.user')
    : t('profile.user')

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

  const openProfileModal = () => {
    if (profile) {
      profileForm.setFieldsValue({
        name: profile.name,
        surname: profile.surname,
        email: profile.email,
        phone: profile.phone,
      })
    }
    setProfileModalOpen(true)
  }

  const handleProfileSubmit = async () => {
    const values = await profileForm.validateFields()
    setSubmitting(true)
    try {
      const { data } = await api.put<UserProfile>('/users/me', values)
      setProfile(data)
      message.success(t('profile.profileUpdated'))
      setProfileModalOpen(false)
    } catch {
      message.error(t('profile.profileUpdateFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const { data } = await api.post<UserProfile>('/users/me/avatar', formData)
      setProfile(data)
      message.success(t('profile.avatarUpdated'))
    } catch {
      message.error(t('profile.avatarUploadFailed'))
    }
  }

  const handlePasswordSubmit = async () => {
    const values = await passwordForm.validateFields()
    setSubmitting(true)
    try {
      await api.post('/users/me/change-password', {
        old_password: values.old_password,
        new_password: values.new_password,
      })
      message.success(t('profile.passwordChanged'))
      setPasswordModalOpen(false)
      passwordForm.resetFields()
    } catch {
      message.error(t('profile.passwordChangeFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'header',
      type: 'group',
      label: (
        <div className="flex items-center gap-3 py-1">
          <Avatar
            src={profile?.avatar_url || undefined}
            size={40}
            style={!profile?.avatar_url ? { backgroundColor: '#1E5945', fontSize: 16 } : undefined}
          >
            {!profile?.avatar_url && initials}
          </Avatar>
          <div className="flex flex-col min-w-0">
            <Text strong className="text-sm truncate">{fullName}</Text>
            <Text className="text-xs text-gray-400 truncate">{profile?.email}</Text>
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: t('profile.editProfile'),
      onClick: openProfileModal,
    },
    {
      key: 'password',
      icon: <LockOutlined />,
      label: t('profile.changePassword'),
      onClick: () => {
        passwordForm.resetFields()
        setPasswordModalOpen(true)
      },
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('profile.logout'),
      danger: true,
      onClick: handleLogout,
    },
  ]

  return (
    <>
      <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
        <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="flex flex-col items-end mr-1 hidden sm:flex">
            <Text className="text-sm font-medium text-gray-700 leading-tight">{fullName}</Text>
            <Text className="text-[11px] text-gray-400 leading-tight">{profile?.role}</Text>
          </div>
          <Avatar
            src={profile?.avatar_url || undefined}
            size={36}
            style={!profile?.avatar_url ? { backgroundColor: '#1E5945', fontSize: 14, fontWeight: 600 } : undefined}
          >
            {!profile?.avatar_url && initials}
          </Avatar>
        </div>
      </Dropdown>

      <Modal
        title={t('profile.editProfile')}
        open={profileModalOpen}
        onCancel={() => setProfileModalOpen(false)}
        onOk={handleProfileSubmit}
        confirmLoading={submitting}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
      >
        <div className="flex justify-center my-4">
          <Upload
            showUploadList={false}
            accept="image/png,image/jpeg"
            beforeUpload={(file) => {
              handleAvatarUpload(file)
              return false
            }}
          >
            <div className="relative group cursor-pointer">
              <Avatar
                src={profile?.avatar_url || undefined}
                size={80}
                style={!profile?.avatar_url ? { backgroundColor: '#1E5945', fontSize: 28, fontWeight: 600 } : undefined}
              >
                {!profile?.avatar_url && initials}
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <CameraOutlined className="text-white text-xl" />
              </div>
            </div>
          </Upload>
        </div>

        <Form form={profileForm} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="name" label={t('profile.name')} rules={[{ required: true, message: t('profile.enterName') }]}>
              <Input />
            </Form.Item>
            <Form.Item name="surname" label={t('profile.surname')} rules={[{ required: true, message: t('profile.enterSurname') }]}>
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="email" label={t('profile.email')} rules={[{ required: true, type: 'email', message: t('profile.enterEmail') }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label={t('profile.phone')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('profile.changePassword')}
        open={passwordModalOpen}
        onCancel={() => setPasswordModalOpen(false)}
        onOk={handlePasswordSubmit}
        confirmLoading={submitting}
        okText={t('profile.change')}
        cancelText={t('common.cancel')}
      >
        <Form form={passwordForm} layout="vertical" className="mt-4">
          <Form.Item
            name="old_password"
            label={t('profile.currentPassword')}
            rules={[{ required: true, message: t('profile.enterCurrentPassword') }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="new_password"
            label={t('profile.newPassword')}
            rules={[
              { required: true, message: t('profile.enterNewPassword') },
              { min: 6, message: t('profile.passwordMin') },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label={t('profile.confirmPassword')}
            dependencies={['new_password']}
            rules={[
              { required: true, message: t('profile.confirmPasswordPrompt') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error(t('profile.passwordsDontMatch')))
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
