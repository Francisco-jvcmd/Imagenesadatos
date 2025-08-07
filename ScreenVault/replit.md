# Overview

LENDAN is a web application that extracts text from screenshots using OCR (Optical Character Recognition) technology. Users can upload single images or multiple files, and the system processes them to extract readable text, presenting results in a structured format with options to download data as CSV or JSON files. The application emphasizes simplicity with no registration required and provides a responsive, mobile-friendly interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is built using React with TypeScript and follows a component-based architecture:

- **Framework**: React 18 with TypeScript for type safety
- **Styling**: Tailwind CSS with custom design system variables for consistent theming
- **UI Components**: Radix UI primitives with shadcn/ui components for accessible, reusable interface elements
- **State Management**: React hooks for local state and TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **File Handling**: React Dropzone for drag-and-drop file uploads with validation

The application uses a single-page architecture with state-driven UI transitions between upload, processing, and results phases.

## Backend Architecture

The backend follows an Express.js REST API pattern:

- **Framework**: Express.js with TypeScript
- **File Processing**: Multer for handling multipart file uploads with memory storage
- **OCR Engine**: Tesseract.js for client-side text extraction from images
- **Data Storage**: In-memory storage using a custom storage abstraction layer
- **API Design**: RESTful endpoints with structured request/response handling

The server implements a middleware-based architecture with request logging, error handling, and file validation layers.

## Data Storage Solutions

The application uses a simple in-memory storage approach:

- **Storage Pattern**: Repository pattern with a storage interface for future extensibility
- **Data Persistence**: MemStorage class maintains OCR results in-memory using Map data structures
- **Database Ready**: Drizzle ORM configuration prepared for PostgreSQL integration
- **Schema Management**: Zod schemas for runtime type validation and data consistency

## Authentication and Authorization

Currently implements a no-authentication approach:

- **Access Control**: Public access without user registration or login requirements
- **Session Management**: No persistent sessions or user state tracking
- **Security**: File type validation and size limits for upload security

## File Processing Pipeline

The OCR processing follows a structured pipeline:

1. **Upload Validation**: File type checking (PNG, JPG, JPEG) and size limits (10MB per file, 50 files max)
2. **OCR Processing**: Tesseract.js processes images with Spanish language support
3. **Data Extraction**: Text extraction with confidence scoring and word count analysis
4. **Pattern Analysis**: Advanced pattern detection for structured data, especially banking transactions
5. **Result Storage**: Processed results stored with metadata including processing timestamps
6. **Export Generation**: CSV and JSON file generation for download, plus Excel-compatible copy functionality

The system provides real-time progress feedback during processing phases.

## Advanced Pattern Detection (Updated January 2025)

The system now includes sophisticated pattern analysis specifically optimized for banking transactions:

- **Banking Transaction Analysis**: Priority detection for financial data including dates, times, amounts, account numbers, institutions, document numbers, and beneficiaries
- **Multi-format Date Detection**: Supports DD/MM/YYYY, YYYY/MM/DD, "15 de enero de 2024" formats
- **Precise Amount Detection**: Recognizes currency symbols (S/, $, €), standalone numbers (like "60"), and contextual amounts
- **Institution Recognition**: Comprehensive database of Latin American banks (BBVA, BCP, Santander, etc.)
- **Account Number Patterns**: Detects various formats including CCI, card numbers, and standard account formats
- **Document Reference Detection**: Identifies transaction codes, voucher numbers, and operation references
- **Structured Table Generation**: Creates organized tables with proper column headers and data relationships
- **Excel Integration**: Copy-to-clipboard functionality for direct pasting into spreadsheets

Pattern detection requires minimum 2 identified fields per transaction for inclusion, ensuring balance between completeness and accuracy.

# External Dependencies

## Core Technologies

- **React Ecosystem**: React, React DOM, React Router (Wouter)
- **TypeScript**: Full TypeScript implementation for type safety
- **Build Tools**: Vite for development and build processes, ESBuild for server bundling

## UI and Styling

- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Radix UI**: Accessible component primitives for complex UI elements
- **Lucide React**: Icon library for consistent iconography
- **Font Awesome**: Additional icon resources

## Backend Services

- **Express.js**: Web framework for REST API
- **Multer**: Multipart form data handling for file uploads
- **Tesseract.js**: OCR engine for text extraction from images

## Data and Validation

- **Zod**: Runtime type validation and schema definition
- **Drizzle ORM**: Database toolkit configured for PostgreSQL
- **csv-writer**: CSV file generation utility

## Development and Build

- **Vite**: Development server and build tool with React plugin
- **PostCSS**: CSS processing with Autoprefixer
- **Replit Integration**: Development environment integration tools

## Potential External Services

- **Neon Database**: Serverless PostgreSQL provider (configured but not actively used)
- **Cloud Storage**: File storage services for persistent image handling
- **OCR APIs**: Alternative OCR services for improved accuracy or language support