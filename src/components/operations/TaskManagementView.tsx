import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  MessageSquare, 
  Send, 
  User, 
  Users, 
  Sliders, 
  Calendar, 
  X,
  AlertCircle
} from 'lucide-react';
import { 
  db, 
  collection, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  auth
} from '../../firebase';
import { generateWALink, openWhatsApp } from '../../utils/whatsapp';
import { format, parseISO } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string;
  assignedToType: 'division' | 'mitra' | 'all_mitras';
  assignedTo: string; // e.g. 'operasional', 'finance', 'marketing', 'mitra_dev', or Partner User ID / Brand Name
  assignedToName: string; // e.g. 'Operasional', or Partner's Business Brand Name
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'high' | 'medium' | 'low';
  dueDate: string; // YYYY-MM-DD
  createdAt: string; // ISO String
  createdBy: string; // Email / UID
  notes?: string; // Collaboration notes / status updates
  updatedAt: string; // ISO String
  completedAt?: string | null;
}

interface UserProfile {
  id: string;
  uid: string;
  email: string;
  role: string;
  namaLengkap?: string;
  brandName?: string;
  phone?: string;
}

export const TaskManagementView: React.FC<{ 
  isMitraMode?: boolean; 
  mitraId?: string;
  mitraBrandName?: string;
  currentRole?: string | null;
  currentSubRole?: string | null;
}> = ({ 
  isMitraMode = false, 
  mitraId = '', 
  mitraBrandName = '',
  currentRole = null,
  currentSubRole = null
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mitras, setMitras] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditNotesModal, setShowEditNotesModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToType, setAssignedToType] = useState<'division' | 'mitra' | 'all_mitras'>('division');
  const [assignedTo, setAssignedTo] = useState('operasional');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [dueDate, setDueDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 3);
    return today.toISOString().split('T')[0];
  });

  // Notes state
  const [newNoteText, setNewNoteText] = useState('');

  // Determine current user context
  const currentUser = auth.currentUser;
  const userEmail = currentUser?.email || 'admin@umaroh.com';

  // Get active division for current logged in user
  const userDivision = currentSubRole || (currentRole === 'admin' ? 'admin' : 'all');

  // Load active partners / mitras from Firestore for task assignment
  useEffect(() => {
    if (isMitraMode) return; // Partners don't need to load other partners

    const q = query(collection(db, 'users'), where('role', '==', 'mitra'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          uid: d.uid || doc.id,
          email: d.email || '',
          role: d.role || '',
          namaLengkap: d.namaLengkap || d.name || '',
          brandName: d.brandName || '',
          phone: d.phone || ''
        });
      });
      setMitras(list);
    }, (error) => {
      console.error("Error loading partners for task assignment:", error);
    });

    return () => unsubscribe();
  }, [isMitraMode]);

  // Load tasks in real-time from Firestore
  useEffect(() => {
    const tasksRef = collection(db, 'tasks_reminder');
    
    const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
      const list: Task[] = [];
      const todayStr = new Date().toISOString().split('T')[0];
      
      snapshot.forEach((doc) => {
        const d = doc.data();
        let status = d.status || 'pending';
        
        // Auto-detect overdue state for pending/in-progress tasks
        if (status !== 'completed' && d.dueDate && d.dueDate < todayStr) {
          status = 'overdue';
        }

        list.push({
          id: doc.id,
          title: d.title || '',
          description: d.description || '',
          assignedToType: d.assignedToType || 'division',
          assignedTo: d.assignedTo || '',
          assignedToName: d.assignedToName || '',
          status: status,
          priority: d.priority || 'medium',
          dueDate: d.dueDate || '',
          createdAt: d.createdAt || new Date().toISOString(),
          createdBy: d.createdBy || '',
          notes: d.notes || '',
          updatedAt: d.updatedAt || new Date().toISOString(),
          completedAt: d.completedAt || null
        });
      });

      // Sort: high priority first, then oldest due date, then newest created
      list.sort((a, b) => {
        const pLevel = { high: 3, medium: 2, low: 1 };
        const pDiff = pLevel[b.priority] - pLevel[a.priority];
        if (pDiff !== 0) return pDiff;
        
        return a.dueDate.localeCompare(b.dueDate);
      });

      setTasks(list);
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading task management records:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle task submission
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert("Harap isi judul dan deskripsi tugas!");
      return;
    }

    try {
      let resolvedName = '';
      if (assignedToType === 'division') {
        const divisionNames: Record<string, string> = {
          operasional: 'Divisi Operasional',
          finance: 'Divisi Keuangan & Finance',
          marketing: 'Divisi Digital Marketing',
          mitra_dev: 'Divisi Mitra Development',
          admin: 'Master Admin / Pusat',
          all_divisions: 'Semua Divisi Internal'
        };
        resolvedName = divisionNames[assignedTo] || assignedTo;
      } else if (assignedToType === 'all_mitras') {
        resolvedName = 'Semua Mitra Travel';
      } else {
        const selectedMitra = mitras.find(m => m.id === assignedTo || m.uid === assignedTo);
        resolvedName = selectedMitra?.brandName || selectedMitra?.namaLengkap || 'Mitra Travel';
      }

      const newTaskPayload = {
        title: title.trim(),
        description: description.trim(),
        assignedToType,
        assignedTo,
        assignedToName: resolvedName,
        status: 'pending',
        priority,
        dueDate,
        createdAt: new Date().toISOString(),
        createdBy: userEmail,
        updatedAt: new Date().toISOString(),
        notes: `[SISTEM - ${new Date().toLocaleDateString('id-ID')}]: Tugas dibuat oleh ${userEmail}`
      };

      await addDoc(collection(db, 'tasks_reminder'), newTaskPayload);
      
      // Reset form
      setTitle('');
      setDescription('');
      setAssignedToType('division');
      setAssignedTo('operasional');
      setPriority('medium');
      setShowCreateModal(false);
    } catch (err) {
      console.error("Gagal menambahkan tugas baru:", err);
      alert("Terjadi kesalahan sistem saat membuat tugas.");
    }
  };

  // Quick state update (change task status)
  const handleUpdateStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const taskRef = doc(db, 'tasks_reminder', taskId);
      const today = new Date().toISOString();
      const userLabel = isMitraMode ? `Mitra: ${mitraBrandName || userEmail}` : `Divisi: ${userDivision}`;
      
      const statusLabels = {
        pending: 'Pending',
        in_progress: 'Dalam Proses',
        completed: 'Selesai'
      };

      const appendNote = `\n[${userLabel} - ${new Date().toLocaleDateString('id-ID')}]: Mengubah status menjadi *${statusLabels[newStatus]}*`;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: Record<string, any> = {
        status: newStatus,
        updatedAt: today,
        notes: (tasks.find(t => t.id === taskId)?.notes || '') + appendNote
      };

      if (newStatus === 'completed') {
        updatePayload.completedAt = today;
      } else {
        updatePayload.completedAt = null;
      }

      await updateDoc(taskRef, updatePayload);
    } catch (err) {
      console.error("Gagal memperbarui status tugas:", err);
    }
  };

  // Add a collaboration note / comment to a task
  const handleAddNote = async () => {
    if (!selectedTask || !newNoteText.trim()) return;

    try {
      const taskRef = doc(db, 'tasks_reminder', selectedTask.id);
      const userLabel = isMitraMode ? `Mitra: ${mitraBrandName || userEmail}` : `Internal: ${userEmail}`;
      const timestamp = new Date().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const formattedNote = `\n[${userLabel} @ ${timestamp}]: ${newNoteText.trim()}`;

      const updatedNotes = (selectedTask.notes || '') + formattedNote;

      await updateDoc(taskRef, {
        notes: updatedNotes,
        updatedAt: new Date().toISOString()
      });

      // Update local copy of selectedTask for instant rendering
      setSelectedTask(prev => prev ? { ...prev, notes: updatedNotes } : null);
      setNewNoteText('');
    } catch (err) {
      console.error("Gagal menambahkan catatan:", err);
    }
  };

  // Delete a task (Admin only)
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus tugas ini?")) return;

    try {
      await deleteDoc(doc(db, 'tasks_reminder', taskId));
    } catch (err) {
      console.error("Gagal menghapus tugas:", err);
    }
  };

  // Quick Action: Send WhatsApp reminder to Mitra or designated assignee
  const handleSendWAReminder = (task: Task) => {
    let phoneNum = '08123456789'; // Default
    const recipientName = task.assignedToName;

    if (task.assignedToType === 'mitra') {
      const selectedMitra = mitras.find(m => m.id === task.assignedTo || m.uid === task.assignedTo);
      if (selectedMitra && selectedMitra.phone) {
        phoneNum = selectedMitra.phone;
      }
    }

    const priorityLabel = { high: '🔴 TINGGI', medium: '🟡 SEDANG', low: '🔵 RENDAH' }[task.priority];
    const formattedDueDate = new Date(task.dueDate).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const msg = `Assalamu'alaikum wr. wb. ${recipientName},

Mengingatkan kembali tugas/operasional penting dari Umaroh ERP Pusat:

📌 *TUGAS:* ${task.title}
📝 *DESKRIPSI:* ${task.description}
📅 *TENGGAT WAKTU (DUE DATE):* ${formattedDueDate}
⚠️ *PRIORITAS:* ${priorityLabel}
🔄 *STATUS SAAT INI:* ${task.status.toUpperCase()}

Mohon untuk segera ditindaklanjuti dan diperbarui status pengerjaannya melalui Portal Umaroh ERP Anda.

Terima kasih,
*Tim Sistem Terintegrasi Umaroh.com*`;

    const link = generateWALink(phoneNum, msg);
    openWhatsApp(link);
  };

  // Filter logic based on role, subrole, and user inputs
  const filteredTasks = tasks.filter((task) => {
    // A. Role-based restrictions (Who should see what)
    if (isMitraMode) {
      // Mitras only see tasks assigned to them specifically, or to "all_mitras"
      const isAssignedToThisMitra = task.assignedToType === 'mitra' && (task.assignedTo === mitraId || task.assignedTo === userEmail);
      const isAllMitras = task.assignedToType === 'all_mitras';
      if (!isAssignedToThisMitra && !isAllMitras) return false;
    } else {
      // Admin/Internal staff filtering by designated assignees
      if (filterAssigned !== 'all') {
        if (filterAssigned === 'division_operasional' && (task.assignedToType !== 'division' || task.assignedTo !== 'operasional')) return false;
        if (filterAssigned === 'division_finance' && (task.assignedToType !== 'division' || task.assignedTo !== 'finance')) return false;
        if (filterAssigned === 'division_marketing' && (task.assignedToType !== 'division' || task.assignedTo !== 'marketing')) return false;
        if (filterAssigned === 'division_mitra_dev' && (task.assignedToType !== 'division' || task.assignedTo !== 'mitra_dev')) return false;
        if (filterAssigned === 'all_mitras' && task.assignedToType !== 'all_mitras') return false;
        if (filterAssigned === 'specific_mitra' && task.assignedToType !== 'mitra') return false;
      }
    }

    // B. Search term filter
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assignedToName.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // C. Priority filter
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;

    // D. Status filter
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;

    return true;
  });

  // Calculate statistics for bento stats cards
  const totalActiveCount = tasks.filter(t => t.status !== 'completed' && (!isMitraMode || t.assignedTo === mitraId || t.assignedToType === 'all_mitras')).length;
  const highPriorityCount = tasks.filter(t => t.priority === 'high' && t.status !== 'completed' && (!isMitraMode || t.assignedTo === mitraId || t.assignedToType === 'all_mitras')).length;
  const overdueCount = tasks.filter(t => t.status === 'overdue' && (!isMitraMode || t.assignedTo === mitraId || t.assignedToType === 'all_mitras')).length;
  const completedCount = tasks.filter(t => t.status === 'completed' && (!isMitraMode || t.assignedTo === mitraId || t.assignedToType === 'all_mitras')).length;

  return (
    <div className={`w-full ${isMitraMode ? 'py-4' : 'container mx-auto px-4 py-8'}`}>
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-gray-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-gray-950 rounded-2xl shadow-lg">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-indigo-150">
              {isMitraMode ? 'MITRA TASK CENTER' : 'OPERATIONAL COLLABORATION ENGINE'}
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mt-1">
              {isMitraMode ? 'Tugas & Pengingat Mitra' : 'Task & Reminder Management'}
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {isMitraMode 
                ? 'Kelola daftar tugas operasional, kelengkapan dokumen, dan pengingat keberangkatan travel Anda.' 
                : 'Orkestrasi alur kerja, pengingat, dan kolaborasi real-time antar-divisi internal pusat & mitra travel.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {!isMitraMode && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-gray-950 font-black px-5 py-3 rounded-2xl shadow-md transition-all self-start md:self-center"
          >
            <Plus className="w-5 h-5" />
            Rilis Tugas Baru
          </button>
        )}
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        
        {/* Card 1: Total Active */}
        <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Tugas Aktif</p>
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 mt-1">{totalActiveCount}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Sliders className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: High Priority */}
        <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Prioritas Tinggi</p>
            <h3 className="text-2xl md:text-3xl font-black text-rose-650 mt-1">{highPriorityCount}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Card 3: Overdue */}
        <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Tenggat Lewat</p>
            <h3 className="text-2xl md:text-3xl font-black text-amber-650 mt-1">{overdueCount}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Completed */}
        <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Selesai</p>
            <h3 className="text-2xl md:text-3xl font-black text-emerald-600 mt-1">{completedCount}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs mb-8 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search */}
          <div className="relative flex-grow max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Cari tugas, deskripsi, atau penanggung jawab..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-250 focus:outline-hidden focus:border-indigo-500 font-medium text-xs md:text-sm bg-gray-50/50"
            />
          </div>

          {/* Quick Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filter Assigned To (Admin Only) */}
            {!isMitraMode && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2">
                <User className="w-4 h-4 text-gray-400" />
                <select 
                  value={filterAssigned} 
                  onChange={(e) => setFilterAssigned(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Semua Penanggung Jawab</option>
                  <option value="division_operasional">Divisi Operasional</option>
                  <option value="division_finance">Divisi Keuangan</option>
                  <option value="division_marketing">Divisi Marketing</option>
                  <option value="division_mitra_dev">Divisi Mitra Dev</option>
                  <option value="all_mitras">Semua Mitra Travel</option>
                  <option value="specific_mitra">Mitra Spesifik</option>
                </select>
              </div>
            )}

            {/* Filter Priority */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2">
              <AlertCircle className="w-4 h-4 text-gray-400" />
              <select 
                value={filterPriority} 
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Prioritas</option>
                <option value="high">Tinggi (High)</option>
                <option value="medium">Sedang (Medium)</option>
                <option value="low">Rendah (Low)</option>
              </select>
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">Dalam Proses</option>
                <option value="completed">Selesai</option>
                <option value="overdue">Tenggat Lewat</option>
              </select>
            </div>

          </div>

        </div>
      </div>

      {/* Main Task List Grid */}
      {isLoading ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-150 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Memuat Daftar Tugas...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-150 shadow-sm">
          <CheckSquare className="w-14 h-14 text-gray-300 mx-auto mb-4 opacity-50" />
          <h3 className="text-base font-black text-gray-800 uppercase tracking-wider">Tidak Ada Tugas Ditemukan</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            Semua tugas operasional telah bersih atau tidak cocok dengan filter pencarian aktif Anda. Kerja bagus!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => {
            
            // Priority styling
            const priorityBadges = {
              high: 'bg-rose-50 text-rose-700 border-rose-200',
              medium: 'bg-amber-50 text-amber-700 border-amber-200',
              low: 'bg-indigo-50 text-indigo-700 border-indigo-200'
            };

            // Status styling
            const statusBadges = {
              pending: 'bg-gray-100 text-gray-600 border-gray-200',
              in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
              completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              overdue: 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
            };

            const isTaskOverdue = task.status === 'overdue';

            return (
              <div 
                key={task.id} 
                className={`bg-white rounded-3xl border p-6 flex flex-col justify-between transition-all hover:shadow-md hover:border-indigo-150 relative overflow-hidden group ${
                  task.status === 'completed' ? 'opacity-85' : ''
                } ${isTaskOverdue ? 'border-rose-300 shadow-rose-50/50' : 'border-gray-150'}`}
              >
                {/* Colored Top Lip Indicator */}
                <div className={`absolute top-0 inset-x-0 h-1.5 ${
                  task.priority === 'high' ? 'bg-rose-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-indigo-500'
                }`} />

                <div>
                  {/* Task Meta / Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${priorityBadges[task.priority]}`}>
                      {task.priority.toUpperCase()} PRIORITY
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusBadges[task.status]}`}>
                      {task.status === 'in_progress' ? 'DIPROSES' : task.status === 'completed' ? 'SELESAI' : task.status === 'overdue' ? 'OVERDUE' : 'PENDING'}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-base font-black text-gray-950 tracking-tight leading-snug group-hover:text-indigo-650 transition-colors">
                    {task.title}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-1.5 leading-relaxed line-clamp-3">
                    {task.description}
                  </p>

                  {/* Assignee Information */}
                  <div className="mt-5 p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-150 flex items-center justify-center shrink-0 text-indigo-600">
                      {task.assignedToType === 'division' ? <Sliders className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Penanggung Jawab</p>
                      <p className="text-xs font-black text-gray-800 truncate uppercase mt-0.5">
                        {task.assignedToName}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Due date status bar */}
                  <div className="flex items-center justify-between gap-2 mt-5 mb-5 text-[11px] font-bold text-gray-500">
                    <span className="flex items-center gap-1.5 font-sans">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Tenggat: <span className={isTaskOverdue ? 'text-rose-650 font-black' : 'text-gray-700'}>{format(parseISO(task.dueDate), "dd MMM yyyy")}</span>
                    </span>
                    
                    {task.completedAt ? (
                      <span className="text-emerald-600 font-extrabold text-[10px]">SELESAI</span>
                    ) : isTaskOverdue ? (
                      <span className="text-rose-600 font-extrabold text-[10px] animate-pulse">TELAT</span>
                    ) : (
                      <span className="text-gray-450 font-medium text-[10px]">AKTIF</span>
                    )}
                  </div>

                  {/* Operational Controls & Update actions */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                    
                    {/* Status updater for assignee / administrator */}
                    <div className="flex items-center gap-1.5">
                      {task.status !== 'completed' ? (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                              task.status === 'in_progress' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                            title="Proses Pekerjaan"
                          >
                            Proses
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(task.id, 'completed')}
                            className="px-3 py-1.5 rounded-xl text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-black transition-all shadow-xs"
                            title="Tandai Selesai"
                          >
                            Selesai
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleUpdateStatus(task.id, 'pending')}
                          className="px-3 py-1.5 rounded-xl text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-black transition-all"
                          title="Buka Kembali Tugas"
                        >
                          Buka Kembali
                        </button>
                      )}
                    </div>

                    {/* Meta interaction & details */}
                    <div className="flex items-center gap-1.5">
                      {/* Collaboration Comments icon */}
                      <button 
                        onClick={() => {
                          setSelectedTask(task);
                          setShowEditNotesModal(true);
                        }}
                        className="p-2 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 rounded-xl transition-all relative"
                        title="Kolaborasi & Catatan Update"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {task.notes && task.notes.split('\n').filter(Boolean).length > 1 && (
                          <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                            {task.notes.split('\n').filter(Boolean).length - 1}
                          </span>
                        )}
                      </button>

                      {/* WhatsApp trigger (Admin only, when assigned to mitra) */}
                      {!isMitraMode && task.assignedToType === 'mitra' && (
                        <button 
                          onClick={() => handleSendWAReminder(task)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250 rounded-xl transition-all"
                          title="Kirim Pengingat WhatsApp"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}

                      {/* Trash action (Admin only) */}
                      {!isMitraMode && (
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-650 border border-rose-200 rounded-xl transition-all"
                          title="Hapus Tugas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TASK MODAL (Admin Only) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-gray-250 w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-gray-150 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">Rilis Tugas Operasional</h2>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              
              {/* Task Title */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">Judul Tugas / Operasional</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Lengkapi Passport & Buku Kuning Jamaah"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-250 focus:outline-hidden focus:border-indigo-500 font-bold text-xs md:text-sm bg-gray-50/50"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">Deskripsi Lengkap Tugas</label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Berikan instruksi operasional mendalam agar dapat ditindaklanjuti dengan tepat oleh penanggung jawab."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-250 focus:outline-hidden focus:border-indigo-500 font-medium text-xs md:text-sm bg-gray-50/50"
                />
              </div>

              {/* Assignee Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Type Selection */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">Target Penanggung Jawab</label>
                  <select
                    value={assignedToType}
                    onChange={(e) => {
                      const val = e.target.value as 'division' | 'mitra' | 'all_mitras';
                      setAssignedToType(val);
                      if (val === 'division') setAssignedTo('operasional');
                      else if (val === 'all_mitras') setAssignedTo('all_mitras');
                      else setAssignedTo(mitras[0]?.id || '');
                    }}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-250 bg-gray-50/50 focus:outline-hidden focus:border-indigo-500 font-bold text-xs"
                  >
                    <option value="division">Divisi Internal Kantor Pusat</option>
                    <option value="mitra">Mitra Travel Spesifik</option>
                    <option value="all_mitras">Broadcast Semua Mitra Travel</option>
                  </select>
                </div>

                {/* Sub-Selection */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">Pilih Detail</label>
                  {assignedToType === 'division' ? (
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-250 bg-gray-50/50 focus:outline-hidden focus:border-indigo-500 font-bold text-xs"
                    >
                      <option value="operasional">Divisi Operasional</option>
                      <option value="finance">Divisi Keuangan & Finance</option>
                      <option value="marketing">Divisi Digital Marketing</option>
                      <option value="mitra_dev">Divisi Mitra Development</option>
                      <option value="admin">Master Admin / Pusat</option>
                      <option value="all_divisions">Semua Divisi Internal</option>
                    </select>
                  ) : assignedToType === 'all_mitras' ? (
                    <input 
                      type="text" 
                      disabled
                      value="Seluruh Mitra Terdaftar"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-100 font-bold text-xs text-gray-500"
                    />
                  ) : (
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-250 bg-gray-50/50 focus:outline-hidden focus:border-indigo-500 font-bold text-xs"
                    >
                      {mitras.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.brandName || m.namaLengkap} ({m.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Priority */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">Tingkat Prioritas</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-250 bg-gray-50/50 focus:outline-hidden focus:border-indigo-500 font-bold text-xs"
                  >
                    <option value="high">🔴 TINGGI (High)</option>
                    <option value="medium">🟡 SEDANG (Medium)</option>
                    <option value="low">🔵 RENDAH (Low)</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">Tenggat Waktu (Due Date)</label>
                  <input 
                    type="date" 
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-250 focus:outline-hidden focus:border-indigo-500 font-bold text-xs md:text-sm bg-gray-50/50"
                  />
                </div>

              </div>

              {/* Footer Form */}
              <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-gray-950 text-xs font-black shadow-xs"
                >
                  Buat & Posting Tugas
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT NOTES & COLLABORATION MODAL */}
      {showEditNotesModal && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-gray-250 w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-gray-150 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase">Update Log & Kolaborasi</h2>
              </div>
              <button 
                onClick={() => {
                  setShowEditNotesModal(false);
                  setSelectedTask(null);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Task Summary */}
              <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100 mb-4">
                <h3 className="font-extrabold text-sm text-indigo-950">{selectedTask.title}</h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{selectedTask.description}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-[10px] text-gray-500 font-bold uppercase">
                  <span>Prioritas: <span className="text-gray-700">{selectedTask.priority}</span></span>
                  <span>Tenggat: <span className="text-gray-700">{selectedTask.dueDate}</span></span>
                  <span>PJ: <span className="text-indigo-650">{selectedTask.assignedToName}</span></span>
                </div>
              </div>

              {/* Chat-like Collaboration History */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Riwayat Update & Catatan</label>
                <div className="border border-gray-150 rounded-2xl p-4 bg-gray-50/50 space-y-3.5 max-h-60 overflow-y-auto">
                  {selectedTask.notes && selectedTask.notes.split('\n').filter(Boolean).length > 0 ? (
                    selectedTask.notes.split('\n').filter(Boolean).map((line, idx) => {
                      const isSystem = line.includes('[SISTEM');
                      const isInternal = line.includes('Internal:');
                      const isMitraComment = line.includes('Mitra:');
                      
                      let textBg = 'bg-gray-100 text-gray-700 border-gray-200';
                      if (isSystem) textBg = 'bg-slate-100/70 text-slate-500 border-slate-200/50';
                      else if (isInternal) textBg = 'bg-indigo-50 text-indigo-850 border-indigo-150';
                      else if (isMitraComment) textBg = 'bg-emerald-50 text-emerald-850 border-emerald-150';

                      return (
                        <div key={idx} className={`p-3 rounded-2xl border text-xs leading-relaxed font-medium ${textBg}`}>
                          {line}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center py-6 text-xs text-gray-400 font-semibold">Belum ada catatan update.</p>
                  )}
                </div>
              </div>

              {/* Add New Comment / Update Log */}
              <div className="pt-4 border-t border-gray-100">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Tambahkan Catatan Baru</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Ketik rincian pengerjaan, kendala, atau update dokumen terbaru..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="flex-grow px-4 py-3 rounded-2xl border border-gray-250 focus:outline-hidden focus:border-indigo-500 font-medium text-xs bg-gray-50/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddNote();
                    }}
                  />
                  <button
                    onClick={handleAddNote}
                    className="bg-indigo-600 hover:bg-indigo-700 text-gray-950 px-4.5 rounded-2xl flex items-center justify-center transition-all shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
