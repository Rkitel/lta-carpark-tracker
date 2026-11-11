import React, { useState } from 'react';
import {
  BackendConfig,
  fetchLiveCarparkData,
} from '../services/carparkService';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Code2,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface BackendConfigModalProps {
  config: BackendConfig;
  onSaveConfig: (config: BackendConfig) => void;
  onClose: () => void;
}

export const BackendConfigModal: React.FC<BackendConfigModalProps> = ({
  config,
  onSaveConfig,
  onClose,
}) => {
  const [localConfig, setLocalConfig] = useState<BackendConfig>({ ...config });
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    dataCount?: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'schema'>('settings');
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await fetchLiveCarparkData(localConfig);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Unknown network error',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig(localConfig);
    onClose();
  };

  const sampleSchema = `{
  "items": [
    {
      "timestamp": "2026-11-09T19:30:00+08:00",
      "carpark_data": [
        {
          "carpark_number": "TAM10",
          "update_datetime": "2026-11-09 19:28:45",
          "carpark_info": [
            {
              "total_lots": "450",
              "lot_type": "C",
              "lots_available": "195"
            },
            {
              "total_lots": "80",
              "lot_type": "Y",
              "lots_available": "40"
            }
          ]
        }
      ]
    }
  ]
}`;

  const copySchemaToClipboard = () => {
    navigator.clipboard.writeText(sampleSchema);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Backend API Connection
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure real-time carpark feeds for future backend integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Endpoint Settings
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`pb-2.5 border-b-2 transition-colors ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Payload Contract & Docs
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {activeTab === 'settings' ? (
            <>
              {/* Mode Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Data Feed Source Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setLocalConfig((p) => ({ ...p, mode: 'simulated' }))
                    }
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      localConfig.mode === 'simulated'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>Simulated Engine</span>
                      {localConfig.mode === 'simulated' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Realistic real-time lot fluctuations across 32+ SG stations without external dependencies.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setLocalConfig((p) => ({ ...p, mode: 'custom_api' }))
                    }
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      localConfig.mode === 'custom_api'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>Custom API / Gov Feed</span>
                      {localConfig.mode === 'custom_api' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Connect to your Node/Express backend or Data.gov.sg / LTA DataMall proxy endpoint.
                    </p>
                  </button>
                </div>
              </div>

              {/* Endpoint URL */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  API Endpoint URL
                </label>
                <input
                  type="text"
                  value={localConfig.apiUrl}
                  onChange={(e) =>
                    setLocalConfig((p) => ({ ...p, apiUrl: e.target.value }))
                  }
                  placeholder="/api/carparkavailability or https://datamall2.mytransport.sg/ltaodataservice/CarParkAvailabilityv2"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  API Key / Token (Optional)
                </label>
                <input
                  type="password"
                  value={localConfig.apiKey}
                  onChange={(e) =>
                    setLocalConfig((p) => ({ ...p, apiKey: e.target.value }))
                  }
                  placeholder="LTA DataMall AccountKey or Bearer token"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Polling Interval */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Real-time Polling Interval
                </label>
                <select
                  value={localConfig.refreshIntervalSec}
                  onChange={(e) =>
                    setLocalConfig((p) => ({
                      ...p,
                      refreshIntervalSec: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value={10}>Every 10 seconds (High frequency)</option>
                  <option value={20}>Every 20 seconds (Recommended)</option>
                  <option value={60}>Every 1 minute</option>
                  <option value={300}>Every 5 minutes</option>
                </select>
              </div>

              {/* Test Connection Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-emerald-600' : ''}`}
                  />
                  <span>
                    {testing ? 'Testing Connection...' : 'Test Connection & Fetch'}
                  </span>
                </button>

                {testResult && (
                  <div
                    className={`mt-2 p-3 rounded-lg text-xs flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">{testResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Data.gov.sg / LTA Carpark Availability Payload Structure
                </span>
                <button
                  onClick={copySchemaToClipboard}
                  className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSchema ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
                {sampleSchema}
              </pre>
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p>
                  <strong>Lot Types:</strong> <code>C</code> = Cars, <code>Y</code> = Motorcycles, <code>H</code> = Heavy Vehicles.
                </p>
                <p>
                  When your backend is ready, expose an endpoint returning either this exact schema or the normalized <code>Carpark[]</code> schema.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
