
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Opportunity, Region, SaleSource, Priority, LeadType, Currency, OppStage, UserRole, Employee } from '../types';
import { REGIONS, SALE_SOURCES, PRIORITIES, COUNTRIES, LEAD_TYPES, CURRENCIES, STAGE_PROBABILITY, OPP_STAGES } from '../constants';
import { Plus, X, Target, Edit3, ChevronUp, ChevronDown, Download, Upload, FileSpreadsheet, CheckSquare, Square } from 'lucide-react';

interface Props {
  opportunities: Opportunity[];
  employees: Employee[];
  user: string;
  role: UserRole;
  onSubmit: (opp: Opportunity) => void;
  onBulkSubmit: (opps: Opportunity[]) => void;
}

const OpportunitiesPage: React.FC<Props> = ({ opportunities, employees, user, role, onSubmit, onBulkSubmit }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof Opportunity; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Partial<Record<keyof Opportunity, string>>>({});
  const [formData, setFormData] = useState<Partial<Opportunity>>({});
  const [newRemark, setNewRemark] = useState('');

  useEffect(() => {
    if (formData.stage) {
      const prob = STAGE_PROBABILITY[formData.stage as OppStage] ?? 0;
      const revenue = (formData.value || 0) * (prob / 100);
      if (formData.probability !== prob || formData.expectedRevenue !== revenue) {
        setFormData(prev => ({ ...prev, probability: prob, expectedRevenue: revenue }));
      }
    }
  }, [formData.stage, formData.value]);

  const handleSort = (key: keyof Opportunity) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key: keyof Opportunity, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const displayOpps = useMemo(() => {
    let result = [...opportunities];
    Object.keys(filters).forEach(key => {
      const val = filters[key as keyof Opportunity];
      if (val) result = result.filter(item => String(item[key as keyof Opportunity] || '').toLowerCase().includes(val.toLowerCase()));
    });
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        return sortConfig.direction === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
      });
    }
    return result;
  }, [opportunities, sortConfig, filters]);

  const handleAddNew = () => {
    setEditingOpp(null); 
    setFormData({ 
      id: `OPP-${Date.now()}`,
      owner: user, 
      salesOwner: user,
      stage: 'Qualification',
      region: 'North America',
      country: 'United States',
      type: 'RFP',
      source: 'Web Research',
      currency: 'USD',
      value: 0,
      probability: 10,
      expectedRevenue: 0,
      feasibilityStatus: 'Pending',
      presalesRecommendation: 'Proceed',
      expectedClosingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      remarksHistory: [],
      description: '',
      risks: ''
    }); 
    setNewRemark('');
    setShowModal(true);
  };

  const handleRowClick = (opp: Opportunity) => {
    setEditingOpp(opp);
    setFormData(opp);
    setNewRemark('');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mandatory: (keyof Opportunity)[] = ['name', 'accountName', 'region', 'country', 'type', 'source', 'expectedClosingDate', 'stage', 'salesOwner'];
    const missing = mandatory.filter(m => !formData[m]);
    if (missing.length > 0) {
      alert(`Mandatory fields: ${missing.join(', ')}`);
      return;
    }

    let updatedHistory = [...(formData.remarksHistory || [])];
    if (newRemark.trim()) {
      updatedHistory.push({ text: newRemark.trim(), timestamp: new Date().toLocaleString(), author: user });
    }

    onSubmit({ ...formData as Opportunity, remarksHistory: updatedHistory });
    setNewRemark('');
    setShowModal(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayOpps.length && displayOpps.length > 0) setSelectedIds([]);
    else setSelectedIds(displayOpps.map(o => o.id));
  };

  const toggleSelectRow = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'AccountName', 'SalesOwner', 'Region', 'Country', 'Stage', 'Value', 'ExpClosingDate', 'Type', 'Source'];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + `Enterprise Deal,Global Tech,${user},Europe,Germany,Proposal/Price Quote,250000,2024-12-31,RFI,Partner`;
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "opps_template.csv");
    link.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const imported: Opportunity[] = text.split('\n').slice(1).filter(l => l.trim()).map((line, idx) => {
        const [name, acct, owner, reg, ctry, stage, val, exp, type, src] = line.split(',');
        const prob = STAGE_PROBABILITY[stage as OppStage] || 10;
        const v = Number(val) || 0;
        return {
          id: `OPP-IMP-${Date.now()}-${idx}`,
          owner: user,
          name: name || '',
          accountName: acct || '',
          salesOwner: owner || user,
          region: (reg as Region) || 'North America',
          country: ctry || 'United States',
          stage: (stage as OppStage) || 'Qualification',
          value: v,
          expectedClosingDate: exp || '',
          type: (type as LeadType) || 'RFP',
          source: (src as SaleSource) || 'Web Research',
          nextStep: '',
          currency: 'USD',
          probability: prob,
          expectedRevenue: (v * prob) / 100,
          feasibilityStatus: 'Pending',
          presalesRecommendation: 'Proceed',
          remarksHistory: [],
          description: '',
          risks: '',
          contactName: '',
          contactNumber: '',
          campaignSource: '',
          technicalPoC: '',
          presalesPoC: '',
          partnerOrg: false
        };
      });
      onBulkSubmit(imported);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportSelected = () => {
    const selected = opportunities.filter(o => selectedIds.includes(o.id));
    if (selected.length === 0) return;
    const headers = ['ID', 'Name', 'Account', 'Region', 'Stage', 'Value', 'ExpDate'];
    const rows = selected.map(o => [o.id, o.name, o.accountName, o.region, o.stage, o.value, o.expectedClosingDate].join(','));
    const csv = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `opps_export_${Date.now()}.csv`);
    link.click();
  };

  const SortIcon = ({ col }: { col: keyof Opportunity }) => {
    if (sortConfig?.key !== col) return <ChevronUp size={12} className="text-gray-300 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-blue-600 ml-1" /> : <ChevronDown size={12} className="text-blue-600 ml-1" />;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10 sticky top-0">
        <div>
          <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Active Opportunities</h3>
          <p className="text-xs text-slate-400 font-medium">Pipeline Lifecycle</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
            <button onClick={downloadTemplate} title="Template" className="p-2 hover:bg-white rounded-md text-gray-500 transition-all"><FileSpreadsheet size={18} /></button>
            <button onClick={() => fileInputRef.current?.click()} title="Import" className="p-2 hover:bg-white rounded-md text-gray-500 transition-all"><Upload size={18} /></button>
            <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv" />
            <button onClick={exportSelected} disabled={selectedIds.length === 0} title="Export Selected" className={`p-2 hover:bg-white rounded-md transition-all ${selectedIds.length > 0 ? 'text-blue-600' : 'text-gray-300'}`}><Download size={18} /></button>
          </div>
          <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all active:scale-95">
            <Plus size={18} /><span className="font-bold text-xs uppercase">New Opportunity</span>
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-widest font-black sticky top-0 z-10 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 w-10">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600">
                  {selectedIds.length === displayOpps.length && displayOpps.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              {(['id', 'name', 'accountName', 'region', 'stage', 'value', 'expectedClosingDate'] as (keyof Opportunity)[]).map(col => (
                <th key={col} className="px-6 py-4 cursor-pointer hover:bg-gray-100 group whitespace-nowrap" onClick={() => handleSort(col)}>
                  <div className="flex items-center">{col === 'id' ? 'OpsID' : col.replace(/([A-Z])/g, ' $1')} <SortIcon col={col} /></div>
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-2"></th>
              <th className="px-6 py-2"><input type="text" placeholder="ID..." className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.id || ''} onChange={e => handleFilterChange('id', e.target.value)} /></th>
              <th className="px-6 py-2"><input type="text" placeholder="Name..." className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.name || ''} onChange={e => handleFilterChange('name', e.target.value)} /></th>
              <th className="px-6 py-2"><input type="text" placeholder="Account..." className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.accountName || ''} onChange={e => handleFilterChange('accountName', e.target.value)} /></th>
              <th className="px-6 py-2">
                <select className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none bg-white" value={filters.region || ''} onChange={e => handleFilterChange('region', e.target.value)}>
                  <option value="">All Regions</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </th>
              <th className="px-6 py-2">
                <select className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none bg-white" value={filters.stage || ''} onChange={e => handleFilterChange('stage', e.target.value)}>
                  <option value="">All Stages</option>
                  {OPP_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </th>
              <th className="px-6 py-2"><input type="number" placeholder="Value >" className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.value || ''} onChange={e => handleFilterChange('value', e.target.value)} /></th>
              <th className="px-6 py-2"><input type="date" className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] outline-none" value={filters.expectedClosingDate || ''} onChange={e => handleFilterChange('expectedClosingDate', e.target.value)} /></th>
            </tr>
          </thead>
          <tbody className="divide-y text-slate-700">
            {displayOpps.map(o => (
              <tr key={o.id} onClick={() => handleRowClick(o)} className={`hover:bg-blue-50/50 cursor-pointer transition-colors group ${selectedIds.includes(o.id) ? 'bg-indigo-50/30' : ''}`}>
                <td className="px-6 py-4" onClick={e => toggleSelectRow(e, o.id)}>
                  {selectedIds.includes(o.id) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-slate-300" />}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-gray-400">{o.id}</td>
                <td className="px-6 py-4 font-bold text-slate-800">{o.name}</td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">{o.accountName}</td>
                <td className="px-6 py-4 text-xs font-bold uppercase text-slate-500">{o.region}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${o.stage === 'Closed Won' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{o.stage}</span>
                </td>
                <td className="px-6 py-4 font-black text-slate-900">${o.value.toLocaleString()}</td>
                <td className="px-6 py-4 text-xs font-semibold">{o.expectedClosingDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingOpp ? 'Edit Opportunity' : 'New Opportunity'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-12 gap-x-6 gap-y-5 overflow-y-auto">
              <div className="col-span-12 grid grid-cols-4 gap-4 pb-4 border-b border-slate-50">
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">OpsID (Autofill)</label><input readOnly value={formData.id || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-500 text-xs font-bold font-mono" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Ops Owner</label><input readOnly value={formData.owner || user} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-500 text-xs font-bold" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Ops Name*</label><input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Account/Customer Name*</label><input required value={formData.accountName || ''} onChange={e => setFormData({...formData, accountName: e.target.value})} placeholder="Database Lookup" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" /></div>
              </div>
              <div className="col-span-12 grid grid-cols-3 gap-4 pb-4 border-b border-slate-50">
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Sales Owner*</label><select required value={formData.salesOwner || ''} onChange={e => setFormData({...formData, salesOwner: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white"><option value="">Select Owner</option>{employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}</select></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Contact Name</label><input value={formData.contactName || ''} onChange={e => setFormData({...formData, contactName: e.target.value})} placeholder="Contact DB Lookup" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Contact Number</label><input type="number" value={formData.contactNumber || ''} onChange={e => setFormData({...formData, contactNumber: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold" /></div>
              </div>
              <div className="col-span-12 grid grid-cols-4 gap-4 pb-4 border-b border-slate-50">
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Region*</label><select required value={formData.region || ''} onChange={e => setFormData({...formData, region: e.target.value as Region})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white">{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Country*</label><select required value={formData.country || ''} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white">{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Type*</label><select required value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value as LeadType})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white">{LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Lead Source*</label><select required value={formData.source || ''} onChange={e => setFormData({...formData, source: e.target.value as SaleSource})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white">{SALE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div className="col-span-12 grid grid-cols-4 gap-4 pb-4 border-b border-slate-50">
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Next Step</label><input value={formData.nextStep || ''} onChange={e => setFormData({...formData, nextStep: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Currency*</label><select required value={formData.currency || 'USD'} onChange={e => setFormData({...formData, currency: e.target.value as Currency})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white">{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Deal Value*</label><input type="number" required value={formData.value || 0} onChange={e => setFormData({...formData, value: Number(e.target.value)})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-blue-600 outline-none" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Exp Closing Date*</label><input type="date" required value={formData.expectedClosingDate || ''} onChange={e => setFormData({...formData, expectedClosingDate: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" /></div>
              </div>
              <div className="col-span-12 grid grid-cols-4 gap-4 pb-4 border-b border-slate-50">
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Pipeline Stage*</label><select required value={formData.stage || ''} onChange={e => setFormData({...formData, stage: e.target.value as OppStage})} className="w-full border-2 border-blue-50 rounded-xl px-4 py-2 text-xs font-black text-blue-700 bg-white">{OPP_STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Feasibility Status</label><select value={formData.feasibilityStatus || ''} onChange={e => setFormData({...formData, feasibilityStatus: e.target.value as any})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white"><option value="Pending">Pending</option><option value="Feasible">Feasible</option><option value="Not Feasible">Not Feasible</option></select></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Presales Rec.</label><select value={formData.presalesRecommendation || ''} onChange={e => setFormData({...formData, presalesRecommendation: e.target.value as any})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold bg-white"><option value="Proceed">Proceed</option><option value="Hold">Hold</option><option value="Drop">Drop</option></select></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Risks / Blockers</label><input value={formData.risks || ''} onChange={e => setFormData({...formData, risks: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs" /></div>
              </div>
              <div className="col-span-12 grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Description</label><textarea rows={2} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-50" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Attachments</label><div className="flex items-center gap-2 mt-1"><button type="button" className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-slate-50"><Upload size={14} /> Upload Files</button></div></div>
              </div>
              <div className="col-span-12 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Remarks (History)</label>
                <input value={newRemark} onChange={e => setNewRemark(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" placeholder="Add deal update..." />
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
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors">Discard</button>
                <button type="submit" className="px-12 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95">Save Deal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunitiesPage;
