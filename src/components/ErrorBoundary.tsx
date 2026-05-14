import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Terjadi kesalahan yang tidak terduga.";
      
      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error && parsedError.error.includes('permission-denied')) {
            errorMessage = "Akses ditolak. Anda tidak memiliki izin untuk melihat atau mengubah data ini. Silakan hubungi administrator.";
          } else if (parsedError.error) {
            errorMessage = parsedError.error;
          }
        }
      } catch (e) {
        // If not JSON, use the original message or default
        if (this.state.error?.message && this.state.error.message.includes('permission-denied')) {
          errorMessage = "Akses ditolak. Anda tidak memiliki izin untuk melihat atau mengubah data ini. Silakan hubungi administrator.";
        }
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-800 mb-2">Oops! Terjadi Kesalahan</h2>
            <p className="text-red-600 mb-6">{errorMessage}</p>
            <button
              className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              onClick={() => window.location.reload()}
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
