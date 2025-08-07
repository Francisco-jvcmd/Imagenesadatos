interface ProcessingSectionProps {
  progress: {
    percentage: number;
    status: string;
  };
}

export default function ProcessingSection({ progress }: ProcessingSectionProps) {
  return (
    <div className="space-y-6 animate-fade-in" data-testid="processing-section">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-cog fa-spin text-3xl text-brand-blue"></i>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2" data-testid="text-processing-title">
            Procesando imágenes...
          </h3>
          <p className="text-gray-600 mb-6" data-testid="text-processing-description">
            Extrayendo texto utilizando tecnología OCR avanzada
          </p>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progreso</span>
              <span data-testid="text-progress-percentage">{progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3" data-testid="progress-bar-container">
              <div 
                className="bg-brand-blue h-3 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progress.percentage}%` }}
                data-testid="progress-bar-fill"
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2" data-testid="text-progress-status">
              {progress.status}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
