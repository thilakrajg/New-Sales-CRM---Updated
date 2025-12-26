
import React, { useState, useRef, useMemo } from 'react';
import { Sale, Region, SaleSource, SaleStatus, Priority, UserRole, Employee } from '../types';
import { REGIONS, SALE_SOURCES, STATUSES, PRIORITIES, COUNTRIES } from '../constants';
import { Plus, X, Download, Upload, FileSpreadsheet, CheckSquare, Square, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  sales: Sale[];
  employees: Employee[];
  user: string;
  role: UserRole;
  onSubmit: (sale: Sale) => void;
  onBulkSubmit: (sales: Sale[]) => void;
}

const SalesPage: React.FC<Props> = ({ sales, employees, user, role, onSubmit, onBulkSubmit }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof Sale; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Partial<Record<keyof Sale, string>>>({});
  const [formData, setFormData] = useState<Partial<Sale>>({});

  const handleSort = (key: keyof Sale) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key: keyof Sale, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const displaySales = useMemo(() => {
    let result = [...sales];
    Object.keys(filters).forEach(key => {
      const val = filters[key as keyof Sale];
      if (val) result = result.filter(item => String(item[key as keyof Sale] || '').toLowerCase().includes(val.toLowerCase()));
    });
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        return sortConfig.direction === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
      });
    }
    return result;
  }, [sales, sortConfig, filters]);

  const handleAddNew = () => {
    setEditingSale(null);
    setFormData({
      owner: user,
      date: new Date().toISOString().split('T')[0],
      clientName: '',
      contactName: '',
      contactNumber: '',
      region: 'North America',
      country: 'United States',
      priority: 'Medium',
      source: 'Cold Call',
      status: 'Not Contacted',
      assignee: user,
      remarks: ''
    });
    setShowModal(true);
  };

  const handleRowClick = (sale: Sale) => {
    setEditingSale(sale);
    setFormData(sale);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData as Sale, id: editingSale ? editingSale.id : `SALE-${Date.now()}` });
    setShowModal(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displaySales.length && displaySales.length > 0) setSelectedIds([]);
    else setSelectedIds(displaySales.map(s => s.id));
  };

  const toggleSelectRow = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const downloadTemplate = () => {
    const headers = ['SaleDate', 'ClientName', 'ContactName', 'ContactNumber', 'Region', 'Country', 'Priority', 'Source', 'Status', 'Assignee', 'Remarks'];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + `2024-05-20,Acme Corp,John Doe,12345678,North America,United States,High,Web Research,Contacted,${user},Initial call done`;
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "sales_template.csv");
    link.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n');
      const imported: Sale[] = lines.slice(1).filter(l => l.trim()).map((line, idx) => {
        const [date, client, contact, phone, reg, ctry, prio, src, stat, asgn, rem] = line.split(',');
        return {
          id: `SALE-IMP-${Date.now()}-${idx}`,
          owner: user,
          date: date || new Date().toISOString().split('T')[0],
          clientName: client || '',
          contactName: contact || '',
          contactNumber: phone || '',
          region: (reg as Region) || 'North America',
          country: ctry || 'United States',
          priority: (prio as Priority) || 'Medium',
          source: (src as SaleSource) || 'Cold Call',
          status: (stat as SaleStatus) || 'Not Contacted',
          assignee: asgn || user,
          remarks: rem || '',
          nextStep: ''
        };
      });
      onBulkSubmit(imported);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportSelected = () => {
    const selected = sales.filter(s => selectedIds.includes(s.id));
    if (selected.length === 0) return;
    const headers = ['ID', 'Date', 'ClientName', 'ContactName', 'Region', 'Status', 'Assignee'];
    const rows = selected.map(s => [s.id, s.date, s.clientName, s.contactName, s.region, s.status, s.assignee].join(','));
    const csv = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `sales_export_${Date.now()}.csv`);
    link.click();
  };

  const SortIcon = ({ col }: { col: keyof Sale }) => {
    if (sortConfig?.key !== col) return <ChevronUp size={12} className="text-gray-300 ml-1 opacity-0 group-hover:opacity-100" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-blue-600 ml-1" /> : <ChevronDown size={12} className="text-blue-600 ml-1" />;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
        <div>
          <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Sales Activity</h3>
          <p className="text-xs text-gray-400 font-medium">Capture primary reach-outs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
            <button onClick={downloadTemplate} title="Template" className="p-2 hover:bg-white rounded-md text-gray-500 transition-all"><FileSpreadsheet size={18} /></button>
            <button onClick={() => fileInputRef.current?.click()} title="Import" className="p-2 hover:bg-white rounded-md text-gray-500 transition-all"><Upload size={18} /></button>
            <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv" />
            <button onClick={exportSelected} disabled={selectedIds.length === 0} title="Export Selected" className={`p-2 hover:bg-white rounded-md transition-all ${selectedIds.length > 0 ? 'text-blue-600' : 'text-gray-300'}`}><Download size={18} /></button>
          </div>
          <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg transition-all active:scale-95">
            <Plus size={18} /><span className="font-bold text-xs uppercase">New Activity</span>
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-widest font-black sticky top-0 z-10 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 w-10">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600">
                  {selectedIds.length === displaySales.length && displaySales.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              {(['id', 'date', 'assignee', 'clientName', 'region', 'status'] as (keyof Sale)[]).map(col => (
                <th key={col} className="px-6 py-4 cursor-pointer hover:bg-gray-100 group whitespace-nowrap" onClick={() => handleSort(col)}>
                  <div className="flex items-center">{col === 'id' ? 'ID' : col.replace(/([A-Z])/g, ' $1')} <SortIcon col={col} /></div>
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-2"></th>
              <th className="px-6 py-2"><input type="text" placeholder="Filter ID..." className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.id || ''} onChange={e => handleFilterChange('id', e.target.value)} /></th>
              <th className="px-6 py-2"><input type="date" className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.date || ''} onChange={e => handleFilterChange('date', e.target.value)} /></th>
              <th className="px-6 py-2"><input type="text" placeholder="Assignee..." className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.assignee || ''} onChange={e => handleFilterChange('assignee', e.target.value)} /></th>
              <th className="px-6 py-2"><input type="text" placeholder="Client..." className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.clientName || ''} onChange={e => handleFilterChange('clientName', e.target.value)} /></th>
              <th className="px-6 py-2">
                <select className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none bg-white" value={filters.region || ''} onChange={e => handleFilterChange('region', e.target.value)}>
                  <option value="">All Regions</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </th>
              <th className="px-6 py-2">
                <select className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none bg-white" value={filters.status || ''} onChange={e => handleFilterChange('status', e.target.value)}>
                  <option value="">All Statuses</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700">
            {displaySales.map(s => (
              <tr key={s.id} onClick={() => handleRowClick(s)} className={`hover:bg-blue-50/50 cursor-pointer transition-colors group ${selectedIds.includes(s.id) ? 'bg-indigo-50/30' : ''}`}>
                <td className="px-6 py-4" onClick={e => toggleSelectRow(e, s.id)}>
                  {selectedIds.includes(s.id) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-slate-300" />}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-gray-400">{s.id}</td>
                <td className="px-6 py-4 text-xs font-semibold">{s.date}</td>
                <td className="px-6 py-4 text-xs">{s.assignee}</td>
                <td className="px-6 py-4 font-bold text-slate-800">{s.clientName}</td>
                <td className="px-6 py-4 text-xs font-bold uppercase text-slate-500">{s.region}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${s.status === 'Qualified' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{s.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingSale ? 'Edit Activity' : 'New Activity'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-x-6 gap-y-5">
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Sale Owner</label>
                <input readOnly value={formData.owner || user} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-500 text-xs font-bold" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Assignee*</label>
                <select required value={formData.assignee || ''} onChange={e => setFormData({...formData, assignee: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white">
                  <option value="">Select Assignee</option>
                  {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Client Name*</label>
                <input required value={formData.clientName || ''} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Sale Date*</label>
                <input type="date" required value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Contact Name*</label>
                <input required value={formData.contactName || ''} onChange={e => setFormData({...formData, contactName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Contact Number*</label>
                <input required value={formData.contactNumber || ''} onChange={e => setFormData({...formData, contactNumber: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs" />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Region*</label>
                <select required value={formData.region || ''} onChange={e => setFormData({...formData, region: e.target.value as Region})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white">
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Status*</label>
                <select required value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value as SaleStatus})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-blue-600 bg-blue-50/50">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Remarks</label>
                <textarea rows={2} value={formData.remarks || ''} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase">Discard</button>
                <button type="submit" className="px-10 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-xl">{editingSale ? 'Save' : 'Initialize'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
