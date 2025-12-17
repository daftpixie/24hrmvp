// frontend/components/vote/IdeaCard.tsx
// ENHANCED IDEA CARD WITH FULL DETAILS AND VOTING

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ThumbsUp, 
  Users, 
  Calendar, 
  Target, 
  Code, 
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  Image as ImageIcon,
  Zap
} from 'lucide-react';

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  complexity: string;
  voteCount: number;
  
  // Enhanced fields
  targetAudience?: string;
  coreFeatures?: string[];
  technicalRequirements?: string;
  expectedTimeline?: string;
  successMetrics?: string;
  fileAttachments?: Array<{
    filename: string;
    url: string;
    type: string;
    size: number;
  }>;
  fileCount: number;
  isPremiumBoosted: boolean;
  boostLevel: number;
  
  // Author info
  submittedBy: {
    username: string;
    displayName?: string;
    pfpUrl?: string;
  };
  
  createdAt: string;
  hasVoted?: boolean;
}

interface IdeaCardProps {
  idea: Idea;
  onVote?: (ideaId: string) => void;
  voting?: boolean;
  rank?: number;
  totalVotes?: number;
}

export default function IdeaCard({
  idea,
  onVote,
  voting = false,
  rank,
  totalVotes = 0,
}: IdeaCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const votePercentage = totalVotes > 0 
    ? ((idea.voteCount / totalVotes) * 100).toFixed(1)
    : '0.0';

  const getComplexityColor = (complexity: string) => {
    switch (complexity.toLowerCase()) {
      case 'easy':
        return 'text-green-400 bg-green-400/10';
      case 'medium':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'hard':
        return 'text-[--neon-orange] bg-[rgba(255,92,0,0.1)]';
      default:
        return 'text-[--text-secondary] bg-[rgba(255,255,255,0.05)]';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'developer-tools':
      case 'dev-tools':
        return <Code className="w-4 h-4" />;
      case 'social':
        return <Users className="w-4 h-4" />;
      case 'web3':
        return <Zap className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="relative"
    >
      {/* Premium Boost Badge */}
      {idea.isPremiumBoosted && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-[--neon-orange] to-[--neon-pink] rounded-full text-xs font-bold text-white shadow-[0_0_20px_rgba(251,72,196,0.5)]">
            <Zap className="w-3 h-3" />
            BOOSTED
          </div>
        </div>
      )}

      {/* Rank Badge */}
      {rank !== undefined && (
        <div className="absolute -top-3 -left-3 z-10">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-heading font-bold text-lg ${
            rank === 1
              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-[0_0_30px_rgba(250,204,21,0.6)]'
              : rank === 2
              ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-[0_0_20px_rgba(209,213,219,0.4)]'
              : rank === 3
              ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-[0_0_20px_rgba(251,146,60,0.4)]'
              : 'bg-[rgba(255,255,255,0.1)] text-[--text-primary]'
          }`}>
            #{rank}
          </div>
        </div>
      )}

      <div className={`p-6 bg-gradient-to-br from-[rgba(255,255,255,0.05)] to-[rgba(4,217,255,0.05)] border-2 rounded-xl transition-all duration-300 ${
        idea.isPremiumBoosted
          ? 'border-[--neon-pink] shadow-[0_0_30px_rgba(251,72,196,0.3)]'
          : 'border-[rgba(4,217,255,0.2)] hover:border-[rgba(4,217,255,0.4)]'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-heading font-bold text-[--text-primary] mb-2 hover:text-[--neon-cyan] transition-colors cursor-pointer">
              {idea.title}
            </h3>
            
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {/* Category */}
              <span className="flex items-center gap-1 px-2 py-1 bg-[rgba(4,217,255,0.1)] text-[--neon-cyan] rounded">
                {getCategoryIcon(idea.category)}
                {idea.category}
              </span>

              {/* Complexity */}
              <span className={`px-2 py-1 rounded ${getComplexityColor(idea.complexity)}`}>
                {idea.complexity}
              </span>

              {/* File Attachments */}
              {idea.fileCount > 0 && (
                <span className="flex items-center gap-1 text-[--text-tertiary]">
                  <FileText className="w-4 h-4" />
                  {idea.fileCount} {idea.fileCount === 1 ? 'file' : 'files'}
                </span>
              )}
            </div>
          </div>

          {/* Vote Count */}
          <div className="flex flex-col items-end">
            <div className="text-3xl font-heading font-bold text-[--neon-cyan]">
              {idea.voteCount}
            </div>
            <div className="text-xs text-[--text-tertiary]">
              {idea.voteCount === 1 ? 'vote' : 'votes'}
            </div>
            {totalVotes > 0 && (
              <div className="text-xs text-[--text-secondary] mt-1">
                {votePercentage}%
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-[--text-secondary] mb-4 line-clamp-2">
          {idea.description}
        </p>

        {/* Enhanced Details (Collapsed) */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 mb-4 pt-4 border-t border-[rgba(4,217,255,0.2)]"
          >
            {/* Target Audience */}
            {idea.targetAudience && (
              <div>
                <div className="flex items-center gap-2 text-sm font-heading text-[--neon-cyan] mb-2">
                  <Users className="w-4 h-4" />
                  Target Audience
                </div>
                <p className="text-sm text-[--text-secondary] pl-6">
                  {idea.targetAudience}
                </p>
              </div>
            )}

            {/* Core Features */}
            {idea.coreFeatures && idea.coreFeatures.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm font-heading text-[--neon-cyan] mb-2">
                  <Target className="w-4 h-4" />
                  Core Features
                </div>
                <ul className="space-y-1 pl-6">
                  {idea.coreFeatures.map((feature, idx) => (
                    feature && (
                      <li key={idx} className="text-sm text-[--text-secondary] list-disc">
                        {feature}
                      </li>
                    )
                  ))}
                </ul>
              </div>
            )}

            {/* Technical Requirements */}
            {idea.technicalRequirements && (
              <div>
                <div className="flex items-center gap-2 text-sm font-heading text-[--neon-cyan] mb-2">
                  <Code className="w-4 h-4" />
                  Technical Requirements
                </div>
                <p className="text-sm text-[--text-secondary] pl-6">
                  {idea.technicalRequirements}
                </p>
              </div>
            )}

            {/* Expected Timeline */}
            {idea.expectedTimeline && (
              <div>
                <div className="flex items-center gap-2 text-sm font-heading text-[--neon-cyan] mb-2">
                  <Calendar className="w-4 h-4" />
                  Expected Timeline
                </div>
                <p className="text-sm text-[--text-secondary] pl-6">
                  {idea.expectedTimeline}
                </p>
              </div>
            )}

            {/* Success Metrics */}
            {idea.successMetrics && (
              <div>
                <div className="flex items-center gap-2 text-sm font-heading text-[--neon-cyan] mb-2">
                  <TrendingUp className="w-4 h-4" />
                  Success Metrics
                </div>
                <p className="text-sm text-[--text-secondary] pl-6">
                  {idea.successMetrics}
                </p>
              </div>
            )}

            {/* File Attachments */}
            {idea.fileAttachments && idea.fileAttachments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm font-heading text-[--neon-cyan] mb-2">
                  <FileText className="w-4 h-4" />
                  Attachments
                </div>
                <div className="grid grid-cols-2 gap-2 pl-6">
                  {idea.fileAttachments.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded hover:border-[--neon-cyan] transition-colors"
                    >
                      {file.type === 'image/png' ? (
                        <ImageIcon className="w-4 h-4 text-[--neon-cyan]" />
                      ) : (
                        <FileText className="w-4 h-4 text-[--neon-cyan]" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[--text-primary] truncate">
                          {file.filename}
                        </div>
                        <div className="text-xs text-[--text-tertiary]">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <Download className="w-3 h-3 text-[--text-tertiary]" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[rgba(4,217,255,0.1)]">
          {/* Author */}
          <div className="flex items-center gap-2">
            {idea.submittedBy.pfpUrl && (
              <img
                src={idea.submittedBy.pfpUrl}
                alt={idea.submittedBy.username}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-sm text-[--text-tertiary]">
              by <span className="text-[--text-primary]">{idea.submittedBy.displayName || idea.submittedBy.username}</span>
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Expand/Collapse */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-1 text-sm text-[--text-secondary] hover:text-[--neon-cyan] transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4 inline" /> Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 inline" /> More
                </>
              )}
            </button>

            {/* Vote Button */}
            {onVote && (
              <button
                onClick={() => onVote(idea.id)}
                disabled={voting || idea.hasVoted}
                className={`px-4 py-2 rounded-lg font-heading font-bold text-sm transition-all duration-300 ${
                  idea.hasVoted
                    ? 'bg-[rgba(255,255,255,0.1)] text-[--text-tertiary] cursor-not-allowed'
                    : 'bg-gradient-to-r from-[--neon-cyan] to-[--neon-blue] text-[--bg-primary] hover:shadow-[0_0_20px_rgba(4,217,255,0.5)]'
                }`}
              >
                {idea.hasVoted ? (
                  <>
                    <ThumbsUp className="w-4 h-4 inline mr-1" /> Voted
                  </>
                ) : voting ? (
                  'Voting...'
                ) : (
                  <>
                    <ThumbsUp className="w-4 h-4 inline mr-1" /> Vote
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
