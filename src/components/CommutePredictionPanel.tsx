import React from 'react';
import {
  CommutePredictionResult,
  CommutePredictionInput,
  DepartureTimeWindow,
  CommuteOrigin,
} from '../services/predictionEngine';
import { Carpark } from '../types/carpark';
import {
  Bus,
  Car,
  Clock,
  Compass,
  CloudRain,
  Sun,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  Navigation,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface CommutePredictionPanelProps {
  prediction: CommutePredictionResult;
  predictionInput: CommutePredictionInput;
  setPredictionInput: React.Dispatch<React.SetStateAction<CommutePredictionInput>>;
  onSelectCarpark: (carpark: Carpark) => void;
  onViewBusBoard: () => void;
}

export const CommutePredictionPanel: React.FC<CommutePredictionPanelProps> = ({
  prediction,
  predictionInput,
  setPredictionInput,
  onSelectCarpark,
  onViewBusBoard,
}) => {
  const isTakeBus = prediction.decision === 'TAKE_BUS';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden transition-all">
      {/* 1. Commute Parameters Customizer Bar */}
      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>AI Commute Prediction Engine</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Should you drive all the way to SMU, or take the bus in?
            </h2>
          </div>

          {/* Quick Weather Toggle */}
          <button
            onClick={() =>
              setPredictionInput((prev) => ({
                ...prev,
                rainWeather: !prev.rainWeather,
              }))
            }
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 self-start lg:self-auto ${
              predictionInput.rainWeather
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            {predictionInput.rainWeather ? (
              <>
                <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                <span>Raining / Wet Weather (Demand High)</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Normal Weather</span>
              </>
            )}
          </button>
        </div>

        {/* Param Controls: Departure Window, Origin Highway, Duration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          {/* Departure Window */}
          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">
              Departure Timing:
            </label>
            <select
              value={predictionInput.departureWindow}
              onChange={(e) =>
                setPredictionInput((prev) => ({
                  ...prev,
                  departureWindow: e.target.value as DepartureTimeWindow,
                }))
              }
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="now">Leaving Right Now</option>
              <option value="in_30m">Leaving in ~30 Mins</option>
              <option value="morning_peak">Morning Rush (8:30–9:30 AM)</option>
              <option value="lunch_rush">Lunch Peak (12:00–1:30 PM)</option>
              <option value="evening_class">Evening Class (6:00–7:30 PM)</option>
            </select>
          </div>

          {/* Coming From (Origin) */}
          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">
              Driving In From:
            </label>
            <select
              value={predictionInput.origin}
              onChange={(e) =>
                setPredictionInput((prev) => ({
                  ...prev,
                  origin: e.target.value as CommuteOrigin,
                }))
              }
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="east">East (ECP / Nicoll ➔ Kallang / Bus 16)</option>
              <option value="north">North (CTE / PIE ➔ Thomson / Bus 167)</option>
              <option value="west">West (AYE ➔ Commonwealth / Bus 106)</option>
              <option value="central">Central (Whampoa / Balestier ➔ Bus 131)</option>
            </select>
          </div>

          {/* Stay Duration */}
          <div>
            <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">
              Parking Stay Duration:
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 4, 8].map((h) => (
                <button
                  key={h}
                  onClick={() =>
                    setPredictionInput((prev) => ({
                      ...prev,
                      durationHours: h,
                    }))
                  }
                  className={`py-1.5 rounded-lg border font-medium text-xs transition-colors ${
                    predictionInput.durationHours === h
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. The Result Prediction Hero Display */}
      <div
        className={`p-6 border-b transition-all ${
          isTakeBus
            ? 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white'
            : 'bg-gradient-to-r from-blue-600 via-indigo-700 to-slate-900 text-white'
        }`}
      >
        <div className="max-w-4xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide uppercase bg-black/30 backdrop-blur-xs border border-white/20">
              {prediction.confidenceScore}% Confidence Score
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-white/20 backdrop-blur-xs">
              {isTakeBus ? 'Avoid Full Gantries' : 'Guaranteed Lot Available'}
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {prediction.headline}
          </h3>

          <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal">
            {prediction.summary}
          </p>

          {/* Quick Metrics Bar */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <span className="text-white/70 block text-[11px]">Predicted Lots at SMU</span>
              <span className="text-lg font-bold font-mono">
                ~{prediction.predictedLotsAtSmu} lots free
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <span className="text-white/70 block text-[11px]">Money Saved Today</span>
              <span className="text-lg font-bold font-mono text-emerald-200">
                S$ {prediction.moneySaved.toFixed(2)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <span className="text-white/70 block text-[11px]">Next Bus 04121 Ready</span>
              <span className="text-lg font-bold font-mono">
                Bus {prediction.connectedBusService} in ~{prediction.nextBusArrivalMins}m
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <span className="text-white/70 block text-[11px]">Campus Risk Status</span>
              <span className="text-lg font-bold font-mono">
                {prediction.campusRiskLevel} Risk
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Actionable Step-by-Step Commute Itinerary */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Recommended Execution Route</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {prediction.itinerary.map((step) => (
            <div
              key={step.stepNumber}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 relative"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-6 h-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono text-xs font-bold flex items-center justify-center">
                  {step.stepNumber}
                </span>
                <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {step.estimatedTime}
                </span>
              </div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">
                {step.title}
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {isTakeBus ? (
            <>
              <button
                onClick={() =>
                  onSelectCarpark(prediction.recommendedParkAndRideCarpark)
                }
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Navigation className="w-4 h-4" />
                <span>Navigate to {prediction.recommendedParkAndRideCarpark.name}</span>
              </button>
              <button
                onClick={onViewBusBoard}
                className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Open Stop 04121 Bus Board (Service {prediction.connectedBusService})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() =>
                  onSelectCarpark(prediction.recommendedCampusCarpark)
                }
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Navigation className="w-4 h-4" />
                <span>Navigate Directly to {prediction.recommendedCampusCarpark.name}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 4. Predictive Factors Breakdown */}
      <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-800/30">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Key Predictive Factors Analyzed
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {prediction.factors.map((f, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">
                  {f.title}
                </span>
                <span
                  className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded ${
                    f.impact === 'take_bus'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : f.impact === 'drive'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {f.impact === 'take_bus'
                    ? 'Favors Bus'
                    : f.impact === 'drive'
                    ? 'Favors Drive'
                    : 'Neutral'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {f.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
