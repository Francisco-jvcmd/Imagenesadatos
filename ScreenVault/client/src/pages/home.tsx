import { useState } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import UploadSection from "@/components/upload-section";
import ProcessingSection from "@/components/processing-section";
import ResultsSection from "@/components/results-section";
import StructuredDataSection from "@/components/structured-data-section";
import { OcrResult, StructuredData } from "@shared/schema";

type AppState = "upload" | "processing" | "results" | "error";

export default function Home() {
  const [currentState, setCurrentState] = useState<AppState>("upload");
  const [results, setResults] = useState<OcrResult[]>([]);
  const [structuredData, setStructuredData] = useState<StructuredData[]>([]);
  const [progress, setProgress] = useState({ percentage: 0, status: "" });
  const [error, setError] = useState<string>("");
  const [totalFiles, setTotalFiles] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);

  const handleUploadStart = (fileCount: number) => {
    setTotalFiles(fileCount);
    setProcessedFiles(0);
    setCurrentState("processing");
    setProgress({ percentage: 0, status: `Iniciando procesamiento de ${fileCount} archivo${fileCount > 1 ? 's' : ''}...` });
  };

  const handleProgress = (percentage: number, status: string) => {
    setProgress({ percentage, status });
  };

  const handleProcessingComplete = (ocrResults: OcrResult[], structuredResults: StructuredData[], processed: number, total: number) => {
    setResults(ocrResults);
    setStructuredData(structuredResults || []);
    setProcessedFiles(processed);
    setTotalFiles(total);
    setCurrentState("results");
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setCurrentState("error");
  };

  const handleReset = () => {
    setCurrentState("upload");
    setResults([]);
    setStructuredData([]);
    setProgress({ percentage: 0, status: "" });
    setError("");
    setTotalFiles(0);
    setProcessedFiles(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {currentState === "upload" && (
          <UploadSection 
            onUploadStart={handleUploadStart}
            onProgress={handleProgress}
            onComplete={handleProcessingComplete}
            onError={handleError}
          />
        )}
        
        {currentState === "processing" && (
          <ProcessingSection progress={progress} />
        )}
        
        {currentState === "results" && (
          <div className="space-y-8">
            {structuredData.length > 0 && (
              <StructuredDataSection 
                structuredData={structuredData}
                onReset={handleReset}
              />
            )}
            <ResultsSection 
              results={results}
              totalFiles={totalFiles}
              processedFiles={processedFiles}
              onReset={handleReset}
            />
          </div>
        )}
        
        {currentState === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6" data-testid="error-section">
            <div className="flex items-center">
              <i className="fas fa-exclamation-triangle text-red-500 text-xl mr-3"></i>
              <div>
                <h4 className="font-semibold text-red-900 mb-2">Error en el procesamiento</h4>
                <p className="text-red-800 mb-4">{error}</p>
                <button 
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors duration-200"
                  onClick={handleReset}
                  data-testid="button-retry"
                >
                  Intentar de nuevo
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
