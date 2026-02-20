import { useEffect, useMemo, useRef, useState } from 'react';
import {
  loadRoute,
  saveRoute,
} from '../storage';
import { useSync } from '../context/SyncContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppRoute, SelectedRecentItem, ShoppingItem, ShoppingList } from '../types';
import { MAX_RECENTS, sanitizeRecents } from '../utils/recents';

type ListNameModalMode = 'create' | 'rename' | 'join' | 'share';

export type ShoppingListsAppState = {
  isHydrated: boolean;
  route: AppRoute;
  lists: ShoppingList[];
  currentList: ShoppingList | null;
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
  selectedRecent: SelectedRecentItem[];
  handleOverlayAdd: () => void;
  handleAddSelected: () => void;
  handleToggleRecent: (name: string) => void;
  handleUpdateRecentQuantity: (name: string, delta: number) => void;
  handleClearRecents: () => void;
  handleToggle: (id: string) => void;
  handleDelete: (id: string) => void;
  handleClearAll: () => void;
  handleIncrementQuantity: (id: string) => void;
  handleDecrementQuantity: (id: string) => void;
  openList: (listId: string) => void;
  goToLists: () => void;
  isListNameModalOpen: boolean;
  listNameMode: ListNameModalMode;

  listNameInput: string;
  setListNameInput: (value: string) => void;
  listNameError: string;
  openCreateListModal: () => void;
  openRenameListModal: (listId: string) => void;
  openJoinListModal: () => void;
  openShareListModal: (listId: string) => void;
  closeListNameModal: () => void;
  submitListName: () => void;
  deleteList: (listId: string) => void;
  leaveList: (listId: string) => void;
  currentUserId: string | undefined;
  goToSettings: () => void;
  handleAddMultipleSelected: (items: { name: string; quantity: number }[]) => void;
  handleQuickAddMultiple: (items: { name: string; quantity: number }[]) => void;
};

const DEFAULT_ROUTE: AppRoute = { name: 'lists' };

