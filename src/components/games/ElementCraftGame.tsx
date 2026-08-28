import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  BookOpen,
  Trash2,
  Search,
  HelpCircle,
  RotateCcw,
  Volume2,
  VolumeX,
  Layers,
  Award,
  Plus,
  LayoutGrid,
  Copy,
  Zap
} from 'lucide-react';
import { ALL_ELEMENTS, INITIAL_ELEMENT_IDS, findCraftResult, CRAFT_RECIPES } from '../../data/elements';
import { CraftElement, PlacedElement, SoundSettings } from '../../types';
import { sound } from '../../utils/audio';

const STORAGE_KEY = 'ELEMENT_CRAFT_SAVE_V1';

interface ElementCraftGameProps {
  soundSettings: SoundSettings;
  onToggleSound: () => void;
}

interface MergeFlash {
  id: string;
  x: number;
  y: number;
  emoji: string;
  name: string;
}

interface MissFeedback {
  id: string;
  x: number;
  y: number;
  message: string;
}

export const ElementCraftGame: React.FC<ElementCraftGameProps> = ({
  soundSettings,
  onToggleSound,
}) => {
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 4) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_ELEMENT_IDS;
  });

  const [placedElements, setPlacedElements] = useState<PlacedElement[]>([]);
  const [selectedTableInstanceId, setSelectedTableInstanceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCodex, setShowCodex] = useState(false);
  const [newDiscovery, setNewDiscovery] = useState<CraftElement | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [mergeFlashes, setMergeFlashes] = useState<MergeFlash[]>([]);
  const [missFeedbacks, setMissFeedbacks] = useState<MissFeedback[]>([]);

  const workbenchRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  const instanceCounter = useRef(1);
  const spawnOffsetCounter = useRef(0);

  // Save to localStorage on unlock update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedIds));
    } catch {}
  }, [unlockedIds]);

  const totalElementsCount = Object.keys(ALL_ELEMENTS).length;
  const progressPercent = Math.round((unlockedIds.length / totalElementsCount) * 100);

  // Filtered elements list
  const filteredElements = unlockedIds
    .map((id) => ALL_ELEMENTS[id])
    .filter(Boolean)
    .filter((elem) => {
      const matchesSearch = elem.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'all' || elem.category === selectedCategory;
      return matchesSearch && matchesCat;
    });

  // Spawn element onto workbench (ONLY places it in the box without auto-crafting)
  const spawnElementOnTable = (elementId: string, customX?: number, customY?: number) => {
    if (!workbenchRef.current) return;
    const rect = workbenchRef.current.getBoundingClientRect();

    let x = customX;
    let y = customY;

    if (x === undefined || y === undefined) {
      // Cascading spawn position in the center of the workbench
      const offsetIndex = spawnOffsetCounter.current % 8;
      spawnOffsetCounter.current += 1;
      const baseX = Math.max(20, Math.floor(rect.width / 2) - 80);
      const baseY = Math.max(20, Math.floor(rect.height / 2) - 80);
      x = baseX + (offsetIndex * 24) - 48;
      y = baseY + (offsetIndex * 20) - 40;

      // Keep within bounds
      x = Math.max(15, Math.min(x, rect.width - 150));
      y = Math.max(15, Math.min(y, rect.height - 70));
    }

    instanceCounter.current += 1;
    const newPlaced: PlacedElement = {
      instanceId: `elem-inst-${instanceCounter.current}-${Date.now()}`,
      elementId,
      x,
      y,
    };

    setPlacedElements((prev) => [...prev, newPlaced]);
    sound.playClick(1);
  };

  // Perform fusion between two placed instances on the workbench
  const executeMerge = (
    sourceInstanceId: string,
    sourceElemId: string,
    targetInstanceId: string,
    targetElemId: string,
    targetX: number,
    targetY: number
  ) => {
    const resultId = findCraftResult(sourceElemId, targetElemId);

    if (resultId && ALL_ELEMENTS[resultId]) {
      const resultElem = ALL_ELEMENTS[resultId];
      const isNew = !unlockedIds.includes(resultId);

      // Trigger sparkle flash
      const flashId = `flash-${Date.now()}-${Math.random()}`;
      setMergeFlashes((prev) => [
        ...prev,
        { id: flashId, x: targetX, y: targetY, emoji: resultElem.emoji, name: resultElem.name },
      ]);
      setTimeout(() => {
        setMergeFlashes((prev) => prev.filter((f) => f.id !== flashId));
      }, 1200);

      // Handle new discovery
      if (isNew) {
        setUnlockedIds((prev) => [...prev, resultId]);
        setNewDiscovery(resultElem);
        sound.playCraftSuccess(true);
        setTimeout(() => setNewDiscovery(null), 3500);
      } else {
        sound.playCraftSuccess(false);
      }

      // Replace both instances with the single newly crafted element
      instanceCounter.current += 1;
      const mergedPlaced: PlacedElement = {
        instanceId: `elem-inst-${instanceCounter.current}-${Date.now()}`,
        elementId: resultId,
        x: targetX,
        y: targetY,
      };

      setPlacedElements((prev) => [
        ...prev.filter(
          (p) => p.instanceId !== sourceInstanceId && p.instanceId !== targetInstanceId
        ),
        mergedPlaced,
      ]);
      setSelectedTableInstanceId(null);
      return true;
    } else {
      // No reaction feedback
      const missId = `miss-${Date.now()}`;
      setMissFeedbacks((prev) => [
        ...prev,
        { id: missId, x: targetX, y: targetY - 20, message: 'No Reaction' },
      ]);
      setTimeout(() => {
        setMissFeedbacks((prev) => prev.filter((m) => m.id !== missId));
      }, 1000);

      sound.playFakeout();
      return false;
    }
  };

  // Drag End handler with Neal.fun proximity collision detection
  const handleDragEnd = (draggedItem: PlacedElement, info: { offset: { x: number; y: number } }) => {
    const container = deskRef.current || workbenchRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const rawNewX = draggedItem.x + info.offset.x;
    const rawNewY = draggedItem.y + info.offset.y;

    const clampedX = Math.max(10, Math.min(rawNewX, rect.width - 145));
    const clampedY = Math.max(10, Math.min(rawNewY, rect.height - 55));

    // Look for other elements within collision radius (< 75px)
    let closestTarget: PlacedElement | null = null;
    let minDistance = 75;

    for (const other of placedElements) {
      if (other.instanceId === draggedItem.instanceId) continue;
      const dist = Math.hypot(clampedX - other.x, clampedY - other.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestTarget = other;
      }
    }

    if (closestTarget) {
      // Attempt merge with the closest overlapping element!
      const merged = executeMerge(
        draggedItem.instanceId,
        draggedItem.elementId,
        closestTarget.instanceId,
        closestTarget.elementId,
        closestTarget.x,
        closestTarget.y
      );

      if (!merged) {
        // If not a valid recipe, stay in place next to target without jumping to the edge
        const sepX = Math.max(10, Math.min(closestTarget.x + 35, rect.width - 145));
        const sepY = Math.max(10, Math.min(closestTarget.y + 28, rect.height - 55));
        setPlacedElements((prev) =>
          prev.map((p) =>
            p.instanceId === draggedItem.instanceId
              ? {
                  ...p,
                  x: sepX,
                  y: sepY,
                }
              : p
          )
        );
      }
    } else {
      // Just update dragged coordinate
      setPlacedElements((prev) =>
        prev.map((p) =>
          p.instanceId === draggedItem.instanceId ? { ...p, x: clampedX, y: clampedY } : p
        )
      );
    }
  };

  // Clicking an element on the workbench table (Tap-to-merge support)
  const handleTableElementClick = (item: PlacedElement, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!selectedTableInstanceId) {
      // Select this element on the table
      setSelectedTableInstanceId(item.instanceId);
      sound.playClick(1);
    } else if (selectedTableInstanceId === item.instanceId) {
      // Deselect if clicking same element
      setSelectedTableInstanceId(null);
    } else {
      // Merge selected table element with this clicked table element
      const sourceObj = placedElements.find((p) => p.instanceId === selectedTableInstanceId);
      if (sourceObj) {
        executeMerge(
          sourceObj.instanceId,
          sourceObj.elementId,
          item.instanceId,
          item.elementId,
          item.x,
          item.y
        );
      }
      setSelectedTableInstanceId(null);
    }
  };

  // Duplicate an element on table (double click / clone button)
  const handleDuplicate = (item: PlacedElement, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const container = deskRef.current || workbenchRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const newX = Math.min(item.x + 30, rect.width - 145);
    const newY = Math.min(item.y + 25, rect.height - 55);

    spawnElementOnTable(item.elementId, newX, newY);
  };

  // Tidy / Auto-arrange all elements on table into neat grid
  const handleTidyTable = () => {
    const container = deskRef.current || workbenchRef.current;
    if (!container || placedElements.length === 0) return;
    const rect = container.getBoundingClientRect();
    const count = placedElements.length;

    const paddingX = 14;
    const paddingY = 14;
    const colWidth = count > 24 ? 120 : 140;
    const rowHeight = count > 24 ? 46 : 52;
    const maxCols = Math.max(1, Math.floor((rect.width - paddingX * 2) / colWidth));

    setPlacedElements((prev) =>
      prev.map((item, idx) => {
        const col = idx % maxCols;
        const row = Math.floor(idx / maxCols);
        const x = paddingX + col * colWidth;
        const y = paddingY + row * rowHeight;
        return {
          ...item,
          x: Math.max(paddingX, Math.min(x, rect.width - colWidth)),
          y: Math.max(paddingY, Math.min(y, rect.height - rowHeight - 8)),
        };
      })
    );
    setSelectedTableInstanceId(null);
    sound.playWhoosh();
  };

  // Clear Table
  const clearTable = () => {
    setPlacedElements([]);
    setSelectedTableInstanceId(null);
    sound.playWhoosh();
  };

  // Get Hint
  const handleGetHint = () => {
    // Find an undiscovered recipe where player already has both ingredients
    const undiscovered = CRAFT_RECIPES.find(
      (r) =>
        !unlockedIds.includes(r.result) &&
        unlockedIds.includes(r.first) &&
        unlockedIds.includes(r.second)
    );

    if (undiscovered) {
      const e1 = ALL_ELEMENTS[undiscovered.first]?.name || undiscovered.first;
      const e2 = ALL_ELEMENTS[undiscovered.second]?.name || undiscovered.second;
      setHintMessage(`🔮 Oracle Whisper: Try fusing "${e1}" + "${e2}" on the workbench!`);
      sound.playComboMilestone();
    } else {
      const nextCandidate = CRAFT_RECIPES.find((r) => !unlockedIds.includes(r.result));
      if (nextCandidate) {
        const res = ALL_ELEMENTS[nextCandidate.result]?.name || nextCandidate.result;
        setHintMessage(`🔮 Oracle Insight: Higher cosmic tiers hold "${res}". Keep exploring combinations!`);
        sound.playComboMilestone();
      } else {
        setHintMessage('🎉 Master Alchemist: You have unlocked every known transmutation in the universe!');
        sound.playWin();
      }
    }
    setTimeout(() => setHintMessage(null), 5000);
  };

  // Reset Progress
  const handleResetProgress = () => {
    if (window.confirm('Reset all Element Craft discovered elements back to the initial 4 (Fire, Water, Earth, Air)?')) {
      setUnlockedIds(INITIAL_ELEMENT_IDS);
      setPlacedElements([]);
      setSelectedTableInstanceId(null);
      localStorage.removeItem(STORAGE_KEY);
      sound.playWhoosh();
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full select-none bg-[#0a0f1d] text-white p-3 sm:p-5 min-h-screen">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-slate-900/90 border-2 border-slate-800 p-3.5 sm:p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 shadow-lg shadow-purple-500/25 text-2xl">
            ⚗️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-pink-400">
                INFINITE ALCHEMY
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-black text-slate-400 border border-slate-700">
                DRAG & MERGE
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black italic tracking-tight text-white">
              ELEMENT CRAFT
            </h1>
          </div>
        </div>

        {/* Discovery Progress Meter */}
        <div className="flex items-center gap-3 bg-slate-950/80 px-3.5 py-2 rounded-2xl border border-slate-800 shadow-inner">
          <Award className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 shrink-0" />
          <div>
            <div className="flex items-center justify-between gap-3 text-[10px] sm:text-[11px] font-bold text-slate-300">
              <span>DISCOVERIES</span>
              <span className="text-yellow-400 font-black">
                {unlockedIds.length} / {totalElementsCount} ({progressPercent}%)
              </span>
            </div>
            <div className="mt-1 h-2 w-28 sm:w-44 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleGetHint}
            className="flex items-center gap-1.5 rounded-2xl bg-purple-600/30 hover:bg-purple-600/50 px-3 py-2 text-xs font-black text-purple-300 border border-purple-500/40 transition-all active:scale-95 shadow-md cursor-pointer"
            title="Get Recipe Hint"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">HINT</span>
          </button>
          <button
            onClick={() => setShowCodex(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-black text-slate-200 border border-slate-700 transition-all active:scale-95 shadow-md cursor-pointer"
            title="Discovery Codex"
          >
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">CODEX</span>
          </button>
          <button
            onClick={onToggleSound}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
            title="Toggle Sound"
          >
            {soundSettings.soundEnabled ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-500" />
            )}
          </button>
          <button
            onClick={handleResetProgress}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-700 transition-all cursor-pointer"
            title="Reset Element Craft Progress"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Oracle Hint Banner */}
      <AnimatePresence>
        {hintMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 flex items-center justify-center rounded-2xl bg-purple-950/90 border border-purple-500 p-3 text-center shadow-xl backdrop-blur-md"
          >
            <span className="text-xs sm:text-sm font-black text-purple-200">{hintMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discovery Alert Overlay */}
      <AnimatePresence>
        {newDiscovery && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-3xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 p-1 shadow-2xl animate-pulse"
          >
            <div className="flex items-center gap-3 rounded-[22px] bg-slate-950 px-6 py-3">
              <span className="text-3xl sm:text-4xl animate-bounce">{newDiscovery.emoji}</span>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-yellow-300">
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  <span>NEW DISCOVERY UNLOCKED!</span>
                </div>
                <div className="text-base sm:text-lg font-black text-white">{newDiscovery.name}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Layout (2 Columns: Workshop Table + Element Palette Drawer) */}
      <div className="mt-3 flex flex-1 flex-col lg:flex-row gap-3 min-h-[480px]">
        {/* Crafting Table Arena */}
        <div
          ref={workbenchRef}
          onClick={() => setSelectedTableInstanceId(null)}
          className="relative flex flex-1 flex-col rounded-3xl border-2 border-slate-800 bg-[#080d1a] p-3 sm:p-4 shadow-2xl overflow-hidden min-h-[380px]"
        >
          {/* Ambient Background Glows */}
          <div className="pointer-events-none absolute top-10 left-10 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-10 right-10 w-72 h-72 rounded-full bg-pink-600/10 blur-[100px]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#33415510_1px,transparent_1px),linear-gradient(to_bottom,#33415510_1px,transparent_1px)] bg-[size:2.5rem_2.5rem]" />

          {/* Workbench Controls Header */}
          <div className="relative z-10 flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                ALCHEMY WORKBENCH
              </span>
              <span className="rounded-full bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                {placedElements.length} on desk
              </span>
              {selectedTableInstanceId && (
                <span className="text-[10px] font-black text-yellow-400 animate-pulse hidden sm:inline">
                  ✦ Click another element to combine
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {placedElements.length > 0 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTidyTable();
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1.5 text-xs font-black text-slate-300 border border-slate-700 transition-all active:scale-95 cursor-pointer"
                    title="Neatly Arrange Desk"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">TIDY</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearTable();
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 px-2.5 py-1.5 text-xs font-black text-red-300 border border-red-800/70 transition-all active:scale-95 cursor-pointer"
                    title="Clear Desk"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">CLEAR</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Empty Workbench Guidance */}
          {placedElements.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-6 select-none opacity-60">
              <div className="text-5xl mb-2 animate-pulse">✨</div>
              <h3 className="text-base sm:text-lg font-black text-slate-300 italic">
                Workbench Empty
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Select elements from the right drawer to place them in the box. Drag elements on top of each other to fuse new substances!
              </p>
            </div>
          )}

          {/* Fusion / Sparkle Flash Effects */}
          {mergeFlashes.map((flash) => (
            <motion.div
              key={flash.id}
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="pointer-events-none absolute z-40 flex items-center justify-center"
              style={{ left: `${flash.x}px`, top: `${flash.y}px` }}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 blur-sm shadow-2xl" />
            </motion.div>
          ))}

          {/* Miss Feedback (No Reaction) */}
          {missFeedbacks.map((miss) => (
            <motion.div
              key={miss.id}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: -15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="pointer-events-none absolute z-40 rounded-full bg-slate-900/90 border border-slate-700 px-2.5 py-0.5 text-[10px] font-black text-slate-400 shadow-lg backdrop-blur-md"
              style={{ left: `${miss.x}px`, top: `${miss.y}px` }}
            >
              💨 {miss.message}
            </motion.div>
          ))}

          {/* Placed Elements on Workbench (Draggable & Clickable) */}
          <div ref={deskRef} className="relative flex-1 w-full h-full min-h-[360px] overflow-hidden">
            {placedElements.map((item) => {
              const elem = ALL_ELEMENTS[item.elementId];
              if (!elem) return null;
              const isSelected = selectedTableInstanceId === item.instanceId;

              return (
                <motion.div
                  key={item.instanceId}
                  drag
                  dragMomentum={false}
                  dragSnapToOrigin={true}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.06 }}
                  whileDrag={{ scale: 1.12, zIndex: 50 }}
                  onDragEnd={(e, info) => handleDragEnd(item, info)}
                  onClick={(e) => handleTableElementClick(item, e)}
                  onDoubleClick={(e) => handleDuplicate(item, e)}
                  className={`group absolute z-20 flex cursor-grab active:cursor-grabbing items-center gap-2 rounded-2xl bg-slate-900/95 border-2 px-3 py-2 text-sm font-black shadow-xl backdrop-blur-md transition-shadow select-none ${
                    isSelected
                      ? 'border-yellow-400 ring-4 ring-yellow-400/40 shadow-yellow-500/20'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    borderColor: isSelected ? '#facc15' : elem.color,
                  }}
                >
                  <span className="text-xl shrink-0">{elem.emoji}</span>
                  <span className="text-xs font-bold text-white whitespace-nowrap">{elem.name}</span>

                  {/* Tile actions (Duplicate & Delete) */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDuplicate(item, e)}
                      className="text-slate-400 hover:text-yellow-300 p-0.5 cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlacedElements((prev) =>
                          prev.filter((p) => p.instanceId !== item.instanceId)
                        );
                        if (selectedTableInstanceId === item.instanceId) {
                          setSelectedTableInstanceId(null);
                        }
                        sound.playClick(1);
                      }}
                      className="text-slate-400 hover:text-red-400 text-xs px-0.5 cursor-pointer font-black"
                      title="Remove from desk"
                    >
                      ×
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Drawer: Elements Palette & Search */}
        <div className="flex w-full lg:w-96 flex-col rounded-3xl border-2 border-slate-800 bg-slate-900/95 p-3.5 sm:p-4 shadow-2xl">
          {/* Drawer Header & Instruction */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-pink-400">
              ELEMENT PALETTE
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              Tap to place on desk
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative mb-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search unlocked elements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 pl-9 pr-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1 pb-2 border-b border-slate-800 mb-2.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'primal', label: 'Primal' },
              { id: 'nature', label: 'Nature' },
              { id: 'materials', label: 'Materials' },
              { id: 'civilization', label: 'Civ' },
              { id: 'cosmos', label: 'Cosmos' },
              { id: 'mythic', label: 'Mythic' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-xl px-2 py-1 text-[10px] sm:text-[11px] font-black uppercase transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Elements Grid (Clicking places element on the workbench table) */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 gap-1.5 max-h-[360px] lg:max-h-[500px]">
            {filteredElements.map((elem) => (
              <motion.button
                key={elem.id}
                onClick={() => spawnElementOnTable(elem.id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.94 }}
                className="flex items-center gap-2 rounded-2xl p-2 text-left transition-all border border-slate-800 bg-slate-950 hover:border-pink-500/60 hover:bg-slate-900 cursor-pointer shadow-md"
                style={{
                  borderLeftColor: elem.color,
                  borderLeftWidth: '4px',
                }}
              >
                <span className="text-xl shrink-0">{elem.emoji}</span>
                <div className="overflow-hidden">
                  <div className="truncate text-xs font-black text-white">{elem.name}</div>
                  <div className="truncate text-[9px] font-bold text-slate-400">
                    Tier {elem.tier}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Discovery Codex Modal */}
      {showCodex && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-slate-900 border-2 border-purple-600 p-5 sm:p-6 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-yellow-400" />
                <h2 className="text-xl font-black italic text-white">DISCOVERY CODEX</h2>
              </div>
              <button
                onClick={() => setShowCodex(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-2">
              {Object.values(ALL_ELEMENTS).map((elem) => {
                const isUnlocked = unlockedIds.includes(elem.id);
                return (
                  <div
                    key={elem.id}
                    className={`flex items-center gap-3 rounded-2xl p-3 border ${
                      isUnlocked
                        ? 'bg-slate-950 border-slate-800'
                        : 'bg-slate-950/40 border-slate-900 opacity-40'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl">{isUnlocked ? elem.emoji : '❓'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-white">
                          {isUnlocked ? elem.name : 'Unknown Element'}
                        </span>
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[9px] font-black text-slate-400">
                          Tier {elem.tier}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                        {isUnlocked ? elem.description : 'Combine elements on the workbench to unlock this formula.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
