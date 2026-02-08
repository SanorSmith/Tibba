'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronRight, Users, Building2 } from 'lucide-react';
import { EmployeeAvatar } from '@/components/modules/hr/shared/employee-avatar';
import departmentsData from '@/data/hr/departments.json';
import employeesData from '@/data/hr/employees.json';

interface OrgNode {
  id: string;
  name: string;
  title: string;
  department: string;
  children: OrgNode[];
}

export default function OrgChartPage() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['EMP-2024-001']));
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree');

  const employees = employeesData.employees;

  const buildTree = (managerId: string | null): OrgNode[] => {
    return employees
      .filter(e => e.reporting_to === managerId && e.employment_status === 'ACTIVE')
      .map(e => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
        title: e.job_title,
        department: e.department_name,
        children: buildTree(e.id),
      }));
  };

  const ceo = employees.find(e => !e.reporting_to && e.employment_status === 'ACTIVE');
  const orgTree: OrgNode[] = ceo
    ? [{
        id: ceo.id,
        name: `${ceo.first_name} ${ceo.last_name}`,
        title: ceo.job_title,
        department: ceo.department_name,
        children: buildTree(ceo.id),
      }]
    : buildTree(null);

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collect = (nodes: OrgNode[]) => {
      nodes.forEach(n => { allIds.add(n.id); collect(n.children); });
    };
    collect(orgTree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => setExpandedNodes(new Set());

  const renderTreeNode = (node: OrgNode, depth: number) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} style={{ marginLeft: depth > 0 ? '24px' : '0' }}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-[#f5f5f5] transition-colors cursor-pointer"
          style={{ borderLeft: depth > 0 ? '2px solid #e4e4e4' : 'none' }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} style={{ color: '#a3a3a3', flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: '#a3a3a3', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '14px', flexShrink: 0 }} />
          )}
          <EmployeeAvatar name={node.name} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/hr/employees/${node.id}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{node.name}</span>
              </Link>
              {hasChildren && (
                <span style={{ fontSize: '10px', color: '#a3a3a3' }}>({node.children.length})</span>
              )}
            </div>
            <p style={{ fontSize: '11px', color: '#525252' }}>{node.title}</p>
          </div>
          <span style={{ fontSize: '10px', color: '#a3a3a3', flexShrink: 0 }}>{node.department}</span>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const countAll = (nodes: OrgNode[]): number => {
    return nodes.reduce((s, n) => s + 1 + countAll(n.children), 0);
  };

  const deptGroups = departmentsData.departments.reduce((acc, dept) => {
    const type = dept.type || 'OTHER';
    if (!acc[type]) acc[type] = [];
    acc[type].push(dept);
    return acc;
  }, {} as Record<string, typeof departmentsData.departments>);

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/organization"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Organization Chart</h2>
            <p className="page-description">{countAll(orgTree)} employees in hierarchy</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode(viewMode === 'tree' ? 'grid' : 'tree')} className="btn-secondary" style={{ fontSize: '12px' }}>
            {viewMode === 'tree' ? 'Department View' : 'Tree View'}
          </button>
        </div>
      </div>

      {viewMode === 'tree' ? (
        <>
          <div className="flex gap-2 tibbna-section">
            <button className="btn-secondary" style={{ fontSize: '12px' }} onClick={expandAll}>Expand All</button>
            <button className="btn-secondary" style={{ fontSize: '12px' }} onClick={collapseAll}>Collapse All</button>
          </div>

          <div className="tibbna-card">
            <div className="tibbna-card-content" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {orgTree.map(node => renderTreeNode(node, 0))}
              {orgTree.length === 0 && (
                <p style={{ textAlign: 'center', color: '#a3a3a3', padding: '32px' }}>
                  No reporting hierarchy found. Employees may not have reporting_to set.
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {Object.entries(deptGroups).map(([type, depts]) => (
            <div key={type}>
              <h3 className="tibbna-section-title">{type} Departments ({depts.length})</h3>
              <div className="tibbna-grid-3">
                {depts.map(dept => {
                  const deptEmployees = employees.filter(e => e.department_id === dept.id && e.employment_status === 'ACTIVE');
                  const head = employees.find(e => e.id === (dept as any).head_id);
                  return (
                    <div key={dept.id} className="tibbna-card">
                      <div className="tibbna-card-content">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 size={16} style={{ color: '#618FF5' }} />
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{dept.name}</span>
                        </div>
                        {(dept as any).name_arabic && (
                          <p dir="rtl" style={{ fontSize: '12px', color: '#a3a3a3', marginBottom: '8px' }}>{(dept as any).name_arabic}</p>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <Users size={14} style={{ color: '#525252' }} />
                          <span style={{ fontSize: '13px', color: '#525252' }}>{deptEmployees.length} employees</span>
                        </div>
                        {head && (
                          <div className="flex items-center gap-2" style={{ padding: '6px', backgroundColor: '#f9fafb' }}>
                            <EmployeeAvatar name={`${head.first_name} ${head.last_name}`} size="sm" />
                            <div>
                              <p style={{ fontSize: '12px', fontWeight: 500 }}>{head.first_name} {head.last_name}</p>
                              <p style={{ fontSize: '10px', color: '#a3a3a3' }}>Department Head</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
