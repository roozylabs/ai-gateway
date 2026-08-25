'use client';

import React, { useState } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, Select, message, Breadcrumb } from 'antd';
import { UserOutlined, UserAddOutlined, ArrowLeftOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'developer' | 'billing_manager' | 'auditor';
  joinedAt: string;
}

const initialMembers: Member[] = [
  { id: '1', name: 'Roozy (CEO)', email: 'ceo@roozylabs.com', role: 'owner', joinedAt: '2026-01-15' },
  { id: '2', name: 'Dev Lead', email: 'dev@roozylabs.com', role: 'admin', joinedAt: '2026-02-01' },
  { id: '3', name: 'Agent Service Account', email: 'opencode-cli@roozylabs.com', role: 'developer', joinedAt: '2026-03-10' },
  { id: '4', name: 'Finance Controller', email: 'finance@roozylabs.com', role: 'billing_manager', joinedAt: '2026-04-05' },
];

export default function OrganizationMembersPage() {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleInvite = (values: any) => {
    const newMember: Member = {
      id: String(Date.now()),
      name: values.email.split('@')[0],
      email: values.email,
      role: values.role,
      joinedAt: new Date().toISOString().split('T')[0],
    };
    setMembers([...members, newMember]);
    setIsModalOpen(false);
    form.resetFields();
    message.success(`Invitation sent to ${values.email}`);
  };

  const handleDelete = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
    message.success('Member removed');
  };

  const getRoleTag = (role: string) => {
    switch (role) {
      case 'owner': return <Tag color="purple">OWNER</Tag>;
      case 'admin': return <Tag color="blue">ADMIN</Tag>;
      case 'developer': return <Tag color="green">DEVELOPER</Tag>;
      case 'billing_manager': return <Tag color="gold">BILLING</Tag>;
      case 'auditor': return <Tag color="cyan">AUDITOR</Tag>;
      default: return <Tag>MEMBER</Tag>;
    }
  };

  const columns = [
    {
      title: 'Member',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Member) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300 text-xs">
            {text.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-white text-sm">{text}</div>
            <div className="text-xs text-slate-400 font-mono">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'RBAC Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => getRoleTag(role),
    },
    {
      title: 'Joined Date',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (date: string) => <span className="font-mono text-xs text-slate-400">{date}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Member) => (
        record.role !== 'owner' ? (
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)} 
          />
        ) : null
      ),
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb 
            items={[
              { title: <Link href="/settings" className="text-slate-400 hover:text-white"><ArrowLeftOutlined className="mr-1" /> Settings</Link> },
              { title: <span className="text-purple-400 font-semibold">Team Members & RBAC</span> },
            ]}
          />
          <h1 className="text-2xl font-bold text-white mt-2 flex items-center gap-2">
            <UserOutlined className="text-purple-500" /> Team Members & Organization RBAC
          </h1>
          <p className="text-xs text-slate-400">Invite team members and manage access control permissions across your Organization.</p>
        </div>
        <Button 
          type="primary" 
          icon={<UserAddOutlined />} 
          className="bg-purple-600 hover:bg-purple-500 font-semibold"
          onClick={() => setIsModalOpen(true)}
        >
          Invite Team Member
        </Button>
      </div>

      <Card className="bg-[#0c0d0f] border-[#222222] text-slate-200 shadow-xl">
        <Table 
          dataSource={members} 
          columns={columns} 
          rowKey="id" 
          pagination={false} 
          className="bg-transparent"
        />
      </Card>

      {/* Invite Member Modal */}
      <Modal
        title={<span className="text-white font-bold">Invite Team Member</span>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        className="dark-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleInvite} className="mt-4">
          <Form.Item name="email" label={<span className="text-slate-300">Email Address</span>} rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="colleague@company.com" className="bg-[#121315] border-[#222222] text-white" />
          </Form.Item>
          <Form.Item name="role" label={<span className="text-slate-300">Organization RBAC Role</span>} rules={[{ required: true }]}>
            <Select 
              placeholder="Select role"
              options={[
                { value: 'admin', label: 'Admin (Full Config Access)' },
                { value: 'developer', label: 'Developer (API Keys & Agents)' },
                { value: 'billing_manager', label: 'Billing Manager (FinOps & Invoices)' },
                { value: 'auditor', label: 'Auditor (Read-Only Audit Trail)' },
              ]}
            />
          </Form.Item>
          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" className="bg-purple-600 hover:bg-purple-500">Send Invitation</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
