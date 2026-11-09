'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  X, 
  Save, 
  UserPlus, 
  Upload, 
  ChevronLeft, 
  ChevronRight,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function ContactsPage() {
  const [user, setUser] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ createdCount: number, skippedCount: number } | null>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [newContact, setNewContact] = useState({ name: '', phoneNumber: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadContacts(parsedUser.id, 1, '');
    }
  }, []);

  useEffect(() => {
    if (user) {
      const delaySearch = setTimeout(() => {
        setCurrentPage(1);
        loadContacts(user.id, 1, searchTerm);
      }, 400);
      return () => clearTimeout(delaySearch);
    }
  }, [searchTerm]);

  const loadContacts = async (userId: number, page: number = 1, search: string = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts?userId=${userId}&page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        setPagination(data.pagination);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (user && newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
      loadContacts(user.id, newPage, searchTerm);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !user) return;

    setImporting(true);
    setError('');
    setSuccess('');
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('userId', user.id);

    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`Import complete: ${data.createdCount} added, ${data.skippedCount || 0} skipped.`);
        setImportResult({ createdCount: data.createdCount, skippedCount: data.skippedCount || 0 });
        loadContacts(user.id, 1, searchTerm);
      } else {
        setError(data.error || 'An error occurred during import.');
      }
    } catch (err) {
      setError('An unexpected error occurred during import.');
    } finally {
      setImporting(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const url = selectedContact ? `/api/contacts/${selectedContact.id}` : '/api/contacts';
    const method = selectedContact ? 'PUT' : 'POST';
    const body = selectedContact 
      ? JSON.stringify({ name: selectedContact.name, phoneNumber: selectedContact.phoneNumber, userId: user.id })
      : JSON.stringify({ ...newContact, userId: user.id });

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(selectedContact ? 'Contact updated successfully!' : 'Contact saved successfully!');
        loadContacts(user.id, currentPage, searchTerm);
        closeModal();
      } else {
        setError(data.error || 'Failed to save contact.');
      }
    } catch (err) {
      setError('An unexpected network error occurred.');
    }
  };

  const handleDelete = async () => {
    if (!selectedContact) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (res.ok) {
        setSuccess('Contact deleted successfully!');
        loadContacts(user.id, currentPage, searchTerm);
        closeDeleteModal();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete contact.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    }
  };

  const openImportModal = () => {
    setIsImportModalOpen(true);
    setImportFile(null);
    setImportResult(null);
    setError('');
    setSuccess('');
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
  };

  const openModal = (contact: any = null) => {
    setSelectedContact(contact);
    if (!contact) {
      setNewContact({ name: '', phoneNumber: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedContact(null);
    setError('');
    setSuccess('');
  };

  const openDeleteModal = (contact: any) => {
    setSelectedContact(contact);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedContact(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Audience Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Manage Contacts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Build and organize your customer contact lists for broadcast campaigns and direct chats.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openImportModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import Excel / CSV</span>
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="flex items-start justify-between gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-0.5 text-rose-400 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start justify-between gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="p-0.5 text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search contacts by name or phone number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-xl pl-11 pr-10 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Contacts Table & Responsive Cards */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Desktop / Tablet Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800/40 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Contact</th>
                <th className="py-3.5 px-6">Phone Number</th>
                <th className="py-3.5 px-6">Last Active</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Loading directory...</span>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-white font-medium text-sm">No contacts found</p>
                    <p className="text-xs text-slate-500 mt-1">Add a new contact or upload an Excel spreadsheet</p>
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-800/30 transition group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition flex-shrink-0">
                          {(contact.name || contact.phoneNumber).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-white group-hover:text-emerald-300 transition">
                          {contact.name || 'Unnamed Contact'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-300 text-xs">
                      +{contact.phoneNumber}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400">
                      {contact.lastMessageAt ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(contact.lastMessageAt).toLocaleDateString()}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">Never</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openModal(contact)}
                          className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                          title="Edit Contact"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(contact)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="sm:hidden divide-y divide-slate-800">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
              <span>Loading...</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-white text-sm font-semibold">No contacts found</p>
            </div>
          ) : (
            contacts.map((contact) => (
              <div key={contact.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-emerald-400 flex-shrink-0">
                    {(contact.name || contact.phoneNumber).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{contact.name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-400 font-mono">+{contact.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openModal(contact)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(contact)}
                    className="p-2 text-rose-400 hover:text-rose-300 rounded-lg bg-slate-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Bar */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-800 bg-slate-900/40 text-xs">
            <div className="text-slate-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} contacts
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    currentPage === page
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: Create / Edit Contact ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <span>{selectedContact ? 'Edit Contact' : 'Create Contact'}</span>
              </h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={selectedContact ? selectedContact.name : newContact.name}
                  onChange={(e) => selectedContact 
                    ? setSelectedContact({ ...selectedContact, name: e.target.value }) 
                    : setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Phone Number (with Country Code)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 919876543210 (no + or spaces)"
                  value={selectedContact ? selectedContact.phoneNumber : newContact.phoneNumber}
                  onChange={(e) => selectedContact 
                    ? setSelectedContact({ ...selectedContact, phoneNumber: e.target.value }) 
                    : setNewContact({ ...newContact, phoneNumber: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {error && <p className="text-rose-400 text-xs">{error}</p>}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{selectedContact ? 'Update Contact' : 'Save Contact'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Import Excel / CSV ================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>Import Contacts via Excel</span>
              </h3>
              <button onClick={closeImportModal} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImport} className="p-6">
              {!importResult ? (
                <div className="space-y-4">
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Upload an <strong>.xlsx</strong> or <strong>.csv</strong> file. The file should contain column headers for <strong>Name</strong> and <strong>Phone Number</strong>.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Spreadsheet File
                    </label>
                    <input
                      type="file"
                      required
                      accept=".xlsx, .csv"
                      onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 file:cursor-pointer"
                    />
                  </div>
                  {error && <p className="text-rose-400 text-xs">{error}</p>}
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeImportModal}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!importFile || importing}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 disabled:opacity-50 transition cursor-pointer"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <span>Upload & Import</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Import Complete</h4>
                    <p className="text-xs text-emerald-400 mt-1 font-medium">{importResult.createdCount} new contacts registered</p>
                    <p className="text-xs text-slate-500 mt-0.5">{importResult.skippedCount} duplicate numbers skipped</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeImportModal}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl text-xs transition"
                  >
                    Done
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Delete Confirmation ================= */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Contact?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <strong>{selectedContact?.name || selectedContact?.phoneNumber}</strong>?
              </p>
            </div>
            {error && <p className="text-rose-400 text-xs">{error}</p>}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
