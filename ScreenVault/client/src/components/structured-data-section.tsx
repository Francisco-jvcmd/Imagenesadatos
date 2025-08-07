import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { StructuredData } from "@shared/schema";

interface StructuredDataSectionProps {
  structuredData: StructuredData[];
  onReset: () => void;
}

export default function StructuredDataSection({ structuredData, onReset }: StructuredDataSectionProps) {
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState(0);

  const downloadStructuredCsvMutation = useMutation({
    mutationFn: async (data: StructuredData) => {
      const response = await fetch("/api/download/structured-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ structuredData: data }),
      });

      if (!response.ok) {
        throw new Error("Error generando tabla estructurada CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Descarga iniciada",
        description: "La tabla estructurada se está descargando",
      });
    },
    onError: () => {
      toast({
        title: "Error en la descarga",
        description: "No se pudo generar la tabla CSV",
        variant: "destructive",
      });
    },
  });

  const copyTableToClipboard = async (data: StructuredData) => {
    try {
      // Crear texto tabulado para copiar
      const headers = data.columns.join('\t');
      const rows = data.rows.map(row => row.join('\t')).join('\n');
      const tableText = `${headers}\n${rows}`;
      
      await navigator.clipboard.writeText(tableText);
      toast({
        title: "Tabla copiada",
        description: "Los datos se copiaron al portapapeles. Puedes pegarlos en Excel.",
      });
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar la tabla al portapapeles",
        variant: "destructive",
      });
    }
  };

  if (structuredData.length === 0) return null;

  const currentTable = structuredData[selectedTable];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="structured-data-section">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
            <i className="fas fa-table text-2xl text-blue-600"></i>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900" data-testid="text-structured-title">
              ¡Datos Estructurados Detectados!
            </h3>
            <p className="text-gray-600" data-testid="text-structured-description">
              Hemos encontrado patrones en tus imágenes y creado tablas organizadas
            </p>
          </div>
        </div>

        {/* Table Selector */}
        {structuredData.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar tabla:
            </label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="select-table"
            >
              {structuredData.map((table, index) => (
                <option key={table.id} value={index}>
                  {table.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
            onClick={() => downloadStructuredCsvMutation.mutate(currentTable)}
            disabled={downloadStructuredCsvMutation.isPending}
            data-testid="button-download-structured-csv"
          >
            <i className="fas fa-download"></i>
            {downloadStructuredCsvMutation.isPending ? "Generando..." : "Descargar CSV"}
          </button>
          <button
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
            onClick={() => copyTableToClipboard(currentTable)}
            data-testid="button-copy-table"
          >
            <i className="fas fa-copy"></i>
            Copiar para Excel
          </button>
        </div>
      </div>

      {/* Structured Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden" data-testid="structured-table">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h4 className="text-lg font-semibold text-gray-900">{currentTable.title}</h4>
          <p className="text-sm text-gray-600 mt-1">
            Patrón detectado: {currentTable.detectedPattern} • 
            {currentTable.sourceFiles.length} archivo{currentTable.sourceFiles.length > 1 ? 's' : ''} procesado{currentTable.sourceFiles.length > 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-50">
              <tr>
                {currentTable.columns.map((column, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider"
                    data-testid={`column-header-${index}`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentTable.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50" data-testid={`structured-row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      data-testid={`cell-${rowIndex}-${cellIndex}`}
                    >
                      {cellIndex === 0 ? (
                        <div className="flex items-center">
                          <i className="fas fa-image text-gray-400 mr-2"></i>
                          <span className="font-medium">{cell}</span>
                        </div>
                      ) : (
                        <div className="bg-gray-50 px-3 py-2 rounded border">
                          <span className="font-mono text-xs">{cell || '-'}</span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Info */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>
              {currentTable.rows.length} fila{currentTable.rows.length > 1 ? 's' : ''} × {currentTable.columns.length} columna{currentTable.columns.length > 1 ? 's' : ''}
            </span>
            <span>
              Archivos: {currentTable.sourceFiles.join(', ')}
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6" data-testid="structured-instructions">
        <div className="flex items-start">
          <i className="fas fa-lightbulb text-green-600 text-xl mt-1 mr-3"></i>
          <div>
            <h4 className="font-semibold text-green-900 mb-2">Cómo usar los datos estructurados:</h4>
            <ul className="text-green-800 space-y-1 text-sm">
              <li>• <strong>Descargar CSV:</strong> Obtienes un archivo que puedes abrir directamente en Excel</li>
              <li>• <strong>Copiar para Excel:</strong> Copia la tabla al portapapeles y pégala en cualquier hoja de cálculo</li>
              <li>• Los datos se organizan automáticamente según los patrones detectados en tus imágenes</li>
              <li>• Perfecto para crear reportes, análisis o seguimiento de datos repetitivos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}