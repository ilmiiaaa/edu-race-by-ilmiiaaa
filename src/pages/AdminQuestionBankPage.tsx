import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Download, Upload, CheckCircle2, XCircle, ArrowLeft, Clock, HelpCircle, AlertCircle, RotateCcw, Search, Sparkles } from 'lucide-react';
import { sound } from '../lib/audio';
import { getAuthHeaders } from '../lib/auth';

interface AdminQuestionBankPageProps {
  onBack: () => void;
}

export const AdminQuestionBankPage: React.FC<AdminQuestionBankPageProps> = ({ onBack }) => {
  const [questionSets, setQuestionSets] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSet, setSelectedSet] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showSetModal, setShowSetModal] = useState(false);
  const [editingSet, setEditingSet] = useState<any | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for Set (Create / Edit)
  const [setTitle, setSetTitle] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [setSubjectId, setSetSubjectId] = useState('');
  const [setGradeLevel, setSetGradeLevel] = useState('Kelas 4-6 SD');

  // Form states for Question (Create / Edit)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false'>('multiple_choice');
  const [timeLimit, setTimeLimit] = useState(15);
  const [points, setPoints] = useState(1000);
  const [explanation, setExplanation] = useState('');

  const [options, setOptions] = useState<Array<{ id: string; optionText: string; isCorrect: boolean }>>([
    { id: '1', optionText: '', isCorrect: true },
    { id: '2', optionText: '', isCorrect: false },
    { id: '3', optionText: '', isCorrect: false },
    { id: '4', optionText: '', isCorrect: false },
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [setsRes, subsRes] = await Promise.all([
        fetch('/api/question-sets').then((r) => r.json()),
        fetch('/api/subjects').then((r) => r.json()),
      ]);
      setQuestionSets(setsRes);
      setSubjects(subsRes);
      if (subsRes.length > 0 && !setSubjectId) {
        setSetSubjectId(subsRes[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Reset Paket Kuis ke Standar Kurikulum
  const handleResetPackages = async () => {
    sound.playClick();
    try {
      const res = await fetch('/api/admin/reset-packages', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Paket kuis berhasil di-reset ke kurikulum standar!');
        setSelectedSet(null);
        loadData();
      } else {
        showToast(data.error || 'Gagal mereset paket kuis.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openSetDetails = async (set: any) => {
    sound.playClick();
    setSelectedSet(set);
    try {
      const res = await fetch(`/api/question-sets/${set.id}`);
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Paket Kuis CRUD: Create & Edit
  const openCreateSetModal = () => {
    sound.playClick();
    setEditingSet(null);
    setSetTitle('');
    setSetDescription('');
    setSetGradeLevel('Kelas 4-6 SD');
    if (subjects.length > 0) setSetSubjectId(subjects[0].id);
    setShowSetModal(true);
  };

  const openEditSetModal = (s: any, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    setEditingSet(s);
    setSetTitle(s.title);
    setSetDescription(s.description || '');
    setSetSubjectId(s.subjectId);
    setSetGradeLevel(s.gradeLevel || 'Kelas 4-6 SD');
    setShowSetModal(true);
  };

  const handleSaveSet = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    try {
      const url = editingSet ? `/api/question-sets/${editingSet.id}` : '/api/question-sets';
      const method = editingSet ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          title: setTitle,
          description: setDescription,
          subjectId: setSubjectId,
          gradeLevel: setGradeLevel,
        }),
      });

      if (res.ok) {
        showToast(editingSet ? 'Paket kuis berhasil diperbarui.' : 'Paket kuis baru berhasil dibuat.');
        setShowSetModal(false);
        setEditingSet(null);
        setSetTitle('');
        setSetDescription('');
        loadData();
        if (editingSet && selectedSet?.id === editingSet.id) {
          setSelectedSet((prev: any) => ({
            ...prev,
            title: setTitle,
            description: setDescription,
            gradeLevel: setGradeLevel,
          }));
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan paket.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSet = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sound.playClick();
    try {
      const res = await fetch(`/api/question-sets/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        if (selectedSet?.id === id) setSelectedSet(null);
        showToast('Paket soal berhasil dihapus.');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Questions CRUD: Create & Edit
  const openCreateQuestionModal = () => {
    sound.playClick();
    setEditingQuestionId(null);
    setQuestionText('');
    setExplanation('');
    setTimeLimit(15);
    setPoints(1000);
    setQuestionType('multiple_choice');
    setOptions([
      { id: '1', optionText: '', isCorrect: true },
      { id: '2', optionText: '', isCorrect: false },
      { id: '3', optionText: '', isCorrect: false },
      { id: '4', optionText: '', isCorrect: false },
    ]);
    setShowQuestionModal(true);
  };

  const openEditQuestionModal = (q: any) => {
    sound.playClick();
    setEditingQuestionId(q.id);
    setQuestionText(q.questionText);
    setQuestionType(q.questionType || 'multiple_choice');
    setTimeLimit(q.timeLimitSeconds || 15);
    setPoints(q.points || 1000);
    setExplanation(q.explanation || '');

    if (Array.isArray(q.options) && q.options.length > 0) {
      setOptions(
        q.options.map((o: any, idx: number) => ({
          id: o.id || String(idx + 1),
          optionText: o.optionText || '',
          isCorrect: Boolean(o.isCorrect),
        }))
      );
    } else {
      setOptions([
        { id: '1', optionText: '', isCorrect: true },
        { id: '2', optionText: '', isCorrect: false },
        { id: '3', optionText: '', isCorrect: false },
        { id: '4', optionText: '', isCorrect: false },
      ]);
    }
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSet) return;
    sound.playClick();

    const formattedOpts =
      questionType === 'true_false'
        ? [
            { id: 'opt-tf-1', optionText: 'Benar', isCorrect: options[0]?.isCorrect !== false },
            { id: 'opt-tf-2', optionText: 'Salah', isCorrect: options[0]?.isCorrect === false },
          ]
        : options;

    const payload = {
      questionSetId: selectedSet.id,
      questionText,
      questionType,
      timeLimitSeconds: timeLimit,
      points,
      explanation,
      options: formattedOpts,
    };

    try {
      const url = editingQuestionId ? `/api/questions/${editingQuestionId}` : '/api/questions';
      const method = editingQuestionId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingQuestionId ? 'Soal berhasil diperbarui.' : 'Soal baru berhasil ditambahkan.');
        setShowQuestionModal(false);
        setEditingQuestionId(null);
        setQuestionText('');
        setExplanation('');
        openSetDetails(selectedSet);
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyimpan soal.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    sound.playClick();
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        openSetDetails(selectedSet);
        showToast('Soal berhasil dihapus.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportCsv = async () => {
    if (!selectedSet || !csvText.trim()) return;
    sound.playClick();
    try {
      const res = await fetch('/api/questions/import', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ questionSetId: selectedSet.id, csvData: csvText }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Soal berhasil diimpor!');
        setShowImportModal(false);
        setCsvText('');
        openSetDetails(selectedSet);
      } else {
        showToast(data.error || 'Gagal mengimpor soal.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSets = questionSets.filter((s) => {
    return (
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.subjectName && s.subjectName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const filteredQuestions = questions.filter((q) => {
    return q.questionText.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedSet) setSelectedSet(null);
              else onBack();
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-400" />
              <span>{selectedSet ? selectedSet.title : 'Kelola Bank Soal & Paket Kuis (CRUD)'}</span>
            </h1>
            <p className="text-xs text-slate-400">
              {selectedSet
                ? `Mata Pelajaran: ${selectedSet.subjectName || 'Umum'} • ${questions.length} Total Soal`
                : 'Buat, ubah, hapus paket kuis kurikulum atau reset ulang ke paket standar.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {selectedSet ? (
            <>
              <a
                href={`/api/questions/export?setId=${selectedSet.id}`}
                download
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </a>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Impor CSV</span>
              </button>
              <button
                onClick={openCreateQuestionModal}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Soal</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleResetPackages}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5"
                title="Reset seluruh paket kuis ke kurikulum standar (Matematika, IPA, Pengetahuan Nusantara)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Paket Kuis Standar</span>
              </button>

              <button
                onClick={openCreateSetModal}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Paket Kuis Baru</span>
              </button>
            </>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center justify-between shadow animate-in fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white text-xs ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={selectedSet ? 'Cari teks pertanyaan...' : 'Cari judul paket kuis atau mata pelajaran...'}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main View: Sets Grid or Question Detail Table */}
      {!selectedSet ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSets.map((s) => (
            <div
              key={s.id}
              onClick={() => openSetDetails(s)}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 shadow-xl space-y-4 cursor-pointer transition transform hover:-translate-y-1 group"
            >
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {s.subjectName || 'Umum'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => openEditSetModal(s, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
                    title="Ubah Paket Kuis"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteSet(s.id, e)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Hapus Paket Kuis"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-extrabold text-white text-lg group-hover:text-indigo-400 transition">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                  {s.description || 'Tidak ada deskripsi.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>{s.gradeLevel}</span>
                <span className="font-bold text-amber-400">{s.questionCount || 0} Soal Tersedia</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Questions list for selected set */
        <div className="space-y-4">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q, qIndex) => (
              <div
                key={q.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {qIndex + 1}
                    </span>
                    <h3 className="font-bold text-white text-base">{q.questionText}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {q.timeLimitSeconds}d
                    </span>
                    <button
                      onClick={() => openEditQuestionModal(q)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
                      title="Edit Soal"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Hapus Soal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Options preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.options?.map((opt: any, idx: number) => (
                    <div
                      key={opt.id || idx}
                      className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between border ${
                        opt.isCorrect
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200 font-semibold'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{opt.optionText}</span>
                      {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <div className="text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                    <strong className="text-slate-300">Pembahasan:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                {questions.length === 0 ? 'Belum ada soal pada paket ini.' : 'Tidak ada soal yang cocok dengan pencarian.'}
              </p>
              <button
                onClick={openCreateQuestionModal}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Tambah Soal Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create / Edit Question Set */}
      {showSetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <h2 className="text-xl font-black text-white">
              {editingSet ? 'Ubah Informasi Paket Kuis' : 'Buat Paket Kuis Baru'}
            </h2>
            <form onSubmit={handleSaveSet} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Judul Paket</label>
                <input
                  type="text"
                  value={setTitle}
                  onChange={(e) => setSetTitle(e.target.value)}
                  placeholder="Contoh: Balapan Pecahan & Desimal"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Mata Pelajaran</label>
                <select
                  value={setSubjectId}
                  onChange={(e) => setSetSubjectId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Tingkat Kelas</label>
                <input
                  type="text"
                  value={setGradeLevel}
                  onChange={(e) => setSetGradeLevel(e.target.value)}
                  placeholder="Contoh: Kelas 5 SD"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Deskripsi Materi</label>
                <textarea
                  value={setDescription}
                  onChange={(e) => setSetDescription(e.target.value)}
                  placeholder="Uraian singkat tentang materi yang diujikan..."
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSetModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow"
                >
                  {editingSet ? 'Simpan Perubahan' : 'Simpan Paket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Question */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-4 shadow-2xl my-8">
            <h2 className="text-xl font-black text-white">
              {editingQuestionId ? 'Ubah Pertanyaan Balapan' : 'Tambah Pertanyaan Balapan'}
            </h2>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Teks Pertanyaan</label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Tuliskan soal yang akan dijawab pembalap..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 h-20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Batas Waktu</label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                  >
                    <option value={10}>10 Detik (Cepat)</option>
                    <option value={15}>15 Detik (Standar)</option>
                    <option value={20}>20 Detik</option>
                    <option value={30}>30 Detik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Poin Dasar</label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>

              {/* Options Section */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  Pilihan Jawaban (Pilih Lingkaran untuk Jawaban Benar)
                </label>
                {options.map((opt, idx) => (
                  <div key={opt.id || idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={opt.isCorrect}
                      onChange={() => {
                        setOptions((prev) =>
                          prev.map((o, i) => ({ ...o, isCorrect: i === idx }))
                        );
                      }}
                      className="w-4 h-4 text-emerald-500 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={opt.optionText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOptions((prev) =>
                          prev.map((o, i) => (i === idx ? { ...o, optionText: val } : o))
                        );
                      }}
                      placeholder={`Opsi ${idx + 1}`}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Pembahasan / Catatan Edukasi</label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Penjelasan yang tampil setelah semua siswa menjawab..."
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-indigo-500 h-16"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white shadow"
                >
                  {editingQuestionId ? 'Simpan Perubahan' : 'Simpan Soal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: CSV Import */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <h2 className="text-xl font-black text-white">Impor Soal via CSV</h2>
            <p className="text-xs text-slate-400">
              Format baris CSV: <br />
              <code className="text-amber-300">
                questionText,questionType,timeLimit,points,explanation,opt1,opt2,opt3,opt4,correctIndex(0-3)
              </code>
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`questionText,questionType,timeLimitSeconds,points,explanation,option1,option2,option3,option4,correctIndex\n"Berapa 5 x 5?",multiple_choice,15,1000,"5 x 5 = 25",15,20,25,30,2`}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 font-mono text-xs text-white outline-none focus:border-indigo-500 h-44"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow"
              >
                Unggah & Proses Soal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
