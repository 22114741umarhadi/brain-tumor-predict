'use client'

import { useState, useCallback, useEffect } from 'react';
import { Upload, Loader2, ImageIcon, XCircle, Brain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { PredictionResponse, APIError, UploadStatus, ValidationResult } from '@/types';
import Image from 'next/image';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'] as const;

type AcceptedImageType = typeof ACCEPTED_IMAGE_TYPES[number];

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isLoading: false,
    progress: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    // Cleanup preview URL on component unmount
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const validateFile = (file: File): ValidationResult => {
    if (!file) {
      return { isValid: false, error: 'Please select a file' };
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as AcceptedImageType)) {
      return { isValid: false, error: 'Please upload a valid image file (JPEG, PNG, or GIF)' };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { isValid: false, error: 'File size must be less than 5MB' };
    }
    return { isValid: true };
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileSelection = useCallback((file: File): void => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setPredictionResult(null);
  }, [preview, toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    handleFileSelection(file);
  }, [handleFileSelection]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  }, [handleFileSelection]);

  const resetForm = useCallback((): void => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setSelectedFile(null);
    setPreview(null);
    setPredictionResult(null);
    setUploadStatus({ isLoading: false, progress: 0 });
  }, [preview]);

  const updateProgress = useCallback((progress: number): void => {
    setUploadStatus(prev => ({ ...prev, progress: Math.min(progress, 90) }));
  }, []);

  const handleSubmit = async (): Promise<void> => {
    if (!selectedFile) return;

    setUploadStatus({ isLoading: true, progress: 0 });

    const progressInterval = setInterval(() => {
      updateProgress(uploadStatus.progress + 5);
    }, 300);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadStatus(prev => ({ ...prev, progress: 100 }));

      if (!response.ok) {
        const errorData = await response.json() as APIError;
        throw new Error(errorData.message || 'Analysis failed');
      }

      const data = await response.json() as PredictionResponse;
      setPredictionResult(data);

      toast({
        title: "Analysis Complete",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to process the brain scan. Please try again.';
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive"
      });
      setPredictionResult(null);
    } finally {
      setUploadStatus(prev => ({ ...prev, isLoading: false }));
      setTimeout(() => setUploadStatus(prev => ({ ...prev, progress: 0 })), 1000);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4 mb-12">
          <Brain className="w-16 h-16 mx-auto text-blue-600 animate-pulse" />
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Neural Scan Analysis
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Advanced AI-powered brain tumor detection system with real-time analysis
          </p>
        </div>

        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl font-bold text-gray-800">
              Upload Brain Scan
            </CardTitle>
            <CardDescription className="text-gray-600">
              Secure analysis with state-of-the-art neural networks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div
              className="relative group border-2 border-dashed border-gray-200 rounded-2xl p-12 
                         hover:border-blue-400 transition-all duration-300 cursor-pointer
                         bg-gradient-to-br from-white to-gray-50"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              <input
                id="file-upload"
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-blue-50 rounded-full group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-8 h-8 text-blue-500" />
                </div>
                <div className="text-center">
                  <p className="text-gray-700 font-medium">Drop your scan here, or click to browse</p>
                  <p className="text-sm text-gray-500 mt-2">JPEG, PNG, GIF up to 5MB</p>
                </div>
              </div>
            </div>

            {preview && (
              <div className="relative rounded-2xl overflow-hidden shadow-lg">
                <div className="absolute top-4 right-4 z-10">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={resetForm}
                    className="rounded-full shadow-lg hover:scale-105 transition-transform"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
                <Image
                  src={preview}
                  width={500}
                  height={500}
                  alt="Brain scan preview"
                  className="w-full h-72 object-contain bg-black/5 backdrop-blur-sm"
                />
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || uploadStatus.isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 
                         hover:to-purple-600 h-14 rounded-xl shadow-lg transform hover:scale-[1.02] 
                         transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadStatus.isLoading ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Scan...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <Upload className="w-5 h-5" />
                  Begin Analysis
                </span>
              )}
            </Button>

            {uploadStatus.isLoading && (
              <div className="space-y-3">
                <Progress
                  value={uploadStatus.progress}
                  className="h-2 bg-gray-100 rounded-full overflow-hidden"
                />
                <p className="text-sm text-gray-600 text-center animate-pulse">
                  Processing brain scan... {uploadStatus.progress}%
                </p>
              </div>
            )}

            {predictionResult && (
              <Alert
                variant={predictionResult.prediction.includes("No tumor") ? "default" : "destructive"}
                className={`transform transition-all duration-300 shadow-lg ${predictionResult.prediction.includes("No tumor")
                  ? "bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500"
                  : "bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-l-red-500"
                  }`}
              >
                <AlertTitle className="text-lg font-semibold flex items-center gap-3">
                  {predictionResult.prediction.includes("No tumor") ? (
                    "No Tumor Detected"
                  ) : (
                    "Tumor Detected"
                  )}
                </AlertTitle>
                <AlertDescription className="mt-4 space-y-4">
                  <p className="text-sm leading-relaxed">
                    {predictionResult.prediction}
                  </p>
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600">Confidence Level:</span>
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${predictionResult.confidence_class === 1
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                      }`}>
                      {predictionResult.confidence_class === 1 ? "High" : "Low"}
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}