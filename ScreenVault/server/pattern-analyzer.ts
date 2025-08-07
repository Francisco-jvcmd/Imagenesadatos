import { OcrResult, StructuredData } from "@shared/schema";
import { randomUUID } from "crypto";

interface PatternMatch {
  pattern: string;
  label: string;
  values: string[];
  confidence: number;
}

export class PatternAnalyzer {
  
  // Detecta patrones comunes en los textos extraídos
  analyzePatterns(results: OcrResult[]): StructuredData[] {
    if (results.length < 2) return [];

    const structuredTables: StructuredData[] = [];
    
    // Analizar patrones de actividad física (nueva prioridad)
    const fitnessPattern = this.analyzeFitnessData(results);
    if (fitnessPattern) {
      structuredTables.push(fitnessPattern);
    }

    // Analizar patrones bancarios/financieros
    const bankingPattern = this.analyzeBankingTransactions(results);
    if (bankingPattern) {
      structuredTables.push(bankingPattern);
    }



    // Analizar patrones numéricos (como pasos)
    const numericPattern = this.analyzeNumericSteps(results);
    if (numericPattern) {
      structuredTables.push(numericPattern);
    }

    // Analizar patrones de etiquetas
    const labelPattern = this.analyzeLabeledData(results);
    if (labelPattern) {
      structuredTables.push(labelPattern);
    }

    return structuredTables;
  }

