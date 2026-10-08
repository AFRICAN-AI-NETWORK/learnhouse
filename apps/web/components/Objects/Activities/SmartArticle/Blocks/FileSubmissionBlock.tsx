'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { UploadCloud, File, X, CheckCircle2 } from 'lucide-react'

interface FileSubmissionBlockProps {
  step: any
}

export default function FileSubmissionBlock({
  step,
}: FileSubmissionBlockProps) {
  const instructions = step.content || step.text || 'Please upload your file.'

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = () => {
    if (!selectedFile) return
    setIsUploading(true)
    // Simulate upload delay
    setTimeout(() => {
      setIsUploading(false)
      setIsSubmitted(true)
    }, 1500)
  }

  return (
    <div className="w-full max-w-3xl py-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2 leading-relaxed">
          {instructions}
        </h3>
        <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest flex items-center">
          <UploadCloud size={14} className="mr-2" /> File Submission
        </p>
      </div>

      {!isSubmitted ? (
        <div className="space-y-4">
          {!selectedFile ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/[0.02] hover:border-primary/50 transition-all nice-shadow group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform group-hover:bg-primary/10">
                  <UploadCloud
                    size={24}
                    className="text-zinc-400 group-hover:text-primary transition-colors"
                  />
                </div>
                <p className="mb-2 text-sm text-zinc-300 font-semibold group-hover:text-white">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-zinc-500 font-medium">
                  PDF, DOCX, ZIP, MP4 (MAX. 50MB)
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between p-5 rounded-2xl border border-primary/30 bg-primary/5 nice-shadow">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <File size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                disabled={isUploading}
              >
                <X size={18} />
              </button>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className={`flex items-center px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.15em] transition-all nice-shadow ${
                !selectedFile || isUploading
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:scale-[1.02] shadow-[0_10px_30px_rgba(var(--primary),0.3)]'
              }`}
            >
              {isUploading ? (
                <span className="flex items-center">
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center">
                  Submit File
                  <UploadCloud size={14} className="ml-2" />
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl border border-green-500/20 bg-green-500/5 flex flex-col items-center justify-center text-center space-y-3 nice-shadow"
        >
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="font-bold text-green-400 text-lg">
              Submission Successful
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              Your file has been uploaded and will be reviewed by the
              instructor.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
