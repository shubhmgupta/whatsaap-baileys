'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash, Search, X, Save, UserPlus, Upload, ChevronLeft, ChevronRight } from 'lucide-react';

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
      }, 500);
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
        setSuccess(`Import successful! ${data.createdCount} new contacts added.`);
        setImportResult({ createdCount: data.createdCount, skippedCount: data.skippedCount });
        loadContacts(user.id, 1, searchTerm);
        // Do not close modal, show results instead
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
        setSuccess(selectedContact ? 'Contact updated successfully!' : 'Contact created successfully!');
        loadContacts(user.id, currentPage, searchTerm);
        closeModal();
      } else {
        setError(data.error || 'An error occurred.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
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
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            Manage Contacts
          </h1>
          <p className="text-gray-400">View, create, edit, and delete your contacts</p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <button
            onClick={openImportModal}
            className="bg-gray-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-600 transition-all flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Import
          </button>
          <button
            onClick={() => openModal()}
            className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-blue-700 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Create Contact
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts by name or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="p-4 text-sm font-semibold text-gray-300">Name</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Phone Number</th>
                <th className="p-4 text-sm font-semibold text-gray-300">Last Contacted</th>
                <th className="p-4 text-sm font-semibold text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    Loading contacts...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No contacts found</p>
                      <p className="text-gray-500 text-sm mt-1">Create a new contact or adjust your search</p>
                    </div>
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                    <td className="p-4 text-white font-medium">{contact.name}</td>
                    <td className="p-4 text-gray-400">+{contact.phoneNumber}</td>
                    <td className="p-4 text-gray-400">
                      {contact.lastMessageAt ? new Date(contact.lastMessageAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => openModal(contact)} className="text-blue-400 hover:text-blue-300 p-2 rounded-md hover:bg-blue-500/10">
                        <Edit className="w-5 h-5" />
                      </button>
                      <button onClick={() => openDeleteModal(contact)} className="text-red-400 hover:text-red-300 p-2 rounded-md hover:bg-red-500/10">
                        <Trash className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-700/50">
            <div className="text-sm text-gray-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} contacts
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="p-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                {selectedContact ? 'Edit Contact' : 'Create Contact'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={selectedContact ? selectedContact.name : newContact.name}
                  onChange={(e) => selectedContact 
                    ? setSelectedContact({ ...selectedContact, name: e.target.value }) 
                    : setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 919876543210"
                  value={selectedContact ? selectedContact.phoneNumber : newContact.phoneNumber}
                  onChange={(e) => selectedContact 
                    ? setSelectedContact({ ...selectedContact, phoneNumber: e.target.value }) 
                    : setNewContact({ ...newContact, phoneNumber: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg">
                  Cancel
                </button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  {selectedContact ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Import Contacts from Excel</h2>
              <button onClick={closeImportModal} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleImport} className="p-6">
              {!importResult ? (
                <>
                  <p className="text-gray-400 mb-4 text-sm">
                    Upload an .xlsx or .csv file with "Name" and "Phone Number" columns.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Excel File</label>
                    <input
                      type="file"
                      required
                      accept=".xlsx, .csv"
                      onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                  </div>
                  {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
                  <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={closeImportModal} className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg">
                      Cancel
                    </button>
                    <button type="submit" disabled={!importFile || importing} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">
                      {importing ? 'Importing...' : 'Import'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-white mb-2">Import Complete</h3>
                    <p className="text-green-400 mb-1">{importResult.createdCount} contacts were successfully added.</p>
                    <p className="text-yellow-400 mb-6">{importResult.skippedCount} contacts were skipped (duplicates).</p>
                    <button onClick={closeImportModal} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                      Done
                    </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="p-6 text-center">
              <Trash className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Delete Contact?</h2>
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete "{selectedContact?.name}"? This action cannot be undone.
              </p>
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <div className="flex justify-center gap-4">
                <button onClick={closeDeleteModal} className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg">
                  Cancel
                </button>
                <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
