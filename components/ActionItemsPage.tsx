
import React, { useState, useRef, useMemo } from 'react';
import { ActionItem, Region, ActionStatus, Priority, Lead, Opportunity, UserRole, Employee } from '../types';
import { REGIONS, PRIORITIES, ACTION_STATUSES } from '../constants';
import { Plus, X, Edit3, ChevronUp, ChevronDown, ClipboardList, ShieldAlert, CheckSquare, Square, Calendar, User, List, Tag } from 'lucide-react';

interface Props {
  items: ActionItem[];
  employees: Employee[];
  user: string;
  role: UserRole;
  leads: Lead[];
  opportunities: Opportunity[];
  onSubmit: (action: ActionItem) => void;
  onBulkSubmit: (actions: ActionItem[]) => void;
}

const ActionItemsPage: React.FC<Props> = ({ items, employees, user, role, leads, opportunities, onSubmit }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ActionItem; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Partial<Record<keyof ActionItem, string>>>({});
  const [formData, setFormData] = useState<Partial<ActionItem>>({});

  const handleSort = (key: keyof ActionItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key: keyof ActionItem, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const displayItems = useMemo(() => {
    let result = items.filter(item => {
      if (role === 'Super Admin' || role === 'Admin/Founder') return true;
      if (role === 'Delivery Manager') return item.assignee === 'Delivery Managers' || item.assignee === user || item.owner === user;
      if (role.includes('Presales')) return item.assignee.includes('Presales') || item.owner === user || item.assignee === user;
      return true;
    });
    Object.keys(filters).forEach(key => {
      const val = filters[key as keyof ActionItem];
      if (val) result = result.filter(item => String(item[key as keyof ActionItem] || '').toLowerCase().includes(val.toLowerCase()));
    });
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        return sortConfig.direction === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
      });
    }
    return result;
  }, [items, role, user, sortConfig, filters]);

  // Dynamic filtering for Leads/Opportunities based on Region
  const filteredDatabaseOptions = useMemo(() => {
    if (!formData.region || !formData.actionType) return [];
    if (formData.actionType === 'Lead') {
      return leads.filter(l => l.region === formData.region);
    }
    if (formData.actionType === 'Opportunity') {
      return opportunities.filter(o => o.region === formData.region);
    }
    return [];
  }, [formData.actionType, formData.region, leads, opportunities]);

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({
      owner: user, // Action Item Owner: Logged In User
      status: undefined, 
      priority: undefined, 
      region: undefined, 
      actionType: undefined, 
      assignee: undefined, 
      subject: '', 
      dueDate: '', 
      linkedRecordId: '',
      description: '',
      remarks: ''
    });
    setShowModal(true);
  };

  const handleRowClick = (item: ActionItem) => {
    setEditingItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mandatory: (keyof ActionItem)[] = ['assignee', 'subject', 'dueDate', 'actionType', 'linkedRecordId', 'region', 'priority', 'status'];
    const missing = mandatory.filter(m => !formData[m]);

    if (missing.length > 0) {
      alert(`Please fill in all mandatory fields: ${missing.join(', ')}`);
      return;
    }
    onSubmit({ ...formData as ActionItem, id: editingItem ? editingItem.id : `ACT-${Date.now()}` });
    setShowModal(false);
  };

  const SortIcon = ({ column }: { column: keyof ActionItem }) => {
    if (sortConfig?.key !== column) return <ChevronUp size={12} className="text-gray-300 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-blue-600 ml-1" /> : <ChevronDown size={12} className="text-blue-600 ml-1" />;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Action Portfolio</h3>
          <p className="text-xs text-gray-400 font-medium">Task tracking and notifications</p>
        </div>
        <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-all active:scale-95">
          <Plus size={18} /><span className="font-bold text-xs uppercase">New Action</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-widest font-black">
            <tr>
              <th className="px-6 py-4 w-10"></th>
              {(['id', 'subject', 'assignee', 'dueDate', 'priority', 'status'] as (keyof ActionItem)[]).map(col => (
                <th key={col} className="px-6 py-4 cursor-pointer hover:bg-gray-100 group transition-colors whitespace-nowrap" onClick={() => handleSort(col)}>
                  <div className="flex items-center">{col.replace(/([A-Z])/g, ' $1')} <SortIcon column={col} /></div>
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-2"></th>
              <th className="px-6 py-2"><input type="text" placeholder="ID..." className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] font-medium outline-none focus:ring-1 focus:ring-blue-400" value={filters.id || ''} onChange={(e) => handleFilterChange('id', e.target.value)} /></th>
              <th className="px-6 py-2"><input type="text" placeholder="Subject..." className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] font-medium outline-none focus:ring-1 focus:ring-blue-400" value={filters.subject || ''} onChange={(e) => handleFilterChange('subject', e.target.value)} /></th>
              <th className="px-6 py-2"><input type="text" placeholder="Assignee..." className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] font-medium outline-none focus:ring-1 focus:ring-blue-400" value={filters.assignee || ''} onChange={(e) => handleFilterChange('assignee', e.target.value)} /></th>
              <th className="px-6 py-2"><input type="date" className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] font-medium outline-none focus:ring-1 focus:ring-blue-400" value={filters.dueDate || ''} onChange={(e) => handleFilterChange('dueDate', e.target.value)} /></th>
              <th className="px-6 py-2">
                <select className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] font-medium bg-white outline-none focus:ring-1 focus:ring-blue-400" value={filters.priority || ''} onChange={(e) => handleFilterChange('priority', e.target.value)}>
                  <option value="">All</option>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </th>
              <th className="px-6 py-2">
                <select className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] font-medium bg-white outline-none focus:ring-1 focus:ring-blue-400" value={filters.status || ''} onChange={(e) => handleFilterChange('status', e.target.value)}>
                  <option value="">All</option>
                  {ACTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700">
            {displayItems.map(item => (
              <tr key={item.id} onClick={() => handleRowClick(item)} className="hover:bg-blue-50/50 cursor-pointer transition-colors group">
                <td className="px-6 py-4"><ClipboardList size={16} className="text-slate-300 group-hover:text-blue-500" /></td>
                <td className="px-6 py-4 font-mono text-xs text-gray-400">{item.id}</td>
                <td className="px-6 py-4 font-bold text-slate-800">{item.subject}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">{item.assignee}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-500">{item.dueDate}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {item.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.status === 'Completed' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><ClipboardList size={20} /></div>
                <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">{editingItem ? 'Edit Action Item' : 'New Action Item'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-8 grid grid-cols-2 gap-x-6 gap-y-5 overflow-y-auto">
              
              {/* Ownership */}
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Action Item Owner</label>
                <input readOnly value={formData.owner || user} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Action Item Assignee*</label>
                <select required value={formData.assignee || ''} onChange={e => setFormData({...formData, assignee: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-100 transition-all">
                  <option value="">Select Assignee</option>
                  <option value="Delivery Managers">Delivery Managers (Group)</option>
                  <option value="Presales Team">Presales Team (Group)</option>
                  {employees.filter(e => e.status === 'Active').map(e => <option key={e.id} value={e.name}>{e.name} ({e.role})</option>)}
                </select>
              </div>

              {/* Region First for Filtering */}
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Region*</label>
                <select required value={formData.region || ''} onChange={e => setFormData({...formData, region: e.target.value as Region, linkedRecordId: ''})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white outline-none">
                  <option value="">Select Region</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Task Details */}
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Subject*</label>
                <input required value={formData.subject || ''} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Enter task subject..." />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Due Date*</label>
                <input type="date" required value={formData.dueDate || ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100" />
              </div>

              {/* Database Links */}
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Action Type*</label>
                <select required value={formData.actionType || ''} onChange={e => setFormData({...formData, actionType: e.target.value as any, linkedRecordId: ''})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white outline-none">
                  <option value="">Select Type</option>
                  <option value="Lead">Lead</option>
                  <option value="Opportunity">Opportunity</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Linked {formData.actionType || 'Database'}* (Filtered by Region)</label>
                <select 
                  required 
                  disabled={!formData.region || !formData.actionType}
                  value={formData.linkedRecordId || ''} 
                  onChange={e => setFormData({...formData, linkedRecordId: e.target.value})} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white outline-none disabled:bg-slate-50 disabled:text-slate-300"
                >
                  <option value="">Select {formData.actionType || 'Record'}</option>
                  {filteredDatabaseOptions.map((opt: any) => (
                    <option key={opt.id} value={opt.id}>{opt.id} - {opt.name}</option>
                  ))}
                  {formData.region && formData.actionType && filteredDatabaseOptions.length === 0 && (
                    <option value="" disabled>No results found for {formData.region}</option>
                  )}
                </select>
              </div>

              {/* Status & Priority */}
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Priority*</label>
                <select required value={formData.priority || ''} onChange={e => setFormData({...formData, priority: e.target.value as Priority})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-white outline-none">
                  <option value="">Select Priority</option>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Status*</label>
                <select required value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value as ActionStatus})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-blue-700 bg-white outline-none">
                  <option value="">Select Status</option>
                  {ACTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Description Fields */}
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Description</label>
                <textarea rows={2} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-50" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Remarks</label>
                <textarea rows={2} value={formData.remarks || ''} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-50" />
              </div>

              <div className="col-span-2 flex justify-end gap-4 mt-6 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors">Cancel</button>
                <button type="submit" className="px-12 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95">
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionItemsPage;
