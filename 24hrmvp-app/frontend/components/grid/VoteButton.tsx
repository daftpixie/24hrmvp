'use client';

import React, { useState } from 'react';

interface VoteButtonProps {
  postId: string;
  score: number;
  userVote: 1 | -1 | null;
  onVote: (postId: string, value: 1 | -1) => Promise<any>;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

export function VoteButton({
  postId,
  score: initialScore,
  userVote: initialUserVote,
  onVote,
  size = 'md',
  orientation = 'vertical',
}: VoteButtonProps) {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState<1 | -1 | null>(initialUserVote);
  const [isLoading, setIsLoading] = useState(false);

  const sizeClasses = {
    sm: 'text-sm p-1',
    md: 'text-base p-2',
    lg: 'text-lg p-3',
  };

  const handleVote = async (value: 1 | -1) => {
    if (isLoading) return;
    setIsLoading(true);
    
    const previousScore = score;
    const previousVote = userVote;
    
    let newScore: number;
    let newUserVote: 1 | -1 | null;

    if (userVote === value) {
      newScore = score - value;
      newUserVote = null;
    } else if (userVote !== null) {
      newScore = score - userVote + value;
      newUserVote = value;
    } else {
      newScore = score + value;
      newUserVote = value;
    }

    setScore(newScore);
    setUserVote(newUserVote);

    try {
      await onVote(postId, value);
    } catch (error) {
      setScore(previousScore);
      setUserVote(previousVote);
      console.error('Vote failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const containerClass = orientation === 'vertical' 
    ? 'flex flex-col items-center gap-1'
    : 'flex items-center gap-2';

  return (
    <div className={containerClass}>
      <button
        onClick={() => handleVote(1)}
        disabled={isLoading}
        className={`${sizeClasses[size]} rounded transition-all duration-200 ${userVote === 1 ? 'text-cyan-400 bg-cyan-400/20' : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10'} disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label="Upvote"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      <span className={`font-mono font-bold ${score > 0 ? 'text-cyan-400' : score < 0 ? 'text-orange-400' : 'text-gray-400'} ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'}`}>
        {score}
      </span>
      
      <button
        onClick={() => handleVote(-1)}
        disabled={isLoading}
        className={`${sizeClasses[size]} rounded transition-all duration-200 ${userVote === -1 ? 'text-orange-400 bg-orange-400/20' : 'text-gray-400 hover:text-orange-400 hover:bg-orange-400/10'} disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label="Downvote"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

export default VoteButton;
