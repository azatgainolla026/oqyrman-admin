'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Button,
  Tag,
  Typography,
  message,
  Popconfirm,
  Select,
  Space,
  Modal,
  Form,
  Input,
} from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '@/lib/api'
import type {
  UserViewResponse,
  AdminUpdateUserRequest,
  CreateStaffRequest,
  PaginatedResponse,
  Library,
} from '@/lib/types'

const { Title } = Typography
const { Search } = Input

export default function UsersPage() {
  const [users, setUsers] = useState<UserViewResponse[]>([])
  const [libraries, setLibraries] = useState<Library[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined)

  // Edit user modal
  const [editModalUser, setEditModalUser] = useState<UserViewResponse | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editForm] = Form.useForm()

  // Create staff modal
  const [createStaffOpen, setCreateStaffOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createForm] = Form.useForm()

  const pageSize = 20

  const fetchUsers = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const params: Record<string, unknown> = {
          limit: pageSize,
          offset: (p - 1) * pageSize,
        }

        const { data } = await api.get<PaginatedResponse<UserViewResponse>>(
          '/admin/users',
          { params },
        )
        const dataObj = data as { items?: UserViewResponse[] }
        const items: UserViewResponse[] = Array.isArray(dataObj.items) ? dataObj.items : []
        const query = search.trim().toLowerCase()
        const filteredByQuery = query
          ? items.filter((u) => {
              const fullName = `${u.name ?? ''} ${u.surname ?? ''}`.toLowerCase()
              return (
                fullName.includes(query) ||
                String(u.email ?? '').toLowerCase().includes(query)
              )
            })
          : items
        const filtered = roleFilter ? filteredByQuery.filter((u) => u.role === roleFilter) : filteredByQuery

        setUsers(filtered)
        setTotal(filtered.length)
      } catch {
        message.error('Failed to load users')
      } finally {
        setLoading(false)
      }
    },
    [search, roleFilter],
  )

  useEffect(() => {
    fetchUsers(page)
  }, [page, fetchUsers])

  useEffect(() => {
    api
      .get<PaginatedResponse<Library>>('/libraries', { params: { limit: 100 } })
      .then(({ data }) => setLibraries(data.items))
  }, [])

  // --- Search / filter handlers ---
  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleRoleFilter = (value: string | undefined) => {
    setRoleFilter(value || undefined)
    setPage(1)
  }

  // --- Edit user ---
  const openEditModal = (user: UserViewResponse) => {
    setEditModalUser(user)
    editForm.setFieldsValue({
      role: user.role,
      library_id: user.library_id ?? undefined,
      email: user.email,
      name: user.name,
      surname: user.surname,
      phone: user.phone,
    })
  }

  const handleEditSubmit = async () => {
    const values = await editForm.validateFields()
    if (!editModalUser) return
    setEditSubmitting(true)
    try {
      const payload: AdminUpdateUserRequest = {
        role: values.role,
        email: values.email,
        name: values.name,
        surname: values.surname,
        phone: values.phone,
      }
      if (values.role === 'Staff') {
        payload.library_id = values.library_id
      }
      await api.patch(`/admin/users/${editModalUser.id}`, payload)
      message.success('User updated')
      setEditModalUser(null)
      fetchUsers(page)
    } catch {
      message.error('Failed to update user')
    } finally {
      setEditSubmitting(false)
    }
  }

  // --- Create staff ---
  const handleCreateStaff = async () => {
    const values = await createForm.validateFields()
    setCreateSubmitting(true)
    try {
      const payload: CreateStaffRequest = {
        email: values.email,
        password: values.password,
        library_id: values.library_id,
        name: values.name,
        surname: values.surname,
        phone: values.phone,
      }
      await api.post('/admin/users/staff', payload)
      message.success('Staff member created')
      setCreateStaffOpen(false)
      createForm.resetFields()
      fetchUsers(page)
    } catch {
      message.error('Failed to create staff member')
    } finally {
      setCreateSubmitting(false)
    }
  }

  // --- Delete ---
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/users/${id}`)
      message.success('User deleted')
      fetchUsers(page)
    } catch {
      message.error('Failed to delete user')
    }
  }

  const ROLE_COLOR: Record<string, string> = {
    Admin: 'red',
    Staff: 'blue',
    User: 'default',
  }

  const editSelectedRole = Form.useWatch('role', editForm)

  const columns: ColumnsType<UserViewResponse> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 90, ellipsis: true },
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => `${record.name} ${record.surname}`,
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Library',
      dataIndex: 'library_name',
      key: 'library_name',
      render: (val: string | undefined) => val ?? '—',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={ROLE_COLOR[role] ?? 'default'}>{role}</Tag>
      ),
    },
    {
      title: 'Registered',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Edit User
          </Button>
          {record.role !== 'Admin' && (
            <Popconfirm
              title="Delete this user?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Title level={4} className="!mb-0">
          Users
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateStaffOpen(true)}
        >
          Create Staff
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Search
          placeholder="Search by name or email"
          allowClear
          onSearch={handleSearch}
          className="sm:max-w-xs"
        />
        <Select
          placeholder="Filter by role"
          allowClear
          onChange={handleRoleFilter}
          className="sm:w-40"
          options={[
            { value: 'Admin', label: 'Admin' },
            { value: 'Staff', label: 'Staff' },
            { value: 'User', label: 'User' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          total,
          pageSize,
          onChange: setPage,
          showSizeChanger: false,
        }}
      />

      {/* Edit User Modal */}
      <Modal
        title="Edit User"
        open={!!editModalUser}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalUser(null)}
        confirmLoading={editSubmitting}
      >
        <Form form={editForm} layout="vertical" className="mt-4">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="surname" label="Surname" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'User', label: 'User' },
                { value: 'Staff', label: 'Staff' },
                { value: 'Admin', label: 'Admin' },
              ]}
            />
          </Form.Item>
          {editSelectedRole === 'Staff' && (
            <Form.Item
              name="library_id"
              label="Library"
              rules={[{ required: true, message: 'Library is required for Staff' }]}
            >
              <Select
                placeholder="Select library"
                options={libraries.map((l) => ({ value: l.id, label: l.name }))}
                showSearch
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Create Staff Modal */}
      <Modal
        title="Create Staff Member"
        open={createStaffOpen}
        onOk={handleCreateStaff}
        onCancel={() => {
          setCreateStaffOpen(false)
          createForm.resetFields()
        }}
        confirmLoading={createSubmitting}
      >
        <Form form={createForm} layout="vertical" className="mt-4">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="surname" label="Surname" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="library_id"
            label="Library"
            rules={[{ required: true, message: 'Please select a library' }]}
          >
            <Select
              placeholder="Select library"
              options={libraries.map((l) => ({ value: l.id, label: l.name }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
