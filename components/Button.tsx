import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "font-bold rounded-2xl transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-200",
    secondary: "bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-yellow-200",
    success: "bg-green-500 hover:bg-green-600 text-white shadow-green-200",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-red-200",
    outline: "bg-white border-2 border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-500"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-xl",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
