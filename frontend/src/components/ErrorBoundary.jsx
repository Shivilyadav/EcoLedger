import React from 'react';
import { withTranslation } from 'react-i18next';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            const { t } = this.props;
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center bg-emerald-950">
                    <h1 className="text-5xl font-black text-white mb-6">{t('unexpected_error_title')}</h1>
                    <p className="text-emerald-400 font-bold mb-10 max-w-lg">
                        {t('unexpected_error_body')}
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-10 py-5 bg-emerald-500 text-white font-black rounded-3xl hover:bg-emerald-400 transition-all"
                    >
                        {t('reload_page')}
                    </button>
                    {this.state.error && (
                        <pre className="mt-10 p-6 bg-black/40 rounded-2xl text-xs text-red-400 text-left overflow-auto max-w-2xl">
                            {this.state.error.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default withTranslation()(ErrorBoundary);
