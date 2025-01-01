// types/index.ts

export interface PredictionResponse {
    success: boolean;
    prediction: string;
    confidence_class: number;
    message: string;
}

export interface APIError {
    error: string;
    message: string;
}

export type FileWithPreview = {
    file: File;
    preview: string;
};

export type UploadStatus = {
    isLoading: boolean;
    progress: number;
    error?: string;
};

export type ValidationResult = {
    isValid: boolean;
    error?: string;
};