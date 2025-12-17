// frontend/app/submit/page.tsx
// ENHANCED SUBMISSION PAGE WITH COMPREHENSIVE SPECS AND FILE UPLOAD

'use client';

// Force dynamic rendering (prevent static generation at build time)
export const dynamic = 'force-dynamic';

import ClientOnly from '@/components/ClientOnly';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import Header from '@/components/layout/Header';
import { useState, FormEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { useRouter } from 'next/navigation';

interface FileWithPreview {
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
}

function SubmitPageContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showWarning, setShowWarning] = useState(true);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
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
    tags: [] as string[],
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate file count
    if (files.length + selectedFiles.length > 3) {
      alert('Maximum 3 files allowed');
      return;
    }

    // Validate file types and sizes
    const validFiles: FileWithPreview[] = [];
    for (const file of selectedFiles) {
      // Check file type
      const validTypes = ['application/pdf', 'image/png'];
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Only PDF and PNG allowed.`);
        continue;
      }

      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum 10MB.`);
        continue;
      }

      // Create preview for PNG
      const preview = file.type === 'image/png'
        ? URL.createObjectURL(file)
        : '/icons/pdf-icon.svg';

      validFiles.push({
        file,
        preview,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    setFiles([...files, ...validFiles]);
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    // Revoke object URL to prevent memory leak
    if (newFiles[index].type === 'image/png') {
      URL.revokeObjectURL(newFiles[index].preview);
    }
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const addFeatureField = () => {
    if (formData.coreFeatures.length < 10) {
      setFormData({
        ...formData,
        coreFeatures: [...formData.coreFeatures, ''],
      });
    }
  };

  const removeFeatureField = (index: number) => {
    if (formData.coreFeatures.length > 3) {
      const newFeatures = [...formData.coreFeatures];
      newFeatures.splice(index, 1);
      setFormData({ ...formData, coreFeatures: newFeatures });
    }
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...formData.coreFeatures];
    newFeatures[index] = value;
    setFormData({ ...formData, coreFeatures: newFeatures });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUploadProgress(0);

    try {
      // Validate core features (at least 3 non-empty)
      const validFeatures = formData.coreFeatures.filter(f => f.trim().length > 0);
      if (validFeatures.length < 3) {
        alert('Please specify at least 3 core features');
        setLoading(false);
        return;
      }

      // Create FormData for multipart upload
      const submitData = new FormData();
      
      // Add JSON data
      const ideaData = {
        ...formData,
        coreFeatures: validFeatures,
      };
      submitData.append('data', JSON.stringify(ideaData));

      // Add files
      files.forEach((fileObj) => {
        submitData.append('attachments', fileObj.file);
      });

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const token = localStorage.getItem('farcaster_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ideas/enhanced`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (data.success) {
        // Show success message
        alert(data.message || 'Idea submitted successfully!');
        router.push('/vote');
      } else {
        alert(data.message || data.error || 'Failed to submit idea');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit idea. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-6 py-12 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-heading text-5xl font-bold text-[--neon-cyan] mb-4">
          Submit Your Idea
        </h1>
        <p className="text-[--text-secondary] text-lg">
          Share your software idea with the community and let them vote!
        </p>
      </motion.div>

      {/* Warning Banner */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-[rgba(255,92,0,0.1)] border border-[#FF5C00]/30 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[#FF5C00] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-[--text-primary] mb-1">
                  Provide Detailed Specifications
                </h3>
                <p className="text-sm text-[--text-secondary]">
                  The more details you provide, the better Claude can build your MVP. Include wireframes, technical requirements, and clear feature descriptions.
                </p>
              </div>
              <button
                onClick={() => setShowWarning(false)}
                className="text-[--text-tertiary] hover:text-[--text-primary] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h2 className="font-heading text-2xl font-semibold text-[--neon-cyan] border-b border-white/10 pb-3">
              Basic Information
            </h2>

            <div>
              <label className="block text-sm font-heading text-[--neon-cyan] mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g., AI-powered Task Management for Remote Teams"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                minLength={10}
                maxLength={200}
              />
              <p className="text-xs text-[--text-tertiary] mt-1">
                {formData.title.length}/200 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-heading text-[--neon-cyan] mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-lg font-body bg-[rgba(255,255,255,0.05)] text-[--text-primary] border-2 border-[rgba(255,255,255,0.1)] focus:bg-[rgba(4,217,255,0.05)] focus:border-[--neon-cyan] focus:shadow-[0_0_0_3px_rgba(4,217,255,0.1),0_0_20px_rgba(4,217,255,0.2)] transition-all duration-300 min-h-32 resize-y"
                placeholder="Describe your idea in detail. What problem does it solve? Who is it for? What makes it unique?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                minLength={50}
                maxLength={2000}
              />
              <p className="text-xs text-[--text-tertiary] mt-1">
                {formData.description.length}/2000 characters (minimum 50)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-heading text-[--neon-cyan] mb-2">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full px-4 py-2 rounded-lg font-body bg-[rgba(255,255,255,0.05)] text-[--text-primary] border-2 border-[rgba(255,255,255,0.1)] focus:bg-[rgba(4,217,255,0.05)] focus:border-[--neon-cyan] transition-all"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="developer-tools">Developer Tools</option>
                  <option value="productivity">Productivity</option>
                  <option value="social">Social & Community</option>
                  <option value="commerce">E-commerce</option>
                  <option value="education">Education</option>
                  <option value="health">Health & Fitness</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="finance">Finance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-heading text-[--neon-cyan] mb-2">
                  Complexity <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full px-4 py-2 rounded-lg font-body bg-[rgba(255,255,255,0.05)] text-[--text-primary] border-2 border-[rgba(255,255,255,0.1)] focus:bg-[rgba(4,217,255,0.05)] focus:border-[--neon-cyan] transition-all"
                  value={formData.complexity}
                  onChange={(e) => setFormData({ ...formData, complexity: e.target.value })}
                  required
                >
                  <option value="simple">Simple (Basic CRUD)</option>
                  <option value="medium">Medium (Multiple features)</option>
                  <option value="complex">Complex (Advanced integrations)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-heading text-[--neon-cyan] mb-2">
                Target Audience <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g., Startup founders, remote teams, freelancers"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                required
                minLength={5}
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-heading text-[--neon-cyan] mb-2">
                Expected Timeline <span className="text-red-400">*</span>
              </label>
              <select
                className="w-full px-4 py-2 rounded-lg font-body bg-[rgba(255,255,255,0.05)] text-[--text-primary] border-2 border-[rgba(255,255,255,0.1)] focus:bg-[rgba(4,217,255,0.05)] focus:border-[--neon-cyan] transition-all"
                value={formData.expectedTimeline}
                onChange={(e) => setFormData({ ...formData, expectedTimeline: e.target.value })}
                required
              >
                <option value="1-week">1 Week</option>
                <option value="2-weeks">2 Weeks</option>
                <option value="1-month">1 Month</option>
                <option value="2-months">2 Months</option>
                <option value="3-months">3+ Months</option>
              </select>
            </div>
          </div>

          {/* Core Features */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-heading text-2xl font-semibold text-[--neon-cyan]">
                Core Features <span className="text-red-400">*</span>
              </h2>
              <button
                type="button"
                onClick={addFeatureField}
                disabled={formData.coreFeatures.length >= 10}
                className="px-3 py-1 text-sm bg-[rgba(4,217,255,0.1)] hover:bg-[rgba(4,217,255,0.2)] text-[--neon-cyan] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add Feature
              </button>
            </div>

            <div className="space-y-3">
              {formData.coreFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-[--text-tertiary] font-mono text-sm w-8">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    placeholder={`Feature ${index + 1} (e.g., Real-time collaboration)`}
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    required={index < 3}
                    minLength={5}
                    maxLength={200}
                    className="flex-1 px-4 py-2 rounded-lg font-body bg-[rgba(255,255,255,0.05)] text-[--text-primary] border-2 border-[rgba(255,255,255,0.1)] focus:bg-[rgba(4,217,255,0.05)] focus:border-[--neon-cyan] transition-all"
                  />
                  {index >= 3 && (
                    <button
                      type="button"
                      onClick={() => removeFeatureField(index)}
                      className="p-2 text-[--text-tertiary] hover:text-red-400 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-[--text-tertiary]">
              * At least 3 core features required. Up to 10 features allowed.
            </p>
          </div>

          {/* Technical Requirements */}
          <div className="space-y-6">
            <h2 className="font-heading text-2xl font-semibold text-[--neon-cyan] border-b border-white/10 pb-3">
              Technical Details
            </h2>

            <div>
              <label className="block text-sm font-heading text-[--neon-cyan] mb-2">
                Technical Requirements (Optional)
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-lg font-body bg-[rgba(255,255,255,0.05)] text-[--text-primary] border-2 border-[rgba(255,255,255,0.1)] focus:bg-[rgba(4,217,255,0.05)] focus:border-[--neon-cyan] focus:shadow-[0_0_0_3px_rgba(4,217,255,0.1),0_0_20px_rgba(4,217,255,0.2)] transition-all duration-300 min-h-24 resize-y"
                placeholder="Tech stack, APIs, databases, third-party services, etc."
                value={formData.technicalRequirements}
                onChange={(e) => setFormData({ ...formData, technicalRequirements: e.target.value })}
                maxLength={1000}
              />
            </div>

            <div>
              <label className="block text-sm font-heading text-[--neon-cyan] mb-2">
                Success Metrics (Optional)
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-lg font-body bg-[rgba(255,255,255,0.05)] text-[--text-primary] border-2 border-[rgba(255,255,255,0.1)] focus:bg-[rgba(4,217,255,0.05)] focus:border-[--neon-cyan] focus:shadow-[0_0_0_3px_rgba(4,217,255,0.1),0_0_20px_rgba(4,217,255,0.2)] transition-all duration-300 min-h-20 resize-y"
                placeholder="How will you measure success? User acquisition, engagement, revenue, etc."
                value={formData.successMetrics}
                onChange={(e) => setFormData({ ...formData, successMetrics: e.target.value })}
                maxLength={500}
              />
            </div>
          </div>

          {/* File Attachments */}
          <div className="space-y-6">
            <h2 className="font-heading text-2xl font-semibold text-[--neon-cyan] border-b border-white/10 pb-3">
              Drawings & Wireframes
            </h2>

            <div>
              <p className="text-sm text-[--text-secondary] mb-4">
                Upload drawings, wireframes, or mockups (max 3 files, PDF or PNG only, 10MB each)
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= 3}
                className="w-full p-8 border-2 border-dashed border-[rgba(255,255,255,0.2)] hover:border-[--neon-cyan] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex flex-col items-center gap-3">
                  <svg className="w-12 h-12 text-[--text-tertiary]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div className="text-center">
                    <p className="text-[--text-primary] font-semibold mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-[--text-tertiary] text-sm">
                      PDF or PNG (max 10MB each)
                    </p>
                  </div>
                </div>
              </button>

              {/* File previews */}
              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {files.map((fileObj, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative p-4 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg group"
                    >
                      {fileObj.type === 'image/png' ? (
                        <img src={fileObj.preview} alt={fileObj.name} className="w-full h-32 object-cover rounded mb-2" />
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center bg-[rgba(255,92,0,0.1)] rounded mb-2">
                          <svg className="w-16 h-16 text-[#FF5C00]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <p className="text-sm font-medium text-[--text-primary] truncate mb-1">
                        {fileObj.name}
                      </p>
                      <p className="text-xs text-[--text-tertiary]">
                        {(fileObj.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {loading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[--text-secondary]">Uploading...</span>
                <span className="text-[--neon-cyan]">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[--neon-cyan] to-[--neon-purple]"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-6 border-t border-white/10">
            <Button variant="chrome" type="submit" disabled={loading} className="w-full">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Idea 🚀'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
    </>
  );
}

export default function SubmitPage() {
  return (
    <ClientOnly fallback={<LoadingSkeleton />}>
      <SubmitPageContent />
    </ClientOnly>
  );
}
