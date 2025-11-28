import React, { useState, useEffect, useRef } from 'react';
import { generateQuizQuestions } from './services/geminiService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Subject, QuizData, QuizResult } from './types';
import Button from './components/Button';
import LoadingScreen from './components/LoadingScreen';
import QuizResultCard from './components/QuizResultCard';
import { 
  BookOpen, 
  Calculator, 
  Trophy, 
  History, 
  ChevronRight, 
  CheckCircle2, 
  Home, 
  Clock,
  Star,
  Zap,
  Download,
  Upload,
  Trash2,
  Cloud,
  Loader2,
  AlertTriangle
} from 'lucide-react';

// Screen states
enum Screen {
  HOME,
  GENERATING,
  TAKING,
  RESULT,
  HISTORY
}

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>(Screen.HOME);
  const [currentQuiz, setCurrentQuiz] = useState<QuizData | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]); // Indices of selected answers
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<QuizResult | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize User ID (Device ID) and Load History
  useEffect(() => {
    const initApp = async () => {
      // 1. Get or Create Device ID
      let storedUserId = localStorage.getItem('device_user_id');
      if (!storedUserId) {
        storedUserId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('device_user_id', storedUserId);
      }
      setUserId(storedUserId);

      // 2. Fetch History from Supabase (only if configured)
      if (isSupabaseConfigured) {
        await fetchHistoryFromSupabase(storedUserId);
      }
    };

    initApp();
  }, []);

  const fetchHistoryFromSupabase = async (uid: string) => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Lỗi khi tải lịch sử:', error);
      } else if (data) {
        // Map Supabase data format to our QuizResult interface
        const formattedHistory: QuizResult[] = data.map((item: any) => ({
          quizId: item.quiz_id,
          subject: item.subject as Subject,
          score: item.score,
          totalQuestions: item.total_questions,
          date: new Date(item.created_at).getTime(),
          userAnswers: item.user_answers
        }));
        setHistory(formattedHistory);
      }
    } catch (err) {
      console.error("Lỗi kết nối Supabase:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleGenerate = async (subject: Subject) => {
    setScreen(Screen.GENERATING);
    setLoadingError(null);
    try {
      const questions = await generateQuizQuestions(subject);
      const newQuiz: QuizData = {
        id: Date.now().toString(),
        subject,
        questions,
        createdAt: Date.now()
      };
      setCurrentQuiz(newQuiz);
      setUserAnswers(new Array(questions.length).fill(-1));
      setScreen(Screen.TAKING);
    } catch (error) {
      setLoadingError("Có lỗi xảy ra khi tạo đề. Bé hãy thử lại nhé!");
      setScreen(Screen.HOME);
    }
  };

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = optionIndex;
    setUserAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!currentQuiz) return;

    // Calculate score
    let correctCount = 0;
    currentQuiz.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswerIndex) {
        correctCount++;
      }
    });
    const score = correctCount * 5; // 5 points per question

    const result: QuizResult = {
      quizId: currentQuiz.id,
      subject: currentQuiz.subject,
      score,
      totalQuestions: currentQuiz.questions.length,
      date: Date.now(),
      userAnswers: [...userAnswers]
    };

    setResultData(result);
    setScreen(Screen.RESULT);
    
    // Optimistic Update (update UI immediately)
    setHistory([result, ...history]);

    // Save to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('quiz_results').insert({
          user_id: userId,
          quiz_id: result.quizId,
          subject: result.subject,
          score: result.score,
          total_questions: result.totalQuestions,
          user_answers: result.userAnswers,
          created_at: new Date().toISOString()
        });

        if (error) {
          console.error("Lỗi khi lưu vào Supabase:", error);
        }
      } catch (err) {
        console.error("Lỗi hệ thống khi lưu:", err);
      }
    }
  };

  // --- Export / Import / Clear Data Functions ---
  const handleExportData = () => {
    if (history.length === 0) {
      alert("Chưa có dữ liệu để sao lưu!");
      return;
    }
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lich-su-hoc-tap-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    if (!isSupabaseConfigured) {
      alert("Cần cấu hình Supabase để sử dụng tính năng đồng bộ.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        if (Array.isArray(parsedData)) {
          if(window.confirm(`Tìm thấy ${parsedData.length} bài thi trong file. Bạn có muốn đồng bộ lên đám mây không?`)) {
             // Upload imported data to Supabase
             setIsLoadingHistory(true);
             const promises = parsedData.map(item => 
               supabase.from('quiz_results').insert({
                 user_id: userId,
                 quiz_id: item.quizId,
                 subject: item.subject,
                 score: item.score,
                 total_questions: item.totalQuestions,
                 user_answers: item.userAnswers,
                 created_at: new Date(item.date).toISOString()
               })
             );
             
             await Promise.all(promises);
             await fetchHistoryFromSupabase(userId);
             alert("Khôi phục và đồng bộ thành công!");
          }
        } else {
          alert("File không đúng định dạng!");
        }
      } catch (error) {
        alert("Lỗi khi đọc file hoặc đồng bộ. Vui lòng thử lại.");
        console.error(error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const handleClearHistory = async () => {
    if (!isSupabaseConfigured) return;
    
    if (window.confirm("CẢNH BÁO: Bạn có chắc muốn xóa toàn bộ lịch sử học tập trên đám mây không? Hành động này không thể hoàn tác.")) {
      setIsLoadingHistory(true);
      const { error } = await supabase
        .from('quiz_results')
        .delete()
        .eq('user_id', userId);

      if (!error) {
        setHistory([]);
      } else {
        alert("Lỗi khi xóa dữ liệu.");
      }
      setIsLoadingHistory(false);
    }
  };
  // ----------------------------------------------

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const renderFooter = () => (
    <footer className="mt-12 py-6 text-center text-gray-400 text-sm border-t border-gray-200">
      <p className="flex items-center justify-center gap-1 mb-1">
        Phát triển bởi <span className="font-bold text-gray-600">tuannguyenminh.com</span>
      </p>
      <p>Ứng dụng giáo dục hỗ trợ bởi AI & Cloud - Dành cho bé lớp 2</p>
    </footer>
  );

  const renderHome = () => (
    <div className="max-w-2xl mx-auto p-6 space-y-8 flex flex-col min-h-screen">
      <header className="text-center space-y-2 mt-8">
        <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold mb-2">
           <Zap size={16} /> Phiên bản Nâng Cao
        </div>
        <h1 className="text-4xl font-extrabold text-blue-600 tracking-tight">
          Bé Vui Học - Lớp 2
        </h1>
        <p className="text-gray-500 text-lg">Luyện thi Học sinh giỏi Toán & Tiếng Việt</p>
      </header>

      {loadingError && (
        <div className="bg-red-100 text-red-700 p-4 rounded-xl text-center font-bold">
          {loadingError}
        </div>
      )}

      {/* Warning if Supabase is missing */}
      {!isSupabaseConfigured && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-xl flex items-start gap-3 text-sm">
          <AlertTriangle className="flex-shrink-0" size={20} />
          <div>
            <p className="font-bold">Chưa kết nối dữ liệu</p>
            <p>Vui lòng cấu hình <code>SUPABASE_URL</code> và <code>SUPABASE_ANON_KEY</code> trong file <code>.env</code> để lưu lịch sử học tập.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => handleGenerate(Subject.MATH)}
          className="group relative overflow-hidden bg-white p-6 rounded-3xl shadow-xl border-4 border-blue-100 hover:border-blue-300 transition-all hover:shadow-2xl hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calculator size={100} className="text-blue-500" />
          </div>
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <Calculator size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Toán Nâng Cao</h2>
              <p className="text-gray-500 mt-1">Tư duy logic, hình học...</p>
            </div>
            <Button variant="primary" size="sm">Thử thách ngay</Button>
          </div>
        </button>

        <button 
          onClick={() => handleGenerate(Subject.VIETNAMESE)}
          className="group relative overflow-hidden bg-white p-6 rounded-3xl shadow-xl border-4 border-green-100 hover:border-green-300 transition-all hover:shadow-2xl hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen size={100} className="text-green-500" />
          </div>
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <BookOpen size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Tiếng Việt Khó</h2>
              <p className="text-gray-500 mt-1">Đố vui, câu phức, từ vựng...</p>
            </div>
            <Button variant="success" size="sm">Thử thách ngay</Button>
          </div>
        </button>
      </div>

      <div className="pt-8 border-t border-gray-200 flex-grow">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
            <History className="text-yellow-500" />
            Lịch sử học tập
          </h3>
          {isLoadingHistory && <Loader2 className="animate-spin text-blue-500" size={20} />}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border-2 border-dashed border-gray-300 text-gray-400">
            {isLoadingHistory ? "Đang tải dữ liệu..." : "Bé chưa làm bài tập nào."}
          </div>
        ) : (
          <div className="space-y-4">
            {history.slice(0, 3).map((h, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${h.subject === Subject.MATH ? 'bg-blue-500' : 'bg-green-500'}`}>
                    {h.subject === Subject.MATH ? <Calculator size={20} /> : <BookOpen size={20} />}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">{h.subject}</div>
                    <div className="text-xs text-gray-500">{formatDate(h.date)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-yellow-500">{h.score}<span className="text-sm font-normal text-gray-400">/100</span></div>
                </div>
              </div>
            ))}
            {history.length > 3 && (
               <button 
                onClick={() => setScreen(Screen.HISTORY)}
                className="w-full py-2 text-center text-blue-500 font-bold hover:bg-blue-50 rounded-lg"
               >
                 Xem tất cả
               </button>
            )}
          </div>
        )}
      </div>
      
      {renderFooter()}
    </div>
  );

  const renderTaking = () => {
    if (!currentQuiz) return null;
    const answeredCount = userAnswers.filter(a => a !== -1).length;
    const progress = (answeredCount / currentQuiz.questions.length) * 100;
    const allAnswered = answeredCount === currentQuiz.questions.length;

    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 pb-32">
        {/* Header Sticky */}
        <div className="sticky top-0 z-20 bg-[#f0f9ff]/95 backdrop-blur-sm py-4 border-b border-blue-100 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              {currentQuiz.subject === Subject.MATH ? <Calculator className="text-blue-500" /> : <BookOpen className="text-green-500" />}
              {currentQuiz.subject} (Nâng Cao)
            </h2>
            <div className="font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-sm">
              {answeredCount}/{currentQuiz.questions.length} câu
            </div>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-8">
          {currentQuiz.questions.map((q, qIndex) => (
            <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex gap-4 mb-4">
                <span className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                  {q.id}
                </span>
                <h3 className="text-xl font-bold text-gray-800 pt-1 leading-relaxed">
                  {q.questionText}
                </h3>
              </div>
              
              {/* Image Section */}
              {q.svgImage && (
                <div className="mb-6 flex justify-center bg-gray-50 rounded-xl p-4 border border-gray-100">
                   <div 
                    className="w-full max-w-[300px] h-auto"
                    dangerouslySetInnerHTML={{ __html: q.svgImage }} 
                   />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-0 md:pl-14">
                {q.options.map((opt, optIndex) => {
                  const isSelected = userAnswers[qIndex] === optIndex;
                  return (
                    <button
                      key={optIndex}
                      onClick={() => handleAnswerSelect(qIndex, optIndex)}
                      className={`
                        relative p-4 rounded-xl text-left border-2 transition-all duration-200
                        flex items-center gap-3 group
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-blue-100' 
                          : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <span className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border
                        ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-100 text-gray-500 border-gray-200 group-hover:bg-white'}
                      `}>
                        {['A', 'B', 'C', 'D'][optIndex]}
                      </span>
                      <span className="font-medium text-lg">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Action */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-center z-30">
          <div className="w-full max-w-3xl flex items-center justify-between gap-4">
             <div className="text-sm text-gray-500 hidden sm:block">
               {allAnswered ? "Bé đã làm xong hết rồi!" : "Bé hãy hoàn thành hết câu hỏi nhé!"}
             </div>
             <div className="flex gap-4 w-full sm:w-auto">
               <Button 
                variant="outline" 
                onClick={() => {
                   if(window.confirm("Bé có chắc muốn thoát không? Bài làm sẽ không được lưu.")) {
                     setScreen(Screen.HOME);
                   }
                }}
                className="flex-1 sm:flex-none"
               >
                 Thoát
               </Button>
               <Button 
                 variant={allAnswered ? 'success' : 'secondary'} 
                 onClick={handleSubmit}
                 disabled={!allAnswered}
                 className="flex-1 sm:flex-none"
               >
                 Nộp bài {allAnswered && <CheckCircle2 size={18} />}
               </Button>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!resultData || !currentQuiz) return null;
    
    // Determine feedback
    let feedback = "";
    let color = "";
    if (resultData.score === 100) {
      feedback = "Xuất sắc! Thiên tài tương lai đây rồi!";
      color = "text-yellow-500";
    } else if (resultData.score >= 80) {
      feedback = "Giỏi lắm! Bé nắm bài rất chắc!";
      color = "text-green-500";
    } else if (resultData.score >= 50) {
      feedback = "Bé làm khá tốt, nhưng đề này hơi khó phải không?";
      color = "text-blue-500";
    } else {
      feedback = "Đề nâng cao khó quá! Bé đừng nản nhé!";
      color = "text-gray-600";
    }

    return (
      <div className="max-w-3xl mx-auto p-6 pb-20">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-white mb-8">
          <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-8 text-center text-white relative overflow-hidden">
             {/* Simple visual decor */}
             <div className="absolute top-4 left-4 opacity-20"><Star size={48} /></div>
             <div className="absolute bottom-4 right-4 opacity-20"><Trophy size={64} /></div>
             
             <h2 className="text-3xl font-bold mb-2">Kết quả bài làm</h2>
             <div className="text-6xl font-black mb-2 drop-shadow-md">{resultData.score}</div>
             <p className="text-blue-100 text-lg">Điểm số của bé</p>
          </div>
          <div className="p-8 text-center">
            <h3 className={`text-2xl font-bold mb-2 ${color}`}>{feedback}</h3>
            <div className="flex justify-center gap-8 mt-6 text-gray-600">
               <div className="flex flex-col items-center">
                 <span className="font-bold text-xl">{resultData.score / 5}</span>
                 <span className="text-sm">Câu đúng</span>
               </div>
               <div className="w-px bg-gray-200 h-10"></div>
               <div className="flex flex-col items-center">
                 <span className="font-bold text-xl">{currentQuiz.questions.length - (resultData.score / 5)}</span>
                 <span className="text-sm">Câu sai</span>
               </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <Button variant="outline" onClick={() => setScreen(Screen.HOME)}>
             <Home size={20} /> Về trang chủ
          </Button>
          <Button variant="primary" onClick={() => handleGenerate(currentQuiz.subject)}>
             Làm đề mới <ChevronRight size={20} />
          </Button>
        </div>

        <h3 className="text-xl font-bold text-gray-700 mb-4">Chi tiết bài làm & Lời giải:</h3>
        <div className="space-y-2">
          {currentQuiz.questions.map((q, idx) => (
            <QuizResultCard 
              key={q.id} 
              question={q} 
              userAnswerIndex={userAnswers[idx]} 
            />
          ))}
        </div>
        
        {renderFooter()}
      </div>
    );
  };

  const renderHistory = () => (
    <div className="max-w-2xl mx-auto p-6 flex flex-col min-h-screen">
       <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-4">
            <button onClick={() => setScreen(Screen.HOME)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100">
              <Home className="text-gray-600" />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">Tất cả bài đã làm</h2>
         </div>
       </div>

        {/* Data Management Section */}
       <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
          <h3 className="font-bold text-blue-800 mb-3 text-sm uppercase flex items-center gap-2">
            <Cloud size={16} /> Quản lý dữ liệu Supabase
          </h3>
          {!isSupabaseConfigured && (
             <div className="mb-3 text-xs text-orange-600 bg-orange-100 p-2 rounded">
                Chức năng quản lý bị khóa do chưa cấu hình Supabase.
             </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button 
              onClick={handleExportData}
              className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoadingHistory || !isSupabaseConfigured}
            >
              <Download size={18} /> Sao lưu JSON
            </button>
            
            <button 
              onClick={handleImportClick}
              className="flex items-center justify-center gap-2 bg-white border border-green-200 text-green-600 px-4 py-2 rounded-lg font-bold hover:bg-green-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoadingHistory || !isSupabaseConfigured}
            >
              <Upload size={18} /> Khôi phục & Đẩy lên Cloud
            </button>
            
            <button 
              onClick={handleClearHistory}
              className="flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoadingHistory || !isSupabaseConfigured}
            >
              <Trash2 size={18} /> Xóa Cloud
            </button>
            
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 italic">
            *Dữ liệu được lưu trên đám mây Supabase theo thiết bị này.
          </p>
       </div>

       <div className="space-y-4 flex-grow relative">
         {isLoadingHistory && (
           <div className="absolute inset-0 bg-white/50 z-10 flex items-start justify-center pt-10">
              <Loader2 className="animate-spin text-blue-500" size={32} />
           </div>
         )}

         {!isSupabaseConfigured && history.length === 0 ? (
           <div className="text-center text-gray-400 py-10">
              Chức năng lịch sử tạm thời bị vô hiệu hóa vì chưa có kết nối dữ liệu.
           </div>
         ) : history.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              Chưa có dữ liệu lịch sử nào trên đám mây.
            </div>
         ) : history.map((h, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-xl shadow-lg ${h.subject === Subject.MATH ? 'bg-blue-500 shadow-blue-200' : 'bg-green-500 shadow-green-200'}`}>
                  {h.subject === Subject.MATH ? <Calculator /> : <BookOpen />}
                </div>
                <div>
                  <div className="font-bold text-lg text-gray-800">{h.subject}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock size={14} /> {formatDate(h.date)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-black ${h.score >= 80 ? 'text-green-500' : h.score >= 50 ? 'text-blue-500' : 'text-orange-500'}`}>
                  {h.score}
                </div>
                <div className="text-xs text-gray-400 font-bold">ĐIỂM</div>
              </div>
            </div>
         ))}
       </div>
       
       {renderFooter()}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f9ff]">
      {screen === Screen.HOME && renderHome()}
      {screen === Screen.GENERATING && <LoadingScreen subject={currentQuiz?.subject || Subject.MATH} />}
      {screen === Screen.TAKING && renderTaking()}
      {screen === Screen.RESULT && renderResult()}
      {screen === Screen.HISTORY && renderHistory()}
    </div>
  );
};

export default App;