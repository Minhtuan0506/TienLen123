import React from 'react';
import { Subject } from '../types';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  subject: Subject;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ subject }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-200 rounded-full animate-ping opacity-75"></div>
        <div className="relative bg-white p-6 rounded-full shadow-lg border-4 border-blue-100">
           <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Đang tạo đề {subject}...
      </h2>
      <p className="text-gray-500">
        Bé đợi một chút nhé, thầy giáo AI đang suy nghĩ câu hỏi hay cho bé đó!
      </p>
    </div>
  );
};

export default LoadingScreen;
