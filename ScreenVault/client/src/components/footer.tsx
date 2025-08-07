export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <div className="bg-brand-blue text-white px-3 py-1 rounded font-bold text-sm mr-3" data-testid="logo-footer">
                LENDAN
              </div>
              <span className="text-gray-600">Extractor OCR</span>
            </div>
            <p className="text-gray-600 text-sm">
              Convierte tus capturas de pantalla en datos estructurados de forma rápida y precisa.
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-gray-900 mb-3">Características</h5>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Sin registro requerido</li>
              <li>• Procesamiento por lotes</li>
              <li>• Exportación CSV/JSON</li>
              <li>• Tecnología OCR avanzada</li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-gray-900 mb-3">Soporte</h5>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Formatos: PNG, JPG, JPEG</li>
              <li>• Tamaño máximo: 10MB por archivo</li>
              <li>• Hasta 50 archivos por lote</li>
              <li>• Procesamiento en tiempo real</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-8 pt-6 text-center">
          <p className="text-gray-500 text-sm">
            © 2024 LENDAN. Desarrollado para extraer texto de imágenes de forma eficiente.
          </p>
        </div>
      </div>
    </footer>
  );
}