const normalizeName = (value: string) => value.trim().toLowerCase();

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useShoppingListsApp = (): ShoppingListsAppState => {
  const { storageProvider, isInitializing } = useSync();
  const { user } = useAuth();
  const { showToast } = useToast();
  const currentUserId = user?.id;
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [route, setRoute] = useState<AppRoute>(DEFAULT_ROUTE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const prevListMapRef = useRef<Map<string, string>>(new Map());
  const isFromRealtimeRef = useRef(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [overlayInput, setOverlayInput] = useState('');
  const [selectedRecent, setSelectedRecent] = useState<SelectedRecentItem[]>([]);
  const [isListNameModalOpen, setIsListNameModalOpen] = useState(false);
  const [listNameMode, setListNameMode] = useState<ListNameModalMode>('create');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [listNameInput, setListNameInput] = useState('');
  const [listNameError, setListNameError] = useState('');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;
    const hydrate = async () => {
      if (isInitializing) return;

      const [storedLists, storedRoute] = await Promise.all([
        storageProvider.loadLists(),
        loadRoute(),
      ]);
      if (!mounted) return;

      setLists(storedLists);
      prevListMapRef.current = new Map(storedLists.map((l) => [l.id, l.name]));

      const hasRouteList =
        storedRoute?.name === 'list' &&
        storedLists.some((list) => list.id === storedRoute.listId);

      if (hasRouteList) {
        setRoute(storedRoute as AppRoute);
      } else {
        setRoute(DEFAULT_ROUTE);
        if (storedRoute?.name === 'list') {
          saveRoute(DEFAULT_ROUTE);
        }
      }
      setIsHydrated(true);

      if (storageProvider.subscribe) {
        unsubscribe = storageProvider.subscribe((updatedLists) => {
          if (!mounted) return;
          // Detect shared lists that vanished (owner deleted them)
          const newIds = new Set(updatedLists.map((l) => l.id));
          prevListMapRef.current.forEach((name, id) => {
            if (!newIds.has(id)) {
              // List disappeared – it was a shared list whose owner deleted it
              showToast(`"${name}" was deleted by its owner.`);
            }
          });
          // Update the ref with the latest list map
          prevListMapRef.current = new Map(updatedLists.map((l) => [l.id, l.name]));
          // Mark this update as coming from realtime to avoid re-saving
          isFromRealtimeRef.current = true;
          setLists(updatedLists);
        });
      }
    };

    hydrate();
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [storageProvider, isInitializing]);

  useEffect(() => {
    if (!isHydrated || isInitializing) return;
    // Skip saving when the update came from a realtime event to avoid loops
    if (isFromRealtimeRef.current) {
      isFromRealtimeRef.current = false;
      return;
    }
    storageProvider.saveLists(lists);
  }, [lists, isHydrated, storageProvider, isInitializing]);

  useEffect(() => {
    if (!isHydrated) return;
    saveRoute(route);
  }, [route, isHydrated]);

  useEffect(() => {
    if (!isHydrated || route.name !== 'list') return;
    const exists = lists.some((list) => list.id === route.listId);
    if (!exists) {
      setRoute(DEFAULT_ROUTE);
    }
  }, [isHydrated, lists, route]);

  useEffect(() => {
    setIsOverlayOpen(false);
    setOverlayInput('');
    setSelectedRecent([]);
  }, [route]);

  const currentList = useMemo(() => {
    if (route.name !== 'list') return null;
    return lists.find((list) => list.id === route.listId) ?? null;
  }, [lists, route]);

  const { activeItems, completedItems } = useMemo(() => {
    const items = currentList?.items ?? [];
    const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt);
    return {
      activeItems: sorted.filter((item) => !item.purchased),
      completedItems: sorted.filter((item) => item.purchased),
    };
  }, [currentList]);

  const sortedLists = useMemo(
    () => [...lists].sort((a, b) => b.updatedAt - a.updatedAt),
    [lists]
  );

  const recentItems = currentList?.recents ?? [];
  const hasItems = (currentList?.items.length ?? 0) > 0;

  const updateListById = (
    listId: string,
    updater: (list: ShoppingList) => ShoppingList
  ) => {
    setLists((current) =>
      current.map((list) => {
        if (list.id !== listId) return list;
        const updated = updater(list);
        return { ...updated, updatedAt: Date.now() };
      })
    );
  };

  const validateListName = (value: string, excludeListId?: string | null) => {
    const trimmed = value.trim();
    if (!trimmed) return 'List name is required.';

    const normalized = normalizeName(trimmed);
    const duplicate = lists.some(
      (list) =>
        list.id !== excludeListId && normalizeName(list.name) === normalized
    );
    if (duplicate) return 'List name must be unique.';
    return '';
  };

  const closeListNameModal = () => {
    setIsListNameModalOpen(false);
    setListNameInput('');
    setListNameError('');
    setEditingListId(null);
    setListNameMode('create');
  };

  const openCreateListModal = () => {
    setListNameMode('create');
    setEditingListId(null);
    setListNameInput('');
    setListNameError('');
    setIsListNameModalOpen(true);
  };

  const openRenameListModal = (listId: string) => {
    const list = lists.find((item) => item.id === listId);
    if (!list) return;
    setListNameMode('rename');
    setEditingListId(listId);
    setListNameInput(list.name);
    setListNameError('');
    setIsListNameModalOpen(true);
  };

  const openJoinListModal = () => {
    setListNameMode('join');
    setEditingListId(null);
    setListNameInput('');
    setListNameError('');
    setIsListNameModalOpen(true);
  };

  const openShareListModal = (listId: string) => {
    const list = lists.find((item) => item.id === listId);
    setListNameMode('share');
    setEditingListId(listId);
    setListNameInput(list?.shareCode ?? listId); // Show shareCode, fallback to id
    setListNameError('');
    setIsListNameModalOpen(true);
  };

  const submitListName = async () => {
    const trimmed = listNameInput.trim();

    if (listNameMode === 'share') {
      closeListNameModal();
      return;
    }

    if (listNameMode === 'join') {
      if (!trimmed) {
        setListNameError('Share ID is required.');
        return;
      }
      try {
        if (!storageProvider.joinList) {
          throw new Error('Cloud sync is required to join a list.');
        }
        await storageProvider.joinList(trimmed);
        const updatedLists = await storageProvider.loadLists();
        setLists(updatedLists);
        closeListNameModal();
      } catch (err: any) {
        setListNameError(err.message || 'Failed to join list');
      }
      return;
    }

    const error = validateListName(listNameInput, editingListId);
    if (error) {
      setListNameError(error);
      return;
    }

    const timestamp = Date.now();

    if (listNameMode === 'create') {
      const listId = createId();
      const newList: ShoppingList = {
        id: listId,
        name: trimmed,
        createdAt: timestamp,
        updatedAt: timestamp,
        items: [],
        recents: [],
      };
      setLists((current) => [newList, ...current]);
      closeListNameModal();
      return;
    }

    if (!editingListId) return;

    setLists((current) =>
      current.map((list) =>
        list.id === editingListId
          ? { ...list, name: trimmed, updatedAt: timestamp }
          : list
      )
    );
    closeListNameModal();
  };

  const openList = (listId: string) => {
    setRoute({ name: 'list', listId });
  };

  const goToLists = () => {
    setRoute(DEFAULT_ROUTE);
  };

  const deleteList = (listId: string) => {
    // Remove from the prevListMap so *we* don't trigger the "deleted by owner" toast
    prevListMapRef.current.delete(listId);
    storageProvider.deleteList?.(listId);
    setLists((current) => current.filter((list) => list.id !== listId));
    if (route.name === 'list' && route.listId === listId) {
      setRoute(DEFAULT_ROUTE);
    }
  };

  const leaveList = async (listId: string) => {
    const list = lists.find(l => l.id === listId);
    const listName = list?.name || 'the list';

    try {
      // Remove from prevListMap so we don't trigger the "deleted by owner" toast
      prevListMapRef.current.delete(listId);
      if (storageProvider.leaveList) {
        await storageProvider.leaveList(listId);
      }
      setLists((current) => current.filter((list) => list.id !== listId));
      if (route.name === 'list' && route.listId === listId) {
        setRoute(DEFAULT_ROUTE);
      }
      showToast(`Left "${listName}".`);
    } catch (err: any) {
      console.error('Error leaving list:', err);
      showToast('Failed to leave list. Please try again.');
    }
  };

  const goToSettings = () => {
    setRoute({ name: 'settings' });
  };

  const closeOverlay = () => {
    setIsOverlayOpen(false);
    setOverlayInput('');
    setSelectedRecent([]);
  };

  const openOverlay = () => {
    if (!currentList) return;
    setIsOverlayOpen(true);
    setOverlayInput('');
    setSelectedRecent([]);
  };

  const handleOverlayAdd = () => {
    if (!currentList) return;

    const name = overlayInput.trim();
    if (!name) return;

    const existingActiveItem = currentList.items.find(
      (item) => !item.purchased && normalizeName(item.name) === normalizeName(name)
    );

    if (existingActiveItem) {
      updateListById(currentList.id, (list) => ({
        ...list,
        items: list.items.map((item) =>
          item.id === existingActiveItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      }));
      setOverlayInput('');
      return;
    }

    const existingSelected = selectedRecent.find(
      (item) => normalizeName(item.name) === normalizeName(name)
    );
    if (existingSelected) {
      setSelectedRecent((current) =>
        current.map((item) =>
          normalizeName(item.name) === normalizeName(name)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setSelectedRecent((current) => [...current, { name, quantity: 1 }]);
    }

    updateListById(currentList.id, (list) => ({
      ...list,
      recents: sanitizeRecents(
        [name, ...list.recents.filter((item) => item !== name)].slice(
          0,
          MAX_RECENTS
        )
      ),
    }));
    setOverlayInput('');
  };

  const handleAddSelected = () => {
    if (!currentList || selectedRecent.length === 0) return;
    const timestamp = Date.now();

    updateListById(currentList.id, (list) => {
      let currentItems = [...list.items];
      const newItems: ShoppingItem[] = [];

      selectedRecent.forEach((selected, index) => {
        const existingActiveIndex = currentItems.findIndex(
          (item) => !item.purchased && normalizeName(item.name) === normalizeName(selected.name)
        );

        if (existingActiveIndex !== -1) {
          currentItems[existingActiveIndex] = {
            ...currentItems[existingActiveIndex],
            quantity: currentItems[existingActiveIndex].quantity + selected.quantity,
          };
        } else {
          newItems.push({
            id: `${timestamp}-${index}`,
            name: selected.name,
            purchased: false,
            createdAt: timestamp + index,
            quantity: selected.quantity,
          });
        }
      });

      return {
        ...list,
        items: [...newItems, ...currentItems],
      };
    });

    closeOverlay();
  };

  const handleAddMultipleSelected = (items: { name: string; quantity: number }[]) => {
    setSelectedRecent((current) => {
      const newSelected = [...current];
      items.forEach((item) => {
        const existing = newSelected.find((s) => normalizeName(s.name) === normalizeName(item.name));
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          newSelected.push(item);
        }
      });
      return newSelected;
    });
  };

  const handleQuickAddMultiple = (items: { name: string; quantity: number }[]) => {
    if (!currentList || items.length === 0) return;
    const timestamp = Date.now();

    updateListById(currentList.id, (list) => {
      let currentItems = [...list.items];
      const newItems: ShoppingItem[] = [];

      items.forEach((itemToAdd, index) => {
        const existingActiveIndex = currentItems.findIndex(
          (item) => !item.purchased && normalizeName(item.name) === normalizeName(itemToAdd.name)
        );

        if (existingActiveIndex !== -1) {
          currentItems[existingActiveIndex] = {
            ...currentItems[existingActiveIndex],
            quantity: currentItems[existingActiveIndex].quantity + itemToAdd.quantity,
          };
        } else {
          newItems.push({
            id: `${timestamp}-${index}-qa`,
            name: itemToAdd.name,
            purchased: false,
            createdAt: timestamp + index,
            quantity: itemToAdd.quantity,
          });
        }
      });

      return {
        ...list,
        items: [...newItems, ...currentItems],
      };
    });

    closeOverlay();
  };

  const handleToggleRecent = (name: string) => {
    setSelectedRecent((current) =>
      current.some((item) => item.name === name)
        ? current.filter((item) => item.name !== name)
        : [...current, { name, quantity: 1 }]
    );
  };

  const handleUpdateRecentQuantity = (name: string, delta: number) => {
    setSelectedRecent((current) =>
      current.map((item) => {
        if (item.name !== name) return item;
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      })
    );
  };

  const handleClearRecents = () => {
    if (!currentList) return;
    updateListById(currentList.id, (list) => ({
      ...list,
      recents: [],
    }));
    setSelectedRecent([]);
  };

  const handleToggle = (id: string) => {
    if (!currentList) return;
    updateListById(currentList.id, (list) => ({
      ...list,
      items: list.items.map((item) =>
        item.id === id ? { ...item, purchased: !item.purchased } : item
      ),
    }));
  };

  const handleDelete = (id: string) => {
    if (!currentList) return;
    updateListById(currentList.id, (list) => ({
      ...list,
      items: list.items.filter((item) => item.id !== id),
    }));
  };

  const handleClearAll = () => {
    if (!currentList) return;
    updateListById(currentList.id, (list) => ({
      ...list,
      items: [],
    }));
  };

  const handleIncrementQuantity = (id: string) => {
    if (!currentList) return;
    updateListById(currentList.id, (list) => ({
      ...list,
      items: list.items.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      ),
    }));
  };

  const handleDecrementQuantity = (id: string) => {
    if (!currentList) return;
    updateListById(currentList.id, (list) => ({
      ...list,
      items: list.items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item
      ),
    }));
  };

  const handleListNameInputChange = (value: string) => {
    setListNameInput(value);
    if (listNameError) {
      setListNameError('');
    }
  };

  return {
    isHydrated,
    route,
    lists: sortedLists,
    currentList,
    hasItems,
    activeItems,
    completedItems,
    showCompleted,
    setShowCompleted,
    isOverlayOpen,
    openOverlay,
    closeOverlay,
    overlayInput,
    setOverlayInput,
    recentItems,
    selectedRecent,
    handleOverlayAdd,
    handleAddSelected,
    handleToggleRecent,
    handleUpdateRecentQuantity,
    handleClearRecents,
    handleToggle,
    handleDelete,
    handleClearAll,
    handleIncrementQuantity,
    handleDecrementQuantity,
    openList,
    goToLists,
    isListNameModalOpen,
    listNameMode,
    listNameInput,
    setListNameInput: handleListNameInputChange,
    listNameError,
    openCreateListModal,
    openRenameListModal,
    openJoinListModal,
    openShareListModal,
    closeListNameModal,
    submitListName,
    deleteList,
    leaveList,
    currentUserId,
    goToSettings,
    handleAddMultipleSelected,
    handleQuickAddMultiple,
  };
};
