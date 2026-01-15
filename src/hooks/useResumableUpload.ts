import { useState, useRef, useCallback, useEffect } from "react";
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const UPLOAD_STATE_KEY = "resumable_upload_state";
const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks

interface UploadState {
  fileId: string;
  fileName: string;
  fileSize: number;
  videoPath: string;
  uploadUrl?: string;
  bytesUploaded: number;
  createdAt: number;
}

interface UseResumableUploadOptions {
  onProgress?: (progress: number, bytesUploaded: number, bytesTotal: number) => void;
  onSuccess?: (videoPath: string) => void;
  onError?: (error: Error) => void;
}

const generateFileId = (file: File, userId: string): string => {
  return `${userId}-${file.name}-${file.size}-${file.lastModified}`;
};

const saveUploadState = (state: UploadState) => {
  try {
    localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save upload state to localStorage:", e);
  }
};

const getUploadState = (): UploadState | null => {
  try {
    const state = localStorage.getItem(UPLOAD_STATE_KEY);
    if (!state) return null;
    
    const parsed = JSON.parse(state) as UploadState;
    // Expire after 24 hours
    if (Date.now() - parsed.createdAt > 24 * 60 * 60 * 1000) {
      clearUploadState();
      return null;
    }
    return parsed;
  } catch (e) {
    console.warn("Failed to get upload state from localStorage:", e);
    return null;
  }
};

const clearUploadState = () => {
  try {
    localStorage.removeItem(UPLOAD_STATE_KEY);
  } catch (e) {
    console.warn("Failed to clear upload state from localStorage:", e);
  }
};

export const useResumableUpload = (options: UseResumableUploadOptions = {}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bytesUploaded, setBytesUploaded] = useState(0);
  const [bytesTotal, setBytesTotal] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [canResume, setCanResume] = useState(false);
  const [resumableState, setResumableState] = useState<UploadState | null>(null);
  
  const uploadRef = useRef<tus.Upload | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check for existing resumable upload on mount
  useEffect(() => {
    const existingState = getUploadState();
    if (existingState) {
      setResumableState(existingState);
      setCanResume(true);
      setBytesUploaded(existingState.bytesUploaded);
      setBytesTotal(existingState.fileSize);
      setProgress(Math.round((existingState.bytesUploaded / existingState.fileSize) * 100));
    }
  }, []);

  const startUpload = useCallback(async (
    file: File,
    userId: string,
    customPath?: string
  ): Promise<string> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    
    if (!accessToken) {
      throw new Error("인증 세션이 만료되었습니다. 다시 로그인해주세요.");
    }

    const fileId = generateFileId(file, userId);
    const videoPath = customPath || `${userId}/${Date.now()}-${file.name}`;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    setUploading(true);
    setProgress(0);
    setBytesUploaded(0);
    setBytesTotal(file.size);
    setIsPaused(false);

    // Save initial state
    const uploadState: UploadState = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      videoPath,
      bytesUploaded: 0,
      createdAt: Date.now(),
    };
    saveUploadState(uploadState);
    setResumableState(uploadState);

    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
        retryDelays: [0, 1000, 3000, 5000],
        headers: {
          authorization: `Bearer ${accessToken}`,
          "x-upsert": "true",
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: CHUNK_SIZE,
        metadata: {
          bucketName: "videos",
          objectName: videoPath,
          contentType: file.type,
          cacheControl: "3600",
        },
        onError: (error) => {
          console.error("Upload error:", error);
          setUploading(false);
          setCanResume(true);
          
          // Update state with current progress
          const currentState = getUploadState();
          if (currentState) {
            saveUploadState({
              ...currentState,
              bytesUploaded: bytesUploaded,
            });
          }
          
          options.onError?.(error);
          reject(error);
        },
        onProgress: (uploaded, total) => {
          const progressPercent = Math.round((uploaded / total) * 100);
          setProgress(progressPercent);
          setBytesUploaded(uploaded);
          setBytesTotal(total);
          
          // Update saved state periodically (every 10%)
          if (progressPercent % 10 === 0) {
            const currentState = getUploadState();
            if (currentState) {
              saveUploadState({
                ...currentState,
                bytesUploaded: uploaded,
              });
            }
          }
          
          options.onProgress?.(progressPercent, uploaded, total);
        },
        onSuccess: () => {
          setUploading(false);
          setProgress(100);
          setCanResume(false);
          clearUploadState();
          setResumableState(null);
          options.onSuccess?.(videoPath);
          resolve(videoPath);
        },
      });

      uploadRef.current = upload;

      // Check for previous uploads
      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length > 0) {
          // Resume from the first previous upload
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      });
    });
  }, [options, bytesUploaded]);

  const resumeUpload = useCallback(async (file: File): Promise<string> => {
    const savedState = getUploadState();
    if (!savedState) {
      throw new Error("재개할 수 있는 업로드가 없습니다.");
    }

    // Verify the file matches
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    if (!userId) {
      throw new Error("인증 세션이 만료되었습니다. 다시 로그인해주세요.");
    }

    const fileId = generateFileId(file, userId);
    if (fileId !== savedState.fileId) {
      throw new Error("선택한 파일이 이전 업로드와 일치하지 않습니다.");
    }

    setCanResume(false);
    return startUpload(file, userId, savedState.videoPath);
  }, [startUpload]);

  const pauseUpload = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort();
      setIsPaused(true);
      setUploading(false);
      setCanResume(true);
      
      // Save current state
      const currentState = getUploadState();
      if (currentState) {
        saveUploadState({
          ...currentState,
          bytesUploaded: bytesUploaded,
        });
      }
    }
  }, [bytesUploaded]);

  const cancelUpload = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort();
      uploadRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setUploading(false);
    setProgress(0);
    setBytesUploaded(0);
    setBytesTotal(0);
    setIsPaused(false);
    setCanResume(false);
    clearUploadState();
    setResumableState(null);
  }, []);

  const clearResumableUpload = useCallback(() => {
    clearUploadState();
    setCanResume(false);
    setResumableState(null);
    setProgress(0);
    setBytesUploaded(0);
    setBytesTotal(0);
  }, []);

  return {
    uploading,
    progress,
    bytesUploaded,
    bytesTotal,
    isPaused,
    canResume,
    resumableState,
    startUpload,
    resumeUpload,
    pauseUpload,
    cancelUpload,
    clearResumableUpload,
  };
};
