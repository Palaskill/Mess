'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  AlertCircle,
  Key,
  ExternalLink,
  Receipt,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Users,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  scanReceiptWithGemini,
  checkGeminiServerStatus,
  ParsedReceiptItem,
  ParsedReceiptResult,
} from '@/lib/gemini';
import { CreateBatchOrderItem } from '@/lib/actions';
import { Participant } from '@/types';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportOrders: (items: CreateBatchOrderItem[]) => void;
  participants: Participant[];
}

export default function ReceiptScannerModal({
  isOpen,
  onClose,
  onImportOrders,
  participants,
}: ReceiptScannerModalProps) {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'need_key' | 'wizard' | 'review'>('upload');
  const [wizardIndex, setWizardIndex] = useState<number>(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isServerConfigured, setIsServerConfigured] = useState<boolean>(false);
  const [scannedResult, setScannedResult] = useState<ParsedReceiptResult | null>(null);
  const [editedItems, setEditedItems] = useState<ParsedReceiptItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load saved Gemini API key from localStorage and verify server status
  useEffect(() => {
    const saved = localStorage.getItem('mess-gemini-key');
    if (saved) {
      setGeminiApiKey(saved);
      setApiKeyInput(saved);
    }

    if (isOpen) {
      checkGeminiServerStatus()
        .then((res) => setIsServerConfigured(res.configured))
        .catch(() => setIsServerConfigured(false));
    }
  }, [isOpen]);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('upload');
        setWizardIndex(0);
        setImagePreview(null);
        setScannedResult(null);
        setEditedItems([]);
        setErrorMsg(null);
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Compress image on client via canvas (max 1600px width/height, quality 0.8 JPEG)
  const compressImage = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ base64: e.target?.result as string, mimeType: file.type });
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve({ base64: compressedDataUrl, mimeType: 'image/jpeg' });
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processImageFile = async (file: File) => {
    try {
      setErrorMsg(null);
      setStep('analyzing');

      const { base64, mimeType } = await compressImage(file);
      setImagePreview(base64);

      startTransition(async () => {
        const res = await scanReceiptWithGemini(base64, mimeType, geminiApiKey);

        if (!res.success) {
          if (res.error === 'NO_API_KEY') {
            setStep('need_key');
            return;
          }
          setErrorMsg(res.error || 'Erreur lors de l\'analyse de l\'addition');
          setStep('upload');
          return;
        }

        if (res.data && res.data.items.length > 0) {
          setScannedResult(res.data);
          const initialItems: ParsedReceiptItem[] = res.data.items.map((it, idx) => ({
            ...it,
            id: `item-${Date.now()}-${idx}`,
            assigned_participant_ids: [],
          }));
          setEditedItems(initialItems);
          setWizardIndex(0);
          // 🚀 DIRECT TO WIZARD: ask who to assign each row one by one!
          setStep('wizard');
        } else {
          setErrorMsg('Aucun article détecté sur cette photo. Veuillez reprendre la photo avec plus de clarté.');
          setStep('upload');
        }
      });
    } catch (err: any) {
      console.error('Failed to process image:', err);
      setErrorMsg('Impossible de traiter cette image. Réessayez.');
      setStep('upload');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setErrorMsg('Veuillez entrer une clé API valide');
      return;
    }
    setGeminiApiKey(trimmed);
    localStorage.setItem('mess-gemini-key', trimmed);
    setErrorMsg(null);

    if (imagePreview) {
      setStep('analyzing');
      startTransition(async () => {
        const res = await scanReceiptWithGemini(imagePreview, 'image/jpeg', trimmed);
        if (!res.success) {
          setErrorMsg(res.error || 'Erreur lors de l\'analyse');
          setStep('upload');
          return;
        }
        if (res.data && res.data.items.length > 0) {
          setScannedResult(res.data);
          const initialItems: ParsedReceiptItem[] = res.data.items.map((it, idx) => ({
            ...it,
            id: `item-${Date.now()}-${idx}`,
            assigned_participant_ids: [],
          }));
          setEditedItems(initialItems);
          setWizardIndex(0);
          setStep('wizard');
        } else {
          setErrorMsg('Aucun article détecté. Réessayez avec une autre photo.');
          setStep('upload');
        }
      });
    } else {
      setStep('upload');
    }
  };

  // Editable item handlers
  const handleUpdateItem = (index: number, updates: Partial<ParsedReceiptItem>) => {
    setEditedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const handleDeleteItem = (index: number) => {
    setEditedItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (wizardIndex >= next.length && next.length > 0) {
        setWizardIndex(next.length - 1);
      }
      return next;
    });
  };

  const handleAddNewItem = () => {
    setEditedItems((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        name: 'Nouvel article',
        quantity: 1,
        unit_price: 5.0,
        category: 'drinks',
        split_type: 'individual',
        assigned_participant_ids: [],
      },
    ]);
  };

  const calculatedTotal = editedItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const handleConfirmImport = () => {
    if (editedItems.length === 0) return;

    const itemsToImport: CreateBatchOrderItem[] = editedItems.map((item) => ({
      item_name: item.name.trim(),
      quantity: Math.max(1, item.quantity),
      unit_price: Math.max(0, item.unit_price),
      split_type: item.split_type,
      assigned_participant_ids: item.assigned_participant_ids || [],
    }));

    onImportOrders(itemsToImport);
    onClose();
  };

  // Wizard assignments management
  const currentItem = editedItems[wizardIndex];

  // Toggle or add participant for current wizard item
  const handleToggleParticipantInWizard = (participantId: string) => {
    if (!currentItem) return;

    const isShared = currentItem.split_type === 'shared';
    const isSingleQty = currentItem.quantity === 1;
    const currentAssignments = currentItem.assigned_participant_ids || [];

    if (isShared) {
      // Shared: toggle participation
      let updated: string[];
      if (currentAssignments.includes(participantId)) {
        updated = currentAssignments.filter((id) => id !== participantId);
      } else {
        updated = [...currentAssignments, participantId];
      }
      handleUpdateItem(wizardIndex, { assigned_participant_ids: updated });
    } else if (isSingleQty) {
      // Individual Qty 1: single selection toggle
      let updated: string[];
      if (currentAssignments.includes(participantId)) {
        updated = [];
      } else {
        updated = [participantId];
      }
      handleUpdateItem(wizardIndex, { assigned_participant_ids: updated });
    } else {
      // Individual Qty > 1: add 1 count if total count not exceeded
      if (currentAssignments.length < currentItem.quantity) {
        handleUpdateItem(wizardIndex, {
          assigned_participant_ids: [...currentAssignments, participantId],
        });
      }
    }
  };

  // Stepper for individual with Qty > 1
  const handleIncrementParticipant = (participantId: string) => {
    if (!currentItem) return;
    const currentAssignments = currentItem.assigned_participant_ids || [];
    if (currentAssignments.length < currentItem.quantity) {
      handleUpdateItem(wizardIndex, {
        assigned_participant_ids: [...currentAssignments, participantId],
      });
    }
  };

  const handleDecrementParticipant = (participantId: string) => {
    if (!currentItem) return;
    const currentAssignments = currentItem.assigned_participant_ids || [];
    const indexToRemove = currentAssignments.lastIndexOf(participantId);
    if (indexToRemove !== -1) {
      const updated = [...currentAssignments];
      updated.splice(indexToRemove, 1);
      handleUpdateItem(wizardIndex, { assigned_participant_ids: updated });
    }
  };

  // Select all participants for shared items
  const handleSelectAllShared = () => {
    if (!currentItem || participants.length === 0) return;
    const currentAssignments = currentItem.assigned_participant_ids || [];
    if (currentAssignments.length === participants.length) {
      handleUpdateItem(wizardIndex, { assigned_participant_ids: [] });
    } else {
      handleUpdateItem(wizardIndex, {
        assigned_participant_ids: participants.map((p) => p.id),
      });
    }
  };

  // Wizard navigation
  const handleWizardNext = () => {
    if (wizardIndex < editedItems.length - 1) {
      setWizardIndex((prev) => prev + 1);
    } else {
      // Finished all items!
      handleConfirmImport();
    }
  };

  const handleWizardPrev = () => {
    if (wizardIndex > 0) {
      setWizardIndex((prev) => prev - 1);
    }
  };

  const handleWizardSkip = () => {
    // Clear assignments for current item and jump to next
    handleUpdateItem(wizardIndex, { assigned_participant_ids: [] });
    if (wizardIndex < editedItems.length - 1) {
      setWizardIndex((prev) => prev + 1);
    } else {
      handleConfirmImport();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'analyzing') onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl animate-slide-up max-h-[92dvh] flex flex-col overflow-hidden pb-[max(5rem,env(safe-area-inset-bottom))] sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle for mobile */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>Scanner l&apos;Addition</span>
                {isServerConfigured ? (
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    ✨ Pro Actif
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Gemini Vision
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {step === 'wizard'
                  ? 'Affectez chaque article à un ami un par un'
                  : 'Photo du ticket ➔ Recréation automatique'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {step === 'wizard' && (
              <button
                type="button"
                onClick={() => setStep('review')}
                title="Afficher toute la liste"
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vue Liste</span>
              </button>
            )}

            {step === 'review' && (
              <button
                type="button"
                onClick={() => setStep('wizard')}
                title="Revenir au mode pas à pas"
                className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pas à pas</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={step === 'analyzing'}
              className="w-9 h-9 rounded-full bg-slate-800 active:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hidden File Inputs for Camera and Gallery */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-3.5 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto overscroll-contain pr-0.5">
          {/* STEP 1: UPLOAD / CAMERA SELECTION */}
          {step === 'upload' && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-blue-600/15 hover:bg-blue-600/25 active:bg-blue-600/35 border-2 border-dashed border-blue-500/40 hover:border-blue-500 active:scale-98 transition-all min-h-[160px] touch-manipulation cursor-pointer group text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="block font-bold text-sm text-white">Prendre une Photo</span>
                    <span className="block text-xs text-slate-400 mt-0.5">Appareil photo iPhone / Android</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-slate-800/60 hover:bg-slate-800 active:bg-slate-750 border-2 border-dashed border-slate-700 hover:border-slate-600 active:scale-98 transition-all min-h-[160px] touch-manipulation cursor-pointer group text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-700 text-slate-200 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="block font-bold text-sm text-white">Choisir une Image</span>
                    <span className="block text-xs text-slate-400 mt-0.5">Galerie photo ou capture d&apos;écran</span>
                  </div>
                </button>
              </div>

              {/* Server Pro Status Badge */}
              {isServerConfigured && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3 text-xs text-emerald-300">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-sm">
                    ✨
                  </div>
                  <div className="leading-tight">
                    <span className="font-bold text-emerald-200 block">Compte Gemini Pro Connecté</span>
                    <span className="text-[11px] text-emerald-400/80">
                      L&apos;IA est prise en charge par l&apos;hôte. Prenez simplement la photo de l&apos;addition !
                    </span>
                  </div>
                </div>
              )}

              {/* Instructions / Tips Card */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400 space-y-2">
                <span className="font-bold text-slate-300 block">💡 Conseils pour un scan parfait :</span>
                <ul className="space-y-1 list-disc list-inside text-[11px] leading-relaxed">
                  <li>Posez l&apos;addition bien à plat avec un bon éclairage.</li>
                  <li>Une fois la photo prise, le système vous demandera <strong>article par article à qui l&apos;affecter</strong> (avec option Passer).</li>
                </ul>
              </div>

              {/* API Key management shortcut */}
              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setStep('need_key')}
                  className="text-slate-400 hover:text-blue-400 flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>
                    {isServerConfigured
                      ? 'Compte Serveur Pro actif'
                      : geminiApiKey
                      ? 'Modifier la clé Gemini'
                      : 'Activer avec mon abonnement Pro'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ANALYZING WITH SCANNING RADAR EFFECT */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
              {imagePreview ? (
                <div className="relative w-48 h-64 rounded-2xl overflow-hidden border-2 border-blue-500/60 shadow-2xl bg-slate-800">
                  <img
                    src={imagePreview}
                    alt="Ticket en cours d'analyse"
                    className="w-full h-full object-cover opacity-80"
                  />
                  {/* Glowing Laser Scan Bar */}
                  <div
                    className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse"
                    style={{
                      animation: 'scanBar 2s ease-in-out infinite alternate',
                    }}
                  />
                  <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
                  <Receipt className="w-10 h-10" />
                </div>
              )}

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Gemini Vision Pro</span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Analyse de l&apos;addition en cours...
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Détection des lignes, quantités et prix. Préparation du questionnaire d&apos;affectation...
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: API KEY / GEMINI PRO CONFIGURATION */}
          {step === 'need_key' && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-3xl bg-blue-500/10 border border-blue-500/30 space-y-2 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-900/30">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <h3 className="text-sm font-bold text-white">Intégration Gemini Pro & Clé API</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  L&apos;IA est <strong>100% gérée par votre compte hôte</strong>. Vos amis n&apos;ont rien à payer ni à configurer : ils prennent simplement la photo !
                </p>
              </div>

              {/* Pro Server Setup Guide */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 space-y-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>🚀 Comment activer pour TOUT LE MONDE :</span>
                </span>
                <ol className="space-y-1.5 list-decimal list-inside text-[11px] text-slate-300 leading-relaxed">
                  <li>
                    Ouvrez{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline font-semibold inline-flex items-center gap-0.5"
                    >
                      Google AI Studio <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    avec votre compte Google / Pro.
                  </li>
                  <li>Cliquez sur <strong>&quot;Create API Key&quot;</strong>.</li>
                  <li>
                    Ajoutez la variable <code>GEMINI_API_KEY</code> sur votre hébergement (Render) ou dans votre <code>.env.local</code>.
                  </li>
                </ol>
                <div className="pt-1 text-[11px] text-emerald-400 font-semibold border-t border-slate-700/60">
                  ✨ Dès que cette variable est configurée sur le serveur, aucun utilisateur ne verra cet écran : le scan sera 100% transparent et immédiat pour tous !
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ou collez votre clé pour l&apos;activer directement sur ce téléphone :
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 min-h-[48px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs min-h-[46px] transition cursor-pointer"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs min-h-[46px] shadow-lg shadow-blue-600/30 transition cursor-pointer"
                >
                  Enregistrer & Continuer
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: 🎯 WIZARD STEP-BY-STEP ROW ASSIGNMENT */}
          {step === 'wizard' && currentItem && (
            <div className="space-y-4 py-1">
              {/* Progress Bar & Counter */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px]">
                      Article {wizardIndex + 1} / {editedItems.length}
                    </span>
                    {scannedResult?.restaurant_name && (
                      <span className="text-slate-400 text-[11px] truncate max-w-[140px]">
                        • {scannedResult.restaurant_name}
                      </span>
                    )}
                  </div>

                  <span className="text-slate-400 text-[11px]">
                    {Math.round(((wizardIndex + 1) / editedItems.length) * 100)}%
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                    style={{
                      width: `${((wizardIndex + 1) / editedItems.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* CURRENT ARTICLE HERO CARD */}
              <div className="p-4 rounded-3xl bg-slate-800/90 border border-slate-700 space-y-3 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {/* Category quick switch */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextCat = currentItem.category === 'drinks' ? 'food' : 'drinks';
                        const nextSplit = nextCat === 'food' ? 'shared' : 'individual';
                        handleUpdateItem(wizardIndex, { category: nextCat, split_type: nextSplit });
                      }}
                      className="w-10 h-10 rounded-2xl bg-slate-700/80 hover:bg-slate-700 flex items-center justify-center text-xl shrink-0 cursor-pointer shadow-inner"
                    >
                      {currentItem.category === 'drinks' ? '🍺' : '🍕'}
                    </button>

                    {/* Name Input */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={currentItem.name}
                        onChange={(e) => handleUpdateItem(wizardIndex, { name: e.target.value })}
                        placeholder="Nom de l'article"
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 font-black text-white text-base tracking-tight focus:outline-none py-0.5 truncate"
                      />
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>Qté : <strong className="text-white">{currentItem.quantity}</strong></span>
                        <span>•</span>
                        <span>Prix : <strong className="text-emerald-400">${currentItem.unit_price.toFixed(2)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Total for this line */}
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total ligne</span>
                    <span className="text-lg font-black text-emerald-400">
                      ${(currentItem.quantity * currentItem.unit_price).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Quick Split Type Toggle */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-700/60 text-xs">
                  <span className="text-slate-400 text-[11px] font-medium">Type d&apos;addition :</span>
                  <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-700/80">
                    <button
                      type="button"
                      onClick={() => handleUpdateItem(wizardIndex, { split_type: 'individual' })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        currentItem.split_type === 'individual'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🍺 Individuel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateItem(wizardIndex, { split_type: 'shared' })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        currentItem.split_type === 'shared'
                          ? 'bg-amber-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🍕 Partagé
                    </button>
                  </div>
                </div>
              </div>

              {/* PARTICIPANTS ASSIGNMENT SECTION */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">
                      {currentItem.split_type === 'shared'
                        ? 'Qui a partagé cet article ?'
                        : currentItem.quantity > 1
                        ? `À qui sont ces ${currentItem.quantity} articles ?`
                        : 'À qui est cet article ?'}
                    </span>
                  </div>

                  {/* Helper counter / quick action */}
                  {currentItem.split_type === 'shared' ? (
                    <button
                      type="button"
                      onClick={handleSelectAllShared}
                      className="text-[11px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                    >
                      {(currentItem.assigned_participant_ids || []).length === participants.length
                        ? 'Désélectionner tout'
                        : '👥 Tous les amis'}
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">
                      {currentItem.assigned_participant_ids?.length || 0} / {currentItem.quantity} attribué{(currentItem.assigned_participant_ids?.length || 0) > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {participants.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-center text-xs text-slate-400">
                    <p>Aucun ami n&apos;est encore inscrit dans cette session.</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Vous pouvez passer ou importer directement pour les affecter plus tard.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {participants.map((p) => {
                      const assignments = currentItem.assigned_participant_ids || [];
                      const countForThisPerson = assignments.filter((id) => id === p.id).length;
                      const isSelected = countForThisPerson > 0;

                      // SHARED OR SINGLE QTY INDIVIDUAL: Single Tap Toggle
                      if (currentItem.split_type === 'shared' || currentItem.quantity === 1) {
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleToggleParticipantInWizard(p.id)}
                            className={`p-3 rounded-2xl border flex items-center gap-2.5 text-left transition-all active:scale-95 touch-manipulation cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/40 text-white shadow-md'
                                : 'bg-slate-800/70 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow"
                              style={{ backgroundColor: p.color || '#3B82F6' }}
                            >
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block text-xs font-bold truncate leading-tight">
                                {p.name}
                              </span>
                              {isSelected && currentItem.split_type === 'shared' && (
                                <span className="block text-[10px] text-emerald-400 font-semibold">
                                  ${(
                                    (currentItem.quantity * currentItem.unit_price) /
                                    (assignments.length || 1)
                                  ).toFixed(2)}
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      }

                      // MULTIPLE QUANTITY INDIVIDUAL: Stepper +/- for each person
                      return (
                        <div
                          key={p.id}
                          className={`p-2.5 rounded-2xl border flex items-center justify-between gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500/80 text-white'
                              : 'bg-slate-800/70 border-slate-700/80 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow"
                              style={{ backgroundColor: p.color || '#3B82F6' }}
                            >
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold truncate">
                              {p.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 bg-slate-900/90 rounded-xl p-0.5 border border-slate-700">
                            <button
                              type="button"
                              onClick={() => handleDecrementParticipant(p.id)}
                              disabled={countForThisPerson === 0}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center touch-manipulation cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-bold text-xs text-white">
                              {countForThisPerson}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleIncrementParticipant(p.id)}
                              disabled={assignments.length >= currentItem.quantity}
                              className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center touch-manipulation cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & CONFIRM DETECTED ITEMS (TABLE VIEW) */}
          {step === 'review' && (
            <div className="space-y-4 py-1">
              {/* Header Info */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {scannedResult?.restaurant_name ? scannedResult.restaurant_name : 'Addition scannée'}
                  </span>
                  <span className="font-extrabold text-white text-sm">
                    {editedItems.length} article{editedItems.length > 1 ? 's' : ''} détecté{editedItems.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Total ticket détecté</span>
                  <span className="font-black text-emerald-400 text-base">
                    ${calculatedTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Vérifiez ou ajustez les articles avant import :</span>
                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter article</span>
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                {editedItems.map((item, index) => {
                  const assignedCount = item.assigned_participant_ids?.length || 0;
                  return (
                    <div
                      key={item.id || index}
                      className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        {/* Category & Split Toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            const nextCat = item.category === 'drinks' ? 'food' : 'drinks';
                            const nextSplit = nextCat === 'food' ? 'shared' : 'individual';
                            handleUpdateItem(index, { category: nextCat, split_type: nextSplit });
                          }}
                          title="Basculer entre Boisson et Plat"
                          className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-sm shrink-0 cursor-pointer hover:bg-slate-650"
                        >
                          {item.category === 'drinks' ? '🍺' : '🍕'}
                        </button>

                        {/* Name input */}
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(index, { name: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
                          placeholder="Nom de l'article"
                        />

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(index)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/50 gap-2">
                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">Qté :</span>
                          <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(index, { quantity: Math.max(1, item.quantity - 1) })}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-bold text-white text-xs">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(index, { quantity: item.quantity + 1 })}
                              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Unit Price Input */}
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-400">Prix unitaire :</span>
                          <div className="relative w-20">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => handleUpdateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-5 pr-1.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-bold text-right focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Assigned count pill */}
                        <button
                          type="button"
                          onClick={() => {
                            setWizardIndex(index);
                            setStep('wizard');
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                            assignedCount > 0
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-700/60 text-slate-400 border-slate-600'
                          }`}
                        >
                          {assignedCount > 0 ? `✅ ${assignedCount} affecté${assignedCount > 1 ? 's' : ''}` : 'Affecter ➔'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* STICKY BOTTOM ACTIONS FOR WIZARD STEP */}
        {step === 'wizard' && currentItem && (
          <div className="pt-3 border-t border-slate-800 shrink-0 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {/* Previous */}
              <button
                type="button"
                onClick={handleWizardPrev}
                disabled={wizardIndex === 0}
                className="py-3 px-2 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 font-bold text-xs min-h-[48px] transition active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Précédent</span>
              </button>

              {/* Skip (Passer) */}
              <button
                type="button"
                onClick={handleWizardSkip}
                className="py-3 px-2 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 text-amber-400 border border-amber-500/30 font-bold text-xs min-h-[48px] transition active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <SkipForward className="w-4 h-4" />
                <span>Passer</span>
              </button>

              {/* Next / Finish */}
              <button
                type="button"
                onClick={handleWizardNext}
                className="py-3 px-2 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 active:scale-95 text-white font-bold text-xs min-h-[48px] shadow-lg shadow-blue-900/30 transition cursor-pointer flex items-center justify-center gap-1"
              >
                <span>{wizardIndex === editedItems.length - 1 ? 'Terminer 🎉' : 'Suivant'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STICKY BOTTOM ACTION (WHEN IN REVIEW TABLE) */}
        {step === 'review' && (
          <div className="pt-3 border-t border-slate-800 shrink-0 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setStep('upload');
                setImagePreview(null);
                setEditedItems([]);
              }}
              className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-300 font-bold text-xs min-h-[48px] transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recommencer</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={editedItems.length === 0}
              className="py-3 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 active:scale-95 text-white font-bold text-xs min-h-[48px] shadow-xl shadow-blue-900/30 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Importer ({editedItems.length}) ➔</span>
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes scanBar {
          0% {
            top: 0%;
          }
          100% {
            top: 100%;
          }
        }
      `}</style>
    </div>
  );
}
