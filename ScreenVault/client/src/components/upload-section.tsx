import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { OcrResult, StructuredData } from "@shared/schema";

interface UploadSectionProps {
  onUploadStart: (fileCount: number) => void;
  onProgress: (percentage: number, status: string) => void;
  onComplete: (results: OcrResult[], structuredData: StructuredData[], processedFiles: number, totalFiles: number) => void;
  onError: (error: string) => void;
}

export default function UploadSection({ onUploadStart, onProgress, onComplete, onError }: UploadSectionProps) {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const processFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Simulate progress updates
      onProgress(10, "Subiendo archivos...");
      
      const response = await fetch("/api/process-files", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error procesando archivos");
      }

      onProgress(50, "Procesando con OCR...");
      
      const result = await response.json();
      
      onProgress(90, "Finalizando...");
      
      return result;
    },
    onSuccess: (data) => {
      onProgress(100, "Completado");
      const hasStructuredData = data.structuredData && data.structuredData.length > 0;
      toast({
        title: "Procesamiento completado",
        description: hasStructuredData 
          ? `Se procesaron ${data.processedFiles} archivos y se detectaron ${data.structuredData.length} tabla(s) estructurada(s)`
          : `Se procesaron ${data.processedFiles} de ${data.totalFiles} archivos correctamente`,
      });
      onComplete(data.results, data.structuredData || [], data.processedFiles, data.totalFiles);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast({
        title: "Error en el procesamiento",
        description: errorMessage,
        variant: "destructive",
      });
      onError(errorMessage);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      const isValidType = ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== acceptedFiles.length) {
      toast({
        title: "Algunos archivos fueron rechazados",
        description: "Solo se permiten archivos PNG, JPG y JPEG de hasta 10MB",
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      onUploadStart(validFiles.length);
      processFilesMutation.mutate(validFiles);
    }
  }, [processFilesMutation, toast, onUploadStart]);

  const { getRootProps: getSingleRootProps, getInputProps: getSingleInputProps, isDragActive: isSingleDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024,
  });

  const { getRootProps: getMultipleRootProps, getInputProps: getMultipleInputProps, isDragActive: isMultipleDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    multiple: true,
    maxFiles: 50,
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div className="space-y-8 animate-fade-in" data-testid="upload-section">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4" data-testid="text-hero-title">
          Extrae texto de tus capturas de pantalla
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto" data-testid="text-hero-description">
          Sube una imagen o múltiples capturas y obtén los datos en formato CSV o JSON. 
          Sin registro necesario, procesamiento rápido y resultados precisos.
        </p>
      </div>

      {/* Upload Options */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Single File Upload */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-300 hover:border-brand-blue transition-colors duration-300 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-image text-2xl text-brand-blue"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2" data-testid="text-single-upload-title">
              Subir una imagen
            </h3>
            <p className="text-gray-600 mb-6" data-testid="text-single-upload-description">
              Arrastra y suelta o haz clic para seleccionar una captura de pantalla
            </p>
            
            <div 
              {...getSingleRootProps()} 
              className={`cursor-pointer border-2 border-dashed rounded-lg p-8 transition-all duration-300 ${
                isSingleDragActive 
                  ? 'border-brand-blue bg-blue-50' 
                  : 'border-gray-300 hover:border-brand-blue hover:bg-blue-50'
              }`}
              data-testid="dropzone-single"
            >
              <input {...getSingleInputProps()} data-testid="input-single-file" />
              <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-3"></i>
              <p className="text-gray-600 font-medium">Formatos soportados: PNG, JPG, JPEG</p>
              <p className="text-sm text-gray-500 mt-2">Tamaño máximo: 10MB</p>
            </div>
          </div>
        </div>

        {/* Multiple Files Upload */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-300 hover:border-brand-blue transition-colors duration-300 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-folder text-2xl text-brand-success"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2" data-testid="text-multiple-upload-title">
              Subir múltiples imágenes
            </h3>
            <p className="text-gray-600 mb-6" data-testid="text-multiple-upload-description">
              Selecciona una carpeta completa o múltiples archivos
            </p>
            
            <div 
              {...getMultipleRootProps()} 
              className={`cursor-pointer border-2 border-dashed rounded-lg p-8 transition-all duration-300 ${
                isMultipleDragActive 
                  ? 'border-brand-blue bg-blue-50' 
                  : 'border-gray-300 hover:border-brand-blue hover:bg-blue-50'
              }`}
              data-testid="dropzone-multiple"
            >
              <input {...getMultipleInputProps()} data-testid="input-multiple-files" />
              <i className="fas fa-images text-3xl text-gray-400 mb-3"></i>
              <p className="text-gray-600 font-medium">Procesamiento por lotes</p>
              <p className="text-sm text-gray-500 mt-2">Hasta 50 archivos simultáneamente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6" data-testid="instructions-section">
        <div className="flex items-start">
          <i className="fas fa-info-circle text-brand-blue text-xl mt-1 mr-3"></i>
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Instrucciones de uso:</h4>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• Asegúrate de que el texto en las capturas sea legible y esté en buen contraste</li>
              <li>• Los formatos soportados son PNG, JPG y JPEG</li>
              <li>• <strong>Para datos de actividad física:</strong> Detecta automáticamente Pts Cardio, Pasos, Cal, Km y Min de Actividad</li>
              <li>• <strong>Para datos bancarios:</strong> Identifica fechas, horas, montos, cuentas e instituciones</li>
              <li>• <strong>Para otros datos:</strong> Sube múltiples imágenes con patrones similares</li>
              <li>• Una vez procesado, podrás descargar los datos en formato CSV o JSON, y copiar tablas para Excel</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
