import { useEffect, useMemo, useState } from 'react';
import { Keyboard } from 'react-native';
import { loadItems, loadRecents, saveItems, saveRecents } from '../storage';
import { ShoppingItem } from '../types';
import { MAX_RECENTS, sanitizeRecents } from '../utils/recents';

export type ShoppingListState = {
  items: ShoppingItem[];
  hasItems: boolean;
  activeItems: ShoppingItem[];
  completedItems: ShoppingItem[];
  showCompleted: boolean;
  setShowCompleted: (value: boolean) => void;
  isOverlayOpen: boolean;
  openOverlay: () => void;
  closeOverlay: () => void;
  overlayInput: string;
  setOverlayInput: (value: string) => void;
  recentItems: string[];
  selectedRecent: string[];
  handleOverlayAdd: () => void;
  handleAddSelected: () => void;
  handleToggleRecent: (name: string) => void;
  handleToggle: (id: string) => void;
  handleDelete: (id: string) => void;
  handleClearAll: () => void;
};

export const useShoppingList = (): ShoppingListState => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [overlayInput, setOverlayInput] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const [selectedRecent, setSelectedRecent] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      const [storedItems, storedRecents] = await Promise.all([
        loadItems(),
        loadRecents(),
      ]);
      if (isMounted) {
        setItems(storedItems);
        setRecentItems(sanitizeRecents(storedRecents));
        setIsHydrated(true);
      }
    };
    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveItems(items);
  }, [items, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    saveRecents(recentItems);
  }, [recentItems, isHydrated]);

  const hasItems = items.length > 0;

  const { activeItems, completedItems } = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt);
    return {
      activeItems: sorted.filter((item) => !item.purchased),
      completedItems: sorted.filter((item) => item.purchased),
    };
  }, [items]);

  const closeOverlay = () => {
    setIsOverlayOpen(false);
    setOverlayInput('');
    setSelectedRecent([]);
  };

  const handleOverlayAdd = () => {
    const name = overlayInput.trim();
    if (!name) return;

    setRecentItems((current) =>
      [name, ...current.filter((item) => item !== name)].slice(0, MAX_RECENTS)
    );
    setSelectedRecent((current) =>
      current.includes(name) ? current : [...current, name]
    );
    setOverlayInput('');
    Keyboard.dismiss();
  };

  const handleAddSelected = () => {
    if (selectedRecent.length === 0) return;
    const timestamp = Date.now();
    const newItems: ShoppingItem[] = selectedRecent.map((name, index) => ({
      id: `${timestamp}-${index}`,
      name,
      purchased: false,
      createdAt: timestamp + index,
    }));
    setItems((current) => [...newItems, ...current]);
    closeOverlay();
  };

  const handleToggleRecent = (name: string) => {
    setSelectedRecent((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  };

  const handleToggle = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, purchased: !item.purchased } : item
      )
    );
  };

  const handleDelete = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
  };

  return {
    items,
    hasItems,
    activeItems,
    completedItems,
    showCompleted,
    setShowCompleted,
    isOverlayOpen,
    openOverlay: () => setIsOverlayOpen(true),
    closeOverlay,
    overlayInput,
    setOverlayInput,
    recentItems,
    selectedRecent,
    handleOverlayAdd,
    handleAddSelected,
    handleToggleRecent,
    handleToggle,
    handleDelete,
    handleClearAll,
  };
};
