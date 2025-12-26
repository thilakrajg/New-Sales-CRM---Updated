
import React, { useState, useRef, useMemo } from 'react';
import { Lead, Region, SaleSource, Priority, LeadType, Currency, LeadStatus, UserRole, Employee, RemarkEntry } from '../types';
import { REGIONS, SALE_SOURCES, PRIORITIES, COUNTRIES, LEAD_TYPES, CURRENCIES, LEAD_STATUSES } from '../constants';
import { Plus, X, Download, Upload, FileSpreadsheet, CheckSquare, Square, ChevronUp, ChevronDown, Globe } from 'lucide-react';

interface Props {
  leads: Lead[];
  employees: Employee[];
  user: string;
  role: UserRole;
  onSubmit: (lead: Lead) => void;
  onBulkSubmit: (leads: Lead[]) => void;
}

const LeadsPage: React.FC<Props> = ({ leads, employees, user, role, onSubmit, onBulkSubmit }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newRemark, setNewRemark] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof Lead; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Partial<Record<keyof Lead, string>>>({});
  const [formData, setFormData] = useState<Partial<Lead>>({});

  const handleSort = (key: keyof Lead) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key: keyof Lead, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const displayLeads = useMemo(() => {
    let result = [...leads];
    Object.keys(filters).forEach(key => {
      const val = filters[key as keyof Lead];
      if (val) result = result.filter(item => String(item[key as keyof Lead] || '').toLowerCase().includes(val.toLowerCase()));
    });
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        return sortConfig.direction === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
      });
    }
    return result;
  }, [leads, sortConfig, filters]);

  const handleAddNew = () => {
    setEditingLead(null);
    setFormData({ 
      id: `LD-${leads.length + 1001}`, 
      owner: user,
      assignee: undefined,
      region: undefined, 
      status: 'Not Contacted', 
      type: 'RFP', 
      source: 'Advertisement',
      priority: 'Medium',
      country: 'United States',
      currency: 'USD',
      startDate: new Date().toISOString().split('T')[0],
      closingDate: '',
      value: 0,
      remarksHistory: [],
      notes: ''
    });
    setNewRemark('');
    setShowModal(true);
  };

  const handleRowClick = (lead: Lead) => {
    setEditingLead(lead);
    setFormData(lead);
    setNewRemark('');
    setShowModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedHistory = [...(formData.remarksHistory || [])];
    if (newRemark.trim()) {
      updatedHistory.push({ text: newRemark.trim(), timestamp: new Date().toLocaleString(), author: user });
    }
    onSubmit({ ...formData as Lead, remarksHistory: updatedHistory, nextStep: formData.nextStep || '' });
    setNewRemark('');
    setShowModal(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayLeads.length && displayLeads.length > 0) setSelectedIds([]);
    else setSelectedIds(displayLeads.map(l => l.id));
  };

  const toggleSelectRow = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const downloadTemplate = () => {
    const headers = ['LeadName', 'CompanyName', 'ContactName', 'ContactNumber', 'Region', 'Country', 'Type', 'Priority', 'Source', 'Status', 'Assignee', 'StartDate', 'Value'];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + `Cloud Migration,Acme Corp,Jane Doe,98765432,North America,United States,RFP,High,Partner,Qualified,${user},2024-06-01,100000`;
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "leads_template.csv");
    link.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const imported: Lead[] = text.split('\n').slice(1).filter(l => l.trim()).map((line, idx) => {
        const [name, co, contact, phone, reg, ctry, type, prio, src, stat, asgn, start, val] = line.split(',');
        return {
          id: `LD-IMP-${Date.now()}-${idx}`,
          owner: user,
          name: name || '',
          companyName: co || '',
          contactName: contact || '',
          contactNumber: phone || '',
          region: (reg as Region) || 'North America',
          country: ctry || 'United States',
          type: (type as LeadType) || 'RFP',
          priority: (prio as Priority) || 'Medium',
          source: (src as SaleSource) || 'Web Research',
          status: (stat as LeadStatus) || 'Not Contacted',
          assignee: asgn || user,
          startDate: start || new Date().toISOString().split('T')[0],
          closingDate: '',
          value: Number(val) || 0,
          expectedRevenue: 0,
          notes: '',
          remarksHistory: [],
          currency: 'USD',
          techFeasibility: 'Pending',
          implementationFeasibility: 'Pending',
          salesFeasibility: 'Pending',
          nextStep: ''
        };
      });
      onBulkSubmit(imported);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportSelected = () => {
    const selected = leads.filter(l => selectedIds.includes(l.id));
    if (selected.length === 0) return;
    const headers = ['ID', 'Name', 'Company', 'Region', 'Status', 'Value', 'StartDate'];
    const rows = selected.map(l => [l.id, l.name, l.companyName, l.region, l.status, l.value, l.startDate].join(','));
    const csv = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `leads_export_${Date.now()}.csv`);
    link.click();
  };

  const SortIcon = ({ col }: { col: keyof Lead }) => {
    if (sortConfig?.key !== col) return <ChevronUp size={12} className="text-gray-300 ml-1 opacity-0 group-hover:opacity-100" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-blue-600 ml-1" /> : <ChevronDown size={12} className="text-blue-600 ml-1" />;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
        <div>
          <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Leads Portfolio</h3>
          <p className="text-xs text-gray-400 font-medium">Qualify new opportunities</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
            <button onClick={downloadTemplate} title="Template" className="p-2 hover:bg-white rounded-md text-gray-500 transition-all"><FileSpreadsheet size={18} /></button>
            <button onClick={() => fileInputRef.current?.click()} title="Import" className="p-2 hover:bg-white rounded-md text-gray-500 transition-all"><Upload size={18} /></button>
            <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv" />
            <button onClick={exportSelected} disabled={selectedIds.length === 0} title="Export Selected" className={`p-2 hover:bg-white rounded-md transition-all ${selectedIds.length > 0 ? 'text-blue-600' : 'text-gray-300'}`}><Download size={18} /></button>
          </div>
          <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-all active:scale-95">
            <Plus size={18} /><span className="font-bold text-xs uppercase">New Lead</span>
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-widest font-black sticky top-0 z-10 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 w-10">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600">
                  {selectedIds.length === displayLeads.length && displayLeads.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              {(['id', 'name', 'companyName', 'region', 'type', 'status', 'startDate'] as (keyof Lead)[]).map(col => (
                <th key={col} className="px-6 py-4 cursor-pointer hover:bg-gray-100 group whitespace-nowrap" onClick={() => handleSort(col)}>
                  <div className="flex items-center">{col === 'id' ? 'ID' : col.replace(/([A-Z])/g, ' $1')} <SortIcon col={col} /></div>
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-2"></th>
              <th className="px-6 py-2"><input type="text" placeholder="Filter ID..." className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.id || ''} onChange={e => handleFilterChange('id', e.target.value)} /></th>
              <th className="px-6 py-2"><input type="text" placeholder="Name..." className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.name || ''} onChange={e => handleFilterChange('name', e.target.value)} /></th>
              <th className="px-6 py-2"><input type="text" placeholder="Company..." className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.companyName || ''} onChange={e => handleFilterChange('companyName', e.target.value)} /></th>
              <th className="px-6 py-2">
                <select className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none bg-white" value={filters.region || ''} onChange={e => handleFilterChange('region', e.target.value)}>
                  <option value="">All Regions</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </th>
              <th className="px-6 py-2">
                <select className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none bg-white" value={filters.type || ''} onChange={e => handleFilterChange('type', e.target.value)}>
                  <option value="">All Types</option>
                  {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </th>
              <th className="px-6 py-2">
                <select className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none bg-white" value={filters.status || ''} onChange={e => handleFilterChange('status', e.target.value)}>
                  <option value="">All Statuses</option>
                  {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </th>
              <th className="px-6 py-2"><input type="date" className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.startDate || ''} onChange={e => handleFilterChange('startDate', e.target.value)} /></th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700">
            {displayLeads.map(l => (
              <tr key={l.id} onClick={() => handleRowClick(l)} className={`hover:bg-blue-50/50 cursor-pointer transition-colors group ${selectedIds.includes(l.id) ? 'bg-indigo-50/30' : ''}`}>
                <td className="px-6 py-4" onClick={e => toggleSelectRow(e, l.id)}>
                  {selectedIds.includes(l.id) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-slate-300" />}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-gray-400">{l.id}</td>
                <td className="px-6 py-4 font-bold text-slate-800">{l.name}</td>
                <td className="px-6 py-4 text-xs">{l.companyName}</td>
                <td className="px-6 py-4 text-xs font-bold uppercase text-slate-500">{l.region}</td>
                <td className="px-6 py-4 text-xs">{l.type}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${l.status === 'Qualified' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{l.status}</span>
                </td>
                <td className="px-6 py-4 text-xs font-semibold">{l.startDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[95vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Globe size={20} /></div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingLead ? 'Edit Lead' : 'Create New Lead'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-8 grid grid-cols-12 gap-x-6 gap-y-5 overflow-y-auto">
               <div className="col-span-12 grid grid-cols-4 gap-4 pb-4 border-b border-slate-50">
                 <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Lead ID (Auto)</label><input readOnly value={formData.id || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-500 text-xs font-bold font-mono" /></div>
                 <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Lead Owner</label><input readOnly value={formData.owner || user} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-500 text-xs font-bold" /></div>
                 <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Assignee*</label><select required value={formData.assignee || ''} onChange={e => setFormData({...formData, assignee: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white"><option value="">Select Assignee</option>{employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}</select></div>
                 <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Lead Name*</label><input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" /></div>
               </div>
               <div className="col-span-12 grid grid-cols-3 gap-4 pb-4 border-b border-slate-50">
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Company/Customer*</label><input required value={formData.companyName || ''} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="Contact DB Lookup" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold" /></div>
                  <div className="col-span-2"><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Notes/Description</label><input value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs" /></div>
               </div>
               <div className="col-span-12 grid grid-cols-3 gap-4 pb-4 border-b border-slate-50">
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Contact Name*</label><input required value={formData.contactName || ''} onChange={e => setFormData({...formData, contactName: e.target.value})} placeholder="Contact DB Lookup" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Contact Number*</label><input type="number" required value={formData.contactNumber || ''} onChange={e => setFormData({...formData, contactNumber: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Next Step</label><input value={formData.nextStep || ''} onChange={e => setFormData({...formData, nextStep: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs" /></div>
               </div>
               <div className="col-span-12 grid grid-cols-4 gap-4 pb-4 border-b border-slate-50">
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Region*</label><select required value={formData.region || ''} onChange={e => setFormData({...formData, region: e.target.value as Region})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white">{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Country*</label><select required value={formData.country || ''} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white">{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Type*</label><select required value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value as LeadType})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white">{LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Priority*</label><select required value={formData.priority || ''} onChange={e => setFormData({...formData, priority: e.target.value as Priority})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white">{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
               </div>
               <div className="col-span-12 grid grid-cols-4 gap-4 pb-4 border-b border-slate-50">
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Lead Source*</label><select required value={formData.source || ''} onChange={e => setFormData({...formData, source: e.target.value as SaleSource})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white">{SALE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Lead Status*</label><select required value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value as LeadStatus})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-blue-600 bg-white">{LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Start Date</label><input type="date" value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Deal Value</label><input type="number" value={formData.value || 0} onChange={e => setFormData({...formData, value: Number(e.target.value)})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-blue-600" /></div>
               </div>
               <div className="col-span-12 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Remarks (History)</label>
                <input value={newRemark} onChange={e => setNewRemark(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" placeholder="Add status details..." />
                {formData.remarksHistory && formData.remarksHistory.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-32 overflow-y-auto pr-2">
                    {[...formData.remarksHistory].reverse().map((r, i) => (
                      <div key={i} className="bg-white p-2 rounded-lg border border-slate-100 flex justify-between items-center shadow-sm">
                        <p className="text-[11px] font-medium text-slate-600">{r.text}</p>
                        <div className="text-right"><p className="text-[8px] font-black uppercase text-blue-500">{r.author}</p><p className="text-[8px] text-slate-300">{r.timestamp}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-12 flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors">Abort</button>
                <button type="submit" className="px-12 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 transition-all active:scale-95">Save Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
