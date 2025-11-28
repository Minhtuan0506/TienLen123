import React from 'react';
import { Question } from '../types';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';

interface QuizResultCardProps {
  question: Question;
  userAnswerIndex: number; // -1 if skipped
}

const QuizResultCard: React.FC<QuizResultCardProps> = ({ question, userAnswerIndex }) => {
  const isCorrect = userAnswerIndex === question.correctAnswerIndex;
  const isSkipped = userAnswerIndex === -1;

  return (
    <div className={`p-4 rounded-xl border-2 mb-4 ${isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
      <div className="flex gap-3 mb-3">
        <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold shadow-sm text-white ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
          {question.id}
        </span>
        <h3 className="text-lg font-bold text-gray-800 pt-0.5">{question.questionText}</h3>
      </div>
      
      {question.svgImage && (
        <div className="mb-4 ml-11 max-w-[250px] bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <div 
            className="w-full h-auto"
            dangerouslySetInnerHTML={{ __html: question.svgImage }} 
            />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11 mb-4">
        {question.options.map((opt, idx) => {
          let style = "bg-white border-gray-200 text-gray-600";
          
          if (idx === question.correctAnswerIndex) {
            style = "bg-green-100 border-green-500 text-green-800 font-bold ring-2 ring-green-500/20";
          } else if (idx === userAnswerIndex && !isCorrect) {
            style = "bg-red-100 border-red-500 text-red-800 font-bold opacity-80";
          } else {
             style = "bg-white border-gray-200 text-gray-500";
          }

          return (
            <div 
              key={idx} 
              className={`p-3 rounded-lg border flex items-center justify-between ${style}`}
            >
              <span className="flex items-center gap-2">
                <span className="uppercase font-bold text-sm w-6">{['A', 'B', 'C', 'D'][idx]}.</span>
                {opt}
              </span>
              {idx === question.correctAnswerIndex && <CheckCircle2 size={20} className="text-green-600" />}
              {idx === userAnswerIndex && !isCorrect && <XCircle size={20} className="text-red-500" />}
            </div>
          );
        })}
      </div>
      
      {/* Always show explanation for Advanced Quiz */}
      <div className="ml-11 p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-blue-600 font-bold">
          <Lightbulb size={18} />
          <span>Đáp án & Giải thích:</span>
        </div>
        <div className="text-gray-700 text-sm leading-relaxed">
          <span className="font-bold text-green-700 block mb-1">Đáp án đúng: {['A', 'B', 'C', 'D'][question.correctAnswerIndex]}</span>
          {question.explanation}
        </div>
      </div>
    </div>
  );
};

export default QuizResultCard;