import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { PatternAnalyzer } from "./pattern-analyzer";
import multer from "multer";
import { createWorker } from "tesseract.js";
import { processFilesRequestSchema, downloadRequestSchema } from "@shared/schema";
import { createObjectCsvWriter } from "csv-writer";
import { writeFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PNG, JPG y JPEG'), false);
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Process uploaded files with OCR
  app.post("/api/process-files", upload.array('files', 50), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No se han subido archivos" });
      }

      const results = [];
      const worker = await createWorker('spa'); // Spanish language support
      
      try {
        for (const file of files) {
          try {
            const { data: { text, confidence } } = await worker.recognize(file.buffer);
            
            const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
            
            const result = await storage.saveOcrResult({
              filename: file.filename || `file_${Date.now()}.${file.mimetype.split('/')[1]}`,
              originalName: file.originalname,
              extractedText: text.trim(),
              confidence: Math.round(confidence),
              wordCount,
            });
            
            results.push(result);
          } catch (error) {
            console.error(`Error processing file ${file.originalname}:`, error);
            // Continue with other files even if one fails
          }
        }
      } finally {
        await worker.terminate();
      }

      if (results.length === 0) {
        return res.status(500).json({ message: "No se pudieron procesar los archivos" });
      }

      // Analizar patrones para crear tablas estructuradas
      const patternAnalyzer = new PatternAnalyzer();
      const structuredData = files.length > 1 ? patternAnalyzer.analyzePatterns(results) : [];

      res.json({ 
        message: `Se procesaron ${results.length} de ${files.length} archivos correctamente`,
        results,
        structuredData,
        totalFiles: files.length,
        processedFiles: results.length,
      });
    } catch (error) {
      console.error('Error in process-files:', error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Download results as CSV
  app.post("/api/download/csv", async (req, res) => {
    try {
      const { results } = req.body;
      
      const tmpDir = await mkdtemp(join(tmpdir(), 'ocr-results-'));
      const csvPath = join(tmpDir, 'resultados_ocr.csv');
      
      const csvWriter = createObjectCsvWriter({
        path: csvPath,
        header: [
          { id: 'filename', title: 'Archivo' },
          { id: 'originalName', title: 'Nombre Original' },
          { id: 'extractedText', title: 'Texto Extraído' },
          { id: 'confidence', title: 'Confianza (%)' },
          { id: 'wordCount', title: 'Palabras' },
          { id: 'processedAt', title: 'Fecha de Procesamiento' },
        ],
      });

      if (!results || !Array.isArray(results)) {
        return res.status(400).json({ message: "Datos de resultados inválidos" });
      }

      const records = results.map(result => ({
        ...result,
        processedAt: typeof result.processedAt === 'string' 
          ? new Date(result.processedAt).toLocaleString('es-ES')
          : result.processedAt instanceof Date
          ? result.processedAt.toLocaleString('es-ES')
          : 'Fecha no disponible',
      }));

      await csvWriter.writeRecords(records);
      
      res.download(csvPath, 'resultados_ocr.csv', async (err) => {
        if (err) {
          console.error('Error sending CSV file:', err);
        }
        // Clean up temporary file
        try {
          await unlink(csvPath);
        } catch (cleanupErr) {
          console.error('Error cleaning up CSV file:', cleanupErr);
        }
      });
    } catch (error) {
      console.error('Error generating CSV:', error);
      res.status(500).json({ message: "Error generando archivo CSV" });
    }
  });

  // Download results as JSON
  app.post("/api/download/json", async (req, res) => {
    try {
      const { results } = req.body;
      
      if (!results || !Array.isArray(results)) {
        return res.status(400).json({ message: "Datos de resultados inválidos" });
      }

      const jsonData = {
        exportDate: new Date().toISOString(),
        totalResults: results.length,
        results: results.map(result => ({
          ...result,
          processedAt: typeof result.processedAt === 'string' 
            ? result.processedAt
            : result.processedAt instanceof Date
            ? result.processedAt.toISOString()
            : new Date().toISOString(),
        })),
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="resultados_ocr.json"');
      res.json(jsonData);
    } catch (error) {
      console.error('Error generating JSON:', error);
      res.status(500).json({ message: "Error generando archivo JSON" });
    }
  });

  // Get all results
  app.get("/api/results", async (req, res) => {
    try {
      const results = await storage.getAllOcrResults();
      res.json(results);
    } catch (error) {
      console.error('Error fetching results:', error);
      res.status(500).json({ message: "Error obteniendo resultados" });
    }
  });

  // Download structured data as CSV
  app.post("/api/download/structured-csv", async (req, res) => {
    try {
      const { structuredData } = req.body;
      
      if (!structuredData || !structuredData.columns || !structuredData.rows) {
        return res.status(400).json({ message: "Datos estructurados inválidos" });
      }

      const tmpDir = await mkdtemp(join(tmpdir(), 'structured-data-'));
      const csvPath = join(tmpDir, 'tabla_estructurada.csv');
      
      const csvWriter = createObjectCsvWriter({
        path: csvPath,
        header: structuredData.columns.map((column: string, index: number) => ({
          id: `col_${index}`,
          title: column
        }))
      });

      const records = structuredData.rows.map((row: string[]) => {
        const record: Record<string, string> = {};
        row.forEach((value, index) => {
          record[`col_${index}`] = value || '';
        });
        return record;
      });

      await csvWriter.writeRecords(records);
      
      res.download(csvPath, `${structuredData.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`, async (err) => {
        if (err) {
          console.error('Error sending structured CSV file:', err);
        }
        try {
          await unlink(csvPath);
        } catch (cleanupErr) {
          console.error('Error cleaning up structured CSV file:', cleanupErr);
        }
      });
    } catch (error) {
      console.error('Error generating structured CSV:', error);
      res.status(500).json({ message: "Error generando tabla estructurada CSV" });
    }
  });

  // Clear all results
  app.delete("/api/results", async (req, res) => {
    try {
      await storage.clearOcrResults();
      res.json({ message: "Todos los resultados han sido eliminados" });
    } catch (error) {
      console.error('Error clearing results:', error);
      res.status(500).json({ message: "Error eliminando resultados" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
