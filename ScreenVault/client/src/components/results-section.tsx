import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { OcrResult } from "@shared/schema";

interface ResultsSectionProps {
  results: OcrResult[];
  totalFiles: number;
  processedFiles: number;
  onReset: () => void;
}

export default function ResultsSection({ results, totalFiles, processedFiles, onReset }: ResultsSectionProps) {
  const { toast } = useToast();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const downloadCsvMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/download/csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ results }),
      });

      if (!response.ok) {
        throw new Error("Error generando archivo CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resultados_ocr.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Descarga iniciada",
        description: "El archivo CSV se está descargando",
      });
    },
    onError: () => {
      toast({
        title: "Error en la descarga",
        description: "No se pudo generar el archivo CSV",
        variant: "destructive",
      });
    },
  });

  const downloadJsonMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/download/json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ results }),
      });

      if (!response.ok) {
        throw new Error("Error generando archivo JSON");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resultados_ocr.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Descarga iniciada",
        description: "El archivo JSON se está descargando",
      });
    },
    onError: () => {
      toast({
        title: "Error en la descarga",
        description: "No se pudo generar el archivo JSON",
        variant: "destructive",
      });
    },
  });

  const totalExtractedElements = results.reduce((sum, result) => sum + result.wordCount, 0);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="results-section">
      {/* Results Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2" data-testid="text-results-title">
              Resultados del procesamiento
            </h3>
            <p className="text-gray-600" data-testid="text-results-summary">
              Se han extraído{" "}
              <span className="font-semibold text-brand-blue">{totalExtractedElements}</span>{" "}
              elementos de texto de{" "}
              <span className="font-semibold text-brand-blue">{processedFiles}</span>{" "}
              imágenes
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="bg-brand-success text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
              onClick={() => downloadCsvMutation.mutate()}
              disabled={downloadCsvMutation.isPending}
              data-testid="button-download-csv"
            >
              <i className="fas fa-download"></i>
              {downloadCsvMutation.isPending ? "Generando..." : "Descargar CSV"}
            </button>
            <button
              className="bg-brand-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
              onClick={() => downloadJsonMutation.mutate()}
              disabled={downloadJsonMutation.isPending}
              data-testid="button-download-json"
            >
              <i className="fas fa-download"></i>
              {downloadJsonMutation.isPending ? "Generando..." : "Descargar JSON"}
            </button>
          </div>
        </div>
      </div>

      {/* Extracted Data Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden" data-testid="results-table">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Datos extraídos</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Archivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Texto extraído
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confianza
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Palabras
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha procesado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result, index) => (
                <tr key={result.id} className="hover:bg-gray-50" data-testid={`row-result-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <i className="fas fa-image text-gray-400 mr-3"></i>
                      <span className="text-sm font-medium text-gray-900" data-testid={`text-filename-${index}`}>
                        {result.originalName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md" data-testid={`text-extracted-${index}`}>
                      {result.extractedText ? (
                        <div className="space-y-2">
                          <div className="bg-gray-50 p-3 rounded border">
                            <div className={`whitespace-pre-wrap font-mono text-xs ${
                              expandedRows.has(result.id) ? '' : 'line-clamp-3'
                            }`}>
                              {result.extractedText}
                            </div>
                          </div>
                          {result.extractedText.length > 100 && (
                            <button
                              className="text-brand-blue hover:text-blue-700 text-xs font-medium transition-colors"
                              onClick={() => toggleExpanded(result.id)}
                              data-testid={`button-expand-${index}`}
                            >
                              {expandedRows.has(result.id) ? 'Ver menos' : 'Ver más'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Sin texto extraído</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.confidence >= 90 
                          ? 'bg-green-100 text-green-800' 
                          : result.confidence >= 70 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                      data-testid={`text-confidence-${index}`}
                    >
                      {result.confidence}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-testid={`text-wordcount-${index}`}>
                    {result.wordCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-testid={`text-processed-date-${index}`}>
                    {new Date(result.processedAt).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          className="bg-gray-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center gap-2"
          onClick={onReset}
          data-testid="button-process-more"
        >
          <i className="fas fa-plus"></i>
          Procesar más imágenes
        </button>
        <button
          className="bg-brand-blue text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
          onClick={onReset}
          data-testid="button-reset"
        >
          <i className="fas fa-redo"></i>
          Comenzar de nuevo
        </button>
      </div>
    </div>
  );
}
