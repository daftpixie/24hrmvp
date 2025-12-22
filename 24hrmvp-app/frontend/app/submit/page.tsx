"use client"

// Force dynamic rendering to prevent static generation at build time
export const dynamic = "force-dynamic";

import ClientOnly from '@/components/ClientOnly'
import Header from '@/components/layout/Header'
import { useState, useRef, ChangeEvent, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// FIXED: Using consistent casing - Button.tsx exists with named export
import { Button } from '@/components/ui/Button'
// FIXED: Using named exports (now available after our fix)
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useRouter } from 'next/navigation'
// FIXED: Import from correct path
import apiClient from '@/lib/api/client'
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Rocket,
  Lightbulb,
  Target,
  Code,
  Calendar,
  BarChart3
} from 'lucide-react'

interface FileWithPreview {
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
}

function SubmitPageContent() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showWarning, setShowWarning] = useState(true)
  const [files, setFiles] = useState<FileWithPreview[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'developer-tools',
    complexity: 'medium',
    targetAudience: '',
    coreFeatures: ['', '', ''], // Start with 3 features
    technicalRequirements: '',
    expectedTimeline: '2-weeks',
    successMetrics: '',
    tags: [] as string[]
  })
  
  // Handlers with explicit typing
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        // Validate file count
        if (files.length + selectedFiles.length > 3) {
            alert("Maximum 3 files allowed");
            return;
        }
        
        const newFiles = selectedFiles.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            type: file.type
        }));
        
        setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
        const newFiles = [...prev];
        URL.revokeObjectURL(newFiles[index].preview);
        newFiles.splice(index, 1);
        return newFiles;
    });
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.coreFeatures];
    newFeatures[index] = value;
    setFormData(prev => ({ ...prev, coreFeatures: newFeatures }));
  };

  const addFeature = () => {
    if (formData.coreFeatures.length < 10) {
        setFormData(prev => ({ ...prev, coreFeatures: [...prev.coreFeatures, ''] }));
    }
  };

  const removeFeature = (index: number) => {
    if (formData.coreFeatures.length > 1) {
        const newFeatures = formData.coreFeatures.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, coreFeatures: newFeatures }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        // Upload files first if any
        const uploadedAttachments: Array<{url: string; filename: string; type: string; size: number}> = [];
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                setUploadProgress(Math.round(((i + 1) / files.length) * 100));
                
                const uploadFormData = new FormData();
                uploadFormData.append('file', files[i].file);
                
                const uploadRes = await apiClient.post<{ url: string }>('/api/upload', uploadFormData);
                if (uploadRes && (uploadRes as any).url) {
                    uploadedAttachments.push({
                        url: (uploadRes as any).url,
                        filename: files[i].name,
                        type: files[i].type,
                        size: files[i].size
                    });
                }
            }
        }

        // Submit idea
        const submissionData = {
            ...formData,
            coreFeatures: formData.coreFeatures.filter(f => f.trim() !== ''),
            fileAttachments: uploadedAttachments
        };

        const res = await apiClient.post<{ idea: { id: string } }>('/api/ideas', submissionData);

        if (res && (res as any).idea) {
            router.push(`/grid/ideas/${(res as any).idea.id}`);
        }
    } catch (error) {
        console.error('Submission failed:', error);
        alert('Failed to submit idea. Please try again.');
    } finally {
        setLoading(false);
        setUploadProgress(0);
    }
  };

  // Categories for dropdown
  const categories = [
    { value: 'developer-tools', label: 'Developer Tools', icon: Code },
    { value: 'ai-ml', label: 'AI/ML', icon: Lightbulb },
    { value: 'web3', label: 'Web3/Blockchain', icon: Target },
    { value: 'social', label: 'Social', icon: MessageCircle },
    { value: 'productivity', label: 'Productivity', icon: BarChart3 },
    { value: 'other', label: 'Other', icon: Rocket }
  ];

  const timelines = [
    { value: '1-week', label: '1 Week' },
    { value: '2-weeks', label: '2 Weeks' },
    { value: '1-month', label: '1 Month' },
    { value: '3-months', label: '3 Months' }
  ];

  const complexities = [
    { value: 'simple', label: 'Simple - Basic CRUD, few features' },
    { value: 'medium', label: 'Medium - Multiple features, some integrations' },
    { value: 'complex', label: 'Complex - Many features, external APIs, advanced logic' }
  ];

  return (
    <div className="min-h-screen bg-[#0B192A]">
      <Header />
      
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-heading text-5xl font-bold text-[#04D9FF] mb-4">
            Submit Your Idea
          </h1>
          <p className="text-[#B0B0B0] text-lg">
            Share your software idea with the community and let them vote!
          </p>
        </motion.div>

        {showWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-4 bg-[#FF5C00]/10 border border-[#FF5C00]/30 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-6 h-6 text-[#FF5C00] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-heading font-bold text-[#FF5C00] mb-1">
                Before you submit
              </h3>
              <p className="text-[#B0B0B0] text-sm">
                Ideas are locked for 24 hours once voting starts. Make sure your description is clear, 
                scope is realistic for an MVP, and you've included all necessary details.
              </p>
            </div>
            <button 
              onClick={() => setShowWarning(false)}
              className="text-[#B0B0B0] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        <Card>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <h2 className="font-heading text-2xl font-semibold text-[#04D9FF] border-b border-white/10 pb-3">
                Basic Information
              </h2>
              
              <Input
                label="Title"
                placeholder="Enter a concise, descriptive title"
                value={formData.title}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                required
              />

              <div className="space-y-2">
                <label className="block text-sm font-heading text-[#04D9FF]">
                  Description
                </label>
                <textarea
                  placeholder="Describe your idea in detail. What problem does it solve? Who is it for?"
                  value={formData.description}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg font-body
                    bg-[rgba(255,255,255,0.05)] text-[#FAFAFA]
                    border-2 border-[rgba(255,255,255,0.1)]
                    focus:bg-[rgba(4,217,255,0.05)] focus:border-[#04D9FF]
                    focus:shadow-[0_0_0_3px_rgba(4,217,255,0.1),0_0_20px_rgba(4,217,255,0.2)]
                    transition-all duration-300
                    placeholder:text-[#808080] placeholder:font-mono placeholder:text-sm
                    resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-heading text-[#04D9FF]">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg font-body
                      bg-[rgba(255,255,255,0.05)] text-[#FAFAFA]
                      border-2 border-[rgba(255,255,255,0.1)]
                      focus:bg-[rgba(4,217,255,0.05)] focus:border-[#04D9FF]
                      transition-all duration-300"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-heading text-[#04D9FF]">
                    Complexity
                  </label>
                  <select
                    value={formData.complexity}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, complexity: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg font-body
                      bg-[rgba(255,255,255,0.05)] text-[#FAFAFA]
                      border-2 border-[rgba(255,255,255,0.1)]
                      focus:bg-[rgba(4,217,255,0.05)] focus:border-[#04D9FF]
                      transition-all duration-300"
                  >
                    {complexities.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-6">
              <h2 className="font-heading text-2xl font-semibold text-[#04D9FF] border-b border-white/10 pb-3">
                Target Audience
              </h2>
              
              <Input
                label="Who is this for?"
                placeholder="e.g., Developers, small businesses, content creators..."
                value={formData.targetAudience}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, targetAudience: e.target.value })}
              />
            </div>

            {/* Core Features */}
            <div className="space-y-6">
              <h2 className="font-heading text-2xl font-semibold text-[#04D9FF] border-b border-white/10 pb-3">
                Core Features
              </h2>
              
              <div className="space-y-4">
                {formData.coreFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-[#04D9FF] font-mono text-sm">{index + 1}.</span>
                    <Input
                      placeholder={`Feature ${index + 1}`}
                      value={feature}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleFeatureChange(index, e.target.value)}
                      className="flex-1"
                    />
                    {formData.coreFeatures.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                
                {formData.coreFeatures.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addFeature}
                    className="w-full"
                  >
                    + Add Feature
                  </Button>
                )}
              </div>
            </div>

            {/* Success Metrics */}
            <div className="space-y-6">
              <h2 className="font-heading text-2xl font-semibold text-[#04D9FF] border-b border-white/10 pb-3">
                Success Metrics
              </h2>
              
              <div className="space-y-2">
                <label className="block text-sm font-heading text-[#04D9FF]">
                  How will you measure success?
                </label>
                <textarea
                  placeholder="e.g., User signups, active usage, revenue, feedback scores..."
                  value={formData.successMetrics}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, successMetrics: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg font-body
                    bg-[rgba(255,255,255,0.05)] text-[#FAFAFA]
                    border-2 border-[rgba(255,255,255,0.1)]
                    focus:bg-[rgba(4,217,255,0.05)] focus:border-[#04D9FF]
                    transition-all duration-300
                    placeholder:text-[#808080] resize-none"
                />
              </div>
            </div>

            {/* File Attachments */}
            <div className="space-y-6">
              <h2 className="font-heading text-2xl font-semibold text-[#04D9FF] border-b border-white/10 pb-3">
                Attachments (Optional)
              </h2>
              
              <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer
                    hover:border-[#04D9FF]/50 hover:bg-[#04D9FF]/5 transition-all"
                >
                  <Upload className="w-12 h-12 text-[#808080] mx-auto mb-4" />
                  <p className="text-[#FAFAFA] font-medium mb-1">Click to upload</p>
                  <p className="text-[#808080] text-sm">PNG, PDF up to 10MB (max 3 files)</p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        {file.type.startsWith('image/') ? (
                          <ImageIcon className="w-5 h-5 text-[#04D9FF]" />
                        ) : (
                          <FileText className="w-5 h-5 text-[#04D9FF]" />
                        )}
                        <span className="text-[#FAFAFA] flex-1 truncate">{file.name}</span>
                        <span className="text-[#808080] text-sm">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-6 border-t border-white/10">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || !formData.title || !formData.description}
                isLoading={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 mr-2" />
                    Submit Idea
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

// Import for MessageCircle used in categories
import { MessageCircle } from 'lucide-react';

export default function SubmitPage() {
  return (
    <ClientOnly fallback={
      <div className="min-h-screen bg-[#0B192A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#04D9FF] animate-spin" />
      </div>
    }>
      <SubmitPageContent />
    </ClientOnly>
  );
}
