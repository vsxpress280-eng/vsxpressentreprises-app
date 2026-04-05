import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Translation } from 'react-i18next';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Translation>
          {(t) => (
            <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center p-4 text-center">
              <div className="bg-[#1E1E1E] p-8 rounded-2xl border border-[#2A2A2A] max-w-md w-full shadow-2xl">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">{t("common.error")}</h1>
                <p className="text-[#A0A0A0] mb-6">
                  {t("error.unexpected", "An unexpected error occurred.")}
                </p>
                
                {import.meta.env.DEV && this.state.error && (
                  <div className="mb-6 p-4 bg-black/50 rounded-lg text-left overflow-auto max-h-40">
                    <p className="text-red-400 font-mono text-xs">{this.state.error.toString()}</p>
                  </div>
                )}

                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={this.handleReload}
                    className="bg-[#D4AF37] text-black hover:bg-[#B8941F]"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t("common.refresh", "Reload Application")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Translation>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;