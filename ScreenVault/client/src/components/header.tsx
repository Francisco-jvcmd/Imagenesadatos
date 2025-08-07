export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900" data-testid="text-app-title">
              Extractor OCR
            </h1>
            <span className="ml-3 text-sm text-gray-500" data-testid="text-app-subtitle">
              Convierte capturas en datos
            </span>
          </div>
          <div className="flex items-center">
            <div className="bg-brand-blue text-white px-4 py-2 rounded-lg font-bold text-lg tracking-wide shadow-md" data-testid="logo-lendan">
              LENDAN
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
