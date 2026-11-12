import React, { useState } from 'react';
import { useGame } from '../context/GameContext.js';
import { TaskItem } from '../../shared/types.js';
import { X, CheckCircle2, QrCode, Cpu, ArrowRight, Zap } from 'lucide-react';
import { QRScannerModal } from './QRScannerModal.js';

interface TaskModalProps {
  onClose: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ onClose }) => {
  const { gameState, player, completeTask } = useGame();
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Electrical fuse puzzle state
  const [fuses, setFuses] = useState<[boolean, boolean, boolean]>([false, true, false]);
  const [puzzleSuccess, setPuzzleSuccess] = useState(false);

  if (!gameState || !player) return null;

  const handleToggleFuse = (idx: number) => {
    const next: [boolean, boolean, boolean] = [...fuses];
    next[idx] = !next[idx];
    setFuses(next);

    // Winning fuse combination: all 3 ON!
    if (next[0] && next[1] && next[2] && selectedTask) {
      setPuzzleSuccess(true);
      setTimeout(async () => {
        await completeTask(selectedTask.id, selectedTask.code);
        setSelectedTask(null);
        setPuzzleSuccess(false);
      }, 1000);
    }
  };

  const handleScanSuccess = async (code: string) => {
    if (selectedTask) {
      await completeTask(selectedTask.id, code);
      setIsScanning(false);
      setSelectedTask(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[600] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
        <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Hostel Objectives & Tasks
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-3">
            <p className="text-xs text-slate-400">
              Completing all hostel tasks triggers an instant win for all Crewmates!
            </p>

            {/* Tasks list */}
            <div className="space-y-2.5">
              {gameState.tasks.map((task) => {
                const isCompleted = player.completedTasks?.includes(task.id);

                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                      isCompleted
                        ? 'bg-emerald-950/40 border-emerald-800/80'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">{task.title}</span>
                        <span className="bg-slate-800 text-cyan-400 font-mono text-[9px] px-1.5 py-0.5 rounded">
                          Floor {task.floor}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{task.description}</p>
                    </div>

                    <div>
                      {isCompleted ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold font-mono">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>DONE</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            if (task.type === 'qr') {
                              setIsScanning(true);
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                        >
                          <span>{task.type === 'qr' ? 'Scan' : 'Solve'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Minigame Modal if puzzle selected */}
            {selectedTask && selectedTask.type === 'minigame' && (
              <div className="mt-4 p-4 bg-slate-950 border border-amber-500/50 rounded-2xl text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs">
                  <Zap className="w-4 h-4" />
                  <span>Align Electrical Fuses (Set All Switches ON)</span>
                </div>

                <div className="flex justify-center gap-4 py-2">
                  {[0, 1, 2].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => handleToggleFuse(idx)}
                      className={`w-14 h-20 rounded-xl font-mono font-bold text-xs flex flex-col items-center justify-center border-2 transition ${
                        fuses[idx]
                          ? 'bg-emerald-600 border-emerald-300 text-white shadow-lg shadow-emerald-900/50'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span>FUSE #{idx + 1}</span>
                      <span className="text-sm font-black mt-1">{fuses[idx] ? 'ON' : 'OFF'}</span>
                    </button>
                  ))}
                </div>

                {puzzleSuccess && (
                  <div className="text-xs font-bold text-emerald-400 animate-bounce">
                    ⚡ Power Restored! Task Complete!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isScanning && selectedTask && (
        <QRScannerModal
          title={`Scan: ${selectedTask.title}`}
          subtitle={`Floor ${selectedTask.floor} • Scan Checkpoint QR badge (or type code)`}
          onScanSuccess={handleScanSuccess}
          onClose={() => {
            setIsScanning(false);
            setSelectedTask(null);
          }}
        />
      )}
    </>
  );
};