  private analyzeNumericSteps(results: OcrResult[]): StructuredData | null {
    const patterns: PatternMatch[] = [];
    
    for (const result of results) {
      const text = result.extractedText.toLowerCase();
      
      // Buscar patrones como "paso 1:", "step 1:", números seguidos de ":"
      const stepMatches = text.match(/(?:paso|step|etapa)\s*(\d+)[:\.]?\s*(.+)/gi);
      if (stepMatches) {
        const values = stepMatches.map(match => {
          const cleanMatch = match.replace(/(?:paso|step|etapa)\s*\d+[:\.]?\s*/gi, '').trim();
          return cleanMatch;
        });
        
        patterns.push({
          pattern: 'steps',
          label: 'Pasos',
          values,
          confidence: 0.9
        });
      }

      // Buscar números seguidos de contenido (1. algo, 2. algo)
      const numberedMatches = text.match(/(\d+)[\.\)\:]?\s*([^\d\n]+)/g);
      if (numberedMatches && numberedMatches.length >= 2) {
        const values = numberedMatches.map(match => {
          return match.replace(/^\d+[\.\)\:]?\s*/, '').trim();
        });
        
        patterns.push({
          pattern: 'numbered_list',
          label: 'Lista Numerada',
          values,
          confidence: 0.8
        });
      }
    }

    if (patterns.length === 0) return null;

    // Tomar el patrón con mayor confianza
    const bestPattern = patterns.sort((a, b) => b.confidence - a.confidence)[0];
    
    // Crear tabla estructurada
    const allValues: string[][] = [];
    const sourceFiles: string[] = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const text = result.extractedText.toLowerCase();
      const rowValues: string[] = [];
      
      if (bestPattern.pattern === 'steps') {
        const stepMatches = text.match(/(?:paso|step|etapa)\s*(\d+)[:\.]?\s*(.+)/gi);
        if (stepMatches) {
          stepMatches.forEach(match => {
            const cleanValue = match.replace(/(?:paso|step|etapa)\s*\d+[:\.]?\s*/gi, '').trim();
            rowValues.push(cleanValue);
          });
        }
      } else if (bestPattern.pattern === 'numbered_list') {
        const numberedMatches = text.match(/(\d+)[\.\)\:]?\s*([^\d\n]+)/g);
        if (numberedMatches) {
          numberedMatches.forEach(match => {
            const cleanValue = match.replace(/^\d+[\.\)\:]?\s*/, '').trim();
            rowValues.push(cleanValue);
          });
        }
      }
      
      if (rowValues.length > 0) {
        allValues.push(rowValues);
        sourceFiles.push(result.originalName);
      }
    }

    if (allValues.length === 0) return null;

    // Determinar número máximo de columnas
    const maxColumns = Math.max(...allValues.map(row => row.length));
    const columns = Array.from({ length: maxColumns }, (_, i) => `${bestPattern.label} ${i + 1}`);

    // Normalizar filas para que tengan la misma longitud
    const normalizedRows = allValues.map(row => {
      const normalizedRow = [...row];
      while (normalizedRow.length < maxColumns) {
        normalizedRow.push('');
      }
      return normalizedRow;
    });

    return {
      id: randomUUID(),
      title: `Datos Estructurados - ${bestPattern.label}`,
      columns: ['Archivo', ...columns],
      rows: normalizedRows.map((row, index) => [sourceFiles[index], ...row]),
      detectedPattern: bestPattern.pattern,
      sourceFiles
    };
  }

  private analyzeLabeledData(results: OcrResult[]): StructuredData | null {
    const commonLabels: Map<string, string[]> = new Map();
    
    for (const result of results) {
      const text = result.extractedText;
      
      // Buscar patrones como "Nombre: Juan", "Edad: 25", etc.
      const labelMatches = text.match(/([A-Za-zÁ-úñÑ\s]+):\s*([^\n\r]+)/g);
      if (labelMatches) {
        labelMatches.forEach(match => {
          const [label, value] = match.split(':').map(s => s.trim());
          if (label && value) {
            const normalizedLabel = label.toLowerCase().trim();
            if (!commonLabels.has(normalizedLabel)) {
              commonLabels.set(normalizedLabel, []);
            }
            commonLabels.get(normalizedLabel)?.push(value);
          }
        });
      }
    }

    // Solo proceder si hay al menos 2 etiquetas comunes en múltiples archivos
    const validLabels = Array.from(commonLabels.entries()).filter(([_, values]) => values.length >= 2);
    
    if (validLabels.length === 0) return null;

    const columns = ['Archivo', ...validLabels.map(([label]) => this.capitalizeFirst(label))];
    const rows: string[][] = [];
    const sourceFiles: string[] = [];

    for (const result of results) {
      const text = result.extractedText;
      const rowValues: string[] = [result.originalName];
      
      validLabels.forEach(([label]) => {
        const regex = new RegExp(`${label}:\\s*([^\\n\\r]+)`, 'i');
        const match = text.match(regex);
        rowValues.push(match ? match[1].trim() : '');
      });
      
      rows.push(rowValues);
      sourceFiles.push(result.originalName);
    }

    return {
      id: randomUUID(),
      title: 'Datos Estructurados - Etiquetas',
      columns,
      rows,
      detectedPattern: 'labeled_data',
      sourceFiles
    };
  }

  private analyzeTabularData(results: OcrResult[]): StructuredData | null {
    // Detectar datos que parecen estar en formato tabular
    for (const result of results) {
      const text = result.extractedText;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Buscar líneas que contengan múltiples valores separados por espacios, tabs o |
      const tabularLines = lines.filter(line => {
        const separators = line.match(/[\t|]{2,}|\s{3,}/g);
        return separators && separators.length >= 2;
      });
      
      if (tabularLines.length >= 2) {
        // Hay potencial datos tabulares, pero necesitaríamos más lógica para procesarlos
        // Por ahora, retornamos null y nos enfocamos en los otros patrones
      }
    }
    
    return null;
  }

  private analyzeFitnessData(results: OcrResult[]): StructuredData | null {
    const fitnessData: any[] = [];
    
    for (const result of results) {
      const text = result.extractedText;
      const fitness: any = { archivo: result.originalName };
      
      // Detectar patrones específicos de actividad física
      
      // 1. Pts Cardio (número verde, valor como 10)
      const ptsCardioPatterns = [
        /(?:^|\s)(\d{1,3})(?=\s|$|\n)/g, // Números solos que podrían ser pts cardio
        /(\d{1,3})(?:\s*pts|\s*cardio)/gi,
        /(?:cardio|pts)[\s:]*(\d{1,3})/gi
      ];
      
      // 2. Pasos (valor como 3.204)
      const pasosPatterns = [
        /(\d{1,2}[.,]\d{3})/g, // Formato 3.204 o 3,204
        /(?:pasos|steps)[\s:]*(\d{1,2}[.,]\d{3})/gi,
        /(\d{1,2}[.,]\d{3})(?:\s*pasos|\s*steps)/gi
      ];
      
      // 3. Cal (valor como 1.159)
      const calPatterns = [
        /(\d{1,2}[.,]\d{3})(?:\s*cal|\s*kcal)/gi,
        /(?:cal|kcal)[\s:]*(\d{1,2}[.,]\d{3})/gi,
        /(\d{1,2}[.,]\d{3}).*?cal/gi
      ];
      
      // 4. Km (valor como 2,02)
      const kmPatterns = [
        /(\d{1,2}[.,]\d{1,2})(?:\s*km)/gi,
        /(?:km)[\s:]*(\d{1,2}[.,]\d{1,2})/gi,
        /(\d{1,2}[.,]\d{1,2}).*?km/gi
      ];
      
      // 5. Min de Actividad (valor como 42)
      const minActividadPatterns = [
        /(\d{1,3})(?:\s*min|\s*minutos)/gi,
        /(?:min|minutos|actividad)[\s:]*(\d{1,3})/gi,
        /(\d{1,3}).*?(?:min|actividad)/gi
      ];
      
      // Detectar cada patrón
      this.detectFitnessValue(text, ptsCardioPatterns, fitness, 'pts_cardio');
      this.detectFitnessValue(text, pasosPatterns, fitness, 'pasos');
      this.detectFitnessValue(text, calPatterns, fitness, 'cal');
      this.detectFitnessValue(text, kmPatterns, fitness, 'km');
      this.detectFitnessValue(text, minActividadPatterns, fitness, 'min_actividad');
      
      // También buscar números específicos en secuencia
      const numbers = text.match(/\d{1,5}[.,]?\d{0,3}/g);
      if (numbers) {
        // Buscar patrones específicos basados en los valores ejemplo
        numbers.forEach(num => {
          const cleanNum = num.replace(',', '.');
          const numValue = parseFloat(cleanNum);
          
          // Pts Cardio: números pequeños enteros (como 10)
          if (!fitness.pts_cardio && numValue >= 1 && numValue <= 100 && Number.isInteger(numValue)) {
            fitness.pts_cardio = num;
          }
          // Pasos: números grandes con punto/coma (como 3.204)
          else if (!fitness.pasos && numValue > 1000 && numValue < 50000) {
            fitness.pasos = num;
          }
          // Cal: números medianos con punto/coma (como 1.159)
          else if (!fitness.cal && numValue > 500 && numValue < 5000) {
            fitness.cal = num;
          }
          // Km: números pequeños con decimales (como 2,02)
          else if (!fitness.km && numValue > 0.1 && numValue < 100 && !Number.isInteger(numValue)) {
            fitness.km = num;
          }
          // Min Actividad: números medianos enteros (como 42)
          else if (!fitness.min_actividad && numValue > 10 && numValue < 500 && Number.isInteger(numValue)) {
            fitness.min_actividad = num;
          }
        });
      }
      
      // Solo agregar si tiene al menos 2 campos de fitness
      const filledFields = Object.values(fitness).filter(v => v && v !== result.originalName).length;
      if (filledFields >= 2) {
        fitnessData.push(fitness);
      }
    }
    
    if (fitnessData.length === 0) return null;
    
    // Determinar columnas basado en los campos encontrados
    const allFields = new Set<string>();
    fitnessData.forEach(fitness => {
      Object.keys(fitness).forEach(key => {
        if (fitness[key] && key !== 'archivo') {
          allFields.add(key);
        }
      });
    });
    
    const fieldLabels: Record<string, string> = {
      archivo: 'Archivo',
      pts_cardio: 'Pts Cardio',
      pasos: 'Pasos',
      cal: 'Cal',
      km: 'Km',
      min_actividad: 'Min de Actividad'
    };
    
    const finalFields = Array.from(allFields);
    const columns = ['archivo', ...finalFields].map(field => fieldLabels[field] || field);
    
    const rows = fitnessData.map(fitness => {
      return ['archivo', ...finalFields].map(field => fitness[field] || '');
    });
    
    return {
      id: randomUUID(),
      title: 'Datos de Actividad Física',
      columns,
      rows,
      detectedPattern: 'fitness_data',
      sourceFiles: fitnessData.map(f => f.archivo)
    };
  }

  private detectFitnessValue(text: string, patterns: RegExp[], fitness: any, fieldName: string): void {
    if (fitness[fieldName]) return; // Ya tiene valor
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Extraer el número del match
        const numberMatch = matches[0].match(/(\d{1,5}[.,]?\d{0,3})/);
        if (numberMatch) {
          fitness[fieldName] = numberMatch[1];
          return;
        }
      }
    }
  }

  private analyzeBankingTransactions(results: OcrResult[]): StructuredData | null {
    const transactionData: any[] = [];
    
    for (const result of results) {
      const text = result.extractedText;
      const transaction: any = { archivo: result.originalName };
      
      // Detectar TODOS los patrones posibles de etiqueta:valor dinámicamente
      this.extractDynamicPatterns(text, transaction);
      
      // Detectar patrones bancarios específicos adicionales
      this.extractBankingPatterns(text, transaction);
      
      // Solo agregar si tiene al menos 1 campo identificado (muy permisivo)
      const filledFields = Object.values(transaction).filter(v => v && v !== result.originalName).length;
      if (filledFields >= 1) {
        transactionData.push(transaction);
      }
    }
    
    if (transactionData.length === 0) return null;
    
    // Determinar columnas SOLO basado en campos que realmente tienen datos
    const allFieldsWithData = new Set<string>();
    transactionData.forEach(transaction => {
      Object.keys(transaction).forEach(key => {
        if (transaction[key] && key !== 'archivo') {
          allFieldsWithData.add(key);
        }
      });
    });
    
    // Solo incluir campos que aparecen en al menos una transacción
    const finalFields = Array.from(allFieldsWithData);
    
    const fieldLabels: Record<string, string> = {
      archivo: 'Archivo',
      fecha: 'Fecha',
      hora: 'Hora',
      monto: 'Monto',
      numero_cuenta: 'Número de Cuenta',
      institucion: 'Institución',
      numero_documento: 'Número de Documento',
      tipo_operacion: 'Tipo de Operación',
      beneficiario: 'Beneficiario'
    };
    
    const columns = ['archivo', ...finalFields].map(field => {
      // Si el campo tiene una etiqueta conocida, usarla; si no, capitalizar el campo detectado
      return fieldLabels[field] || this.capitalizeFirst(field.replace(/_/g, ' '));
    });
    
    const rows = transactionData.map(transaction => {
      return ['archivo', ...finalFields].map(field => transaction[field] || '');
    });
    
    return {
      id: randomUUID(),
      title: 'Datos Estructurados Detectados',
      columns,
      rows,
      detectedPattern: 'dynamic_data',
      sourceFiles: transactionData.map(t => t.archivo)
    };
  }

  private extractDynamicPatterns(text: string, transaction: any): void {
    // Detectar CUALQUIER patrón de etiqueta:valor
    const genericPatterns = [
      // Patrones con dos puntos
      /([A-Za-zÁ-úñÑ\s]{2,30})[\s]*:[\s]*([^\n\r:]{1,50})/g,
      // Patrones como "Paso 1:", "Cal 123", etc.
      /([A-Za-zÁ-úñÑ]{2,15})[\s]+(\d{1,10})/g,
      // Números con etiquetas
      /(#|No\.|Nro\.?|Num\.?)[\s]*(\d{3,20})/gi,
      // Fechas
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/g,
      // Horas
      /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/g,
      // Montos con símbolos
      /(?:S\/|[$€£¥₹])\s*(\d{1,6}(?:[.,]\d{2})?)/g,
      // Números solos que podrían ser montos
      /(?:^|\s)(\d{1,6}(?:[.,]\d{2})?)\s*(?=\s|$|\n)/g
    ];

    // Buscar todos los patrones de etiqueta:valor
    const labelValueMatches = text.match(/([A-Za-zÁ-úñÑ\s]{2,25})[\s]*:[\s]*([^\n\r:]{1,50})/g);
    if (labelValueMatches) {
      labelValueMatches.forEach(match => {
        const [label, value] = match.split(':').map(s => s.trim());
        if (label && value && label.length > 1 && value.length > 0) {
          const normalizedLabel = this.normalizeFieldName(label);
          if (!transaction[normalizedLabel]) {
            transaction[normalizedLabel] = value;
          }
        }
      });
    }

    // Buscar patrones como "Paso 1", "Cal 123", etc.
    const stepMatches = text.match(/([A-Za-zÁ-úñÑ]{2,15})[\s]+(\d{1,10})/g);
    if (stepMatches) {
      stepMatches.forEach(match => {
        const parts = match.split(/\s+/);
        if (parts.length >= 2) {
          const label = parts[0];
          const value = parts[1];
          const normalizedLabel = this.normalizeFieldName(label);
          if (!transaction[normalizedLabel]) {
            transaction[normalizedLabel] = value;
          }
        }
      });
    }
  }

  private extractBankingPatterns(text: string, transaction: any): void {
    // Solo detectar patrones bancarios específicos si no se detectaron ya
    
    // Detectar fecha si no existe
    if (!transaction.fecha) {
      const datePatterns = [
        /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/g,
        /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/gi
      ];
      
      for (const pattern of datePatterns) {
        const dateMatch = text.match(pattern);
        if (dateMatch) {
          transaction.fecha = dateMatch[0];
          break;
        }
      }
    }
    
    // Detectar hora si no existe
    if (!transaction.hora) {
      const timePattern = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/g;
      const timeMatch = text.match(timePattern);
      if (timeMatch) {
        transaction.hora = timeMatch[0];
      }
    }
    
    // Detectar monto si no existe
    if (!transaction.monto) {
      const amountPatterns = [
        /(?:S\/|[$€£¥₹])\s*(\d{1,6}(?:[.,]\d{2})?)/g,
        /(?:monto|amount|valor|total)[\s:]*(\d{1,6}(?:[.,]\d{2})?)/gi
      ];
      
      for (const pattern of amountPatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          let amount = matches[0];
          const numberMatch = amount.match(/(\d{1,6}(?:[.,]\d{2})?)/);
          if (numberMatch) {
            transaction.monto = numberMatch[1];
          }
          break;
        }
      }
    }

    // Detectar institución bancaria
    if (!transaction.institucion) {
      const bankPatterns = [
        /(BBVA|Santander|BCP|Interbank|BanBif|Scotiabank|Banco de Crédito)/gi
      ];
      
      for (const pattern of bankPatterns) {
        const bankMatch = text.match(pattern);
        if (bankMatch) {
          transaction.institucion = bankMatch[0];
          break;
        }
      }
    }
  }

  private normalizeFieldName(label: string): string {
    // Normalizar nombres de campos para evitar duplicados
    const normalized = label.toLowerCase()
      .replace(/[áàäâã]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöôõ]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
      
    // Mapear campos comunes a nombres estándar
    const fieldMap: Record<string, string> = {
      'paso': 'paso',
      'cal': 'cal',
      'numero': 'numero',
      'nro': 'numero',
      'no': 'numero',
      'monto': 'monto',
      'cantidad': 'monto',
      'valor': 'monto',
      'fecha': 'fecha',
      'date': 'fecha',
      'hora': 'hora',
      'time': 'hora',
      'banco': 'institucion',
      'institucion': 'institucion',
      'cuenta': 'numero_cuenta',
      'account': 'numero_cuenta'
    };
    
    return fieldMap[normalized] || normalized;
  }



  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}