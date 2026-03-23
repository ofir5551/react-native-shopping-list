import { useEffect, useMemo, useRef, useState } from 'react';
import {
  loadRoute,
  loadSavedSets,
  saveRoute,
  saveSavedSets,
} from '../storage';
import { useSync } from '../context/SyncContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppRoute, SavedSet, SavedSetItem, SelectedRecentItem, ShoppingItem, ShoppingList } from '../types';
import { MAX_RECENTS, sanitizeRecents } from '../utils/recents';
import { POPULAR_ITEMS } from '../data/popularItems';

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
  suggestions: string[];
  selectedRecent: SelectedRecentItem[];
  handleOverlayAdd: () => void;
  handleAddSelected: () => void;
  handleToggleRecent: (name: string) => void;
  handleUpdateRecentQuantity: (name: string, delta: number) => void;
  handleDismissSuggestion: (name: string) => void;
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
  listDescriptionInput: string;
  setListDescriptionInput: (value: string) => void;
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
  goToLogin: () => void;
  goToSignup: () => void;
  handleAddMultipleSelected: (items: { name: string; quantity: number }[]) => void;
  handleQuickAddMultiple: (items: { name: string; quantity: number }[]) => void;
  savedSets: SavedSet[];
  createSavedSet: (name: string, items: SavedSetItem[]) => void;
  updateSavedSet: (setId: string, items: SavedSetItem[]) => void;
  deleteSavedSet: (setId: string) => void;
};

const DEFAULT_ROUTE: AppRoute = { name: 'lists' };

const normalizeName = (value: string) => value.trim().toLowerCase();

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useShoppingListsApp = (): ShoppingListsAppState => {
  const { storageProvider, isInitializing, joinList: joinListOnServer, leaveList: leaveListOnServer, deleteListFromServer } = useSync();
  const { user } = useAuth();
  const { showToast } = useToast();
  const currentUserId = user?.id;
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [route, setRoute] = useState<AppRoute>(DEFAULT_ROUTE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const prevListMapRef = useRef<Map<string, string>>(new Map());
  const prevUserIdRef = useRef<string | undefined>(undefined);
  const isFromRealtimeRef = useRef(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [overlayInput, setOverlayInput] = useState('');
  const [selectedRecent, setSelectedRecent] = useState<SelectedRecentItem[]>([]);
  const preExistingNamesRef = useRef<Set<string>>(new Set());
  const [isListNameModalOpen, setIsListNameModalOpen] = useState(false);
  const [listNameMode, setListNameMode] = useState<ListNameModalMode>('create');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [listNameInput, setListNameInput] = useState('');
  const [listDescriptionInput, setListDescriptionInput] = useState('');
  const [listNameError, setListNameError] = useState('');
  const [savedSets, setSavedSets] = useState<SavedSet[]>([]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;
    const hydrate = async () => {
      if (isInitializing) return;

      const [storedLists, storedRoute, storedSavedSets] = await Promise.all([
        storageProvider.loadLists(),
        loadRoute(),
        loadSavedSets(),
      ]);
      if (!mounted) return;

      setLists(storedLists);
      setSavedSets(storedSavedSets);
      prevListMapRef.current = new Map(storedLists.map((l) => [l.id, l.name]));

      const hasRouteList =
        storedRoute?.name === 'list' &&
        storedLists.some((list) => list.id === storedRoute.listId);
      const isSettingsRoute = storedRoute?.name === 'settings';

      if (hasRouteList || isSettingsRoute) {
        setRoute(storedRoute as AppRoute);
      } else {
        setRoute(DEFAULT_ROUTE);
        if (storedRoute?.name === 'list' || storedRoute?.name === 'login' || storedRoute?.name === 'signup') {
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
    const prevId = prevUserIdRef.current;
    prevUserIdRef.current = currentUserId;
    if (prevId && !currentUserId && isHydrated) {
      setLists(prev => prev.filter(l => !l.ownerId || l.ownerId === prevId));
    }
  }, [currentUserId, isHydrated]);

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
    if (!isHydrated) return;
    saveSavedSets(savedSets);
  }, [savedSets, isHydrated]);

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

  const suggestions = useMemo(() => {
    const recents = currentList?.recents ?? [];
    const dismissed = new Set(currentList?.dismissedSuggestions ?? []);
    const recentsSet = new Set(recents.map((r) => r.toLowerCase()));
    const popularFiller = POPULAR_ITEMS.filter(
      (item) => !recentsSet.has(item.toLowerCase()) && !dismissed.has(item)
    );
    return [...recents, ...popularFiller].filter((item) => !dismissed.has(item));
  }, [currentList?.recents, currentList?.dismissedSuggestions]);
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
    setListDescriptionInput('');
    setListNameError('');
    setEditingListId(null);
    setListNameMode('create');
  };

  const openCreateListModal = () => {
    setListNameMode('create');
    setEditingListId(null);
    setListNameInput('');
    setListDescriptionInput('');
    setListNameError('');
    setIsListNameModalOpen(true);
  };

  const openRenameListModal = (listId: string) => {
    const list = lists.find((item) => item.id === listId);
    if (!list) return;
    setListNameMode('rename');
    setEditingListId(listId);
    setListNameInput(list.name);
    setListDescriptionInput(list.description ?? '');
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
        await joinListOnServer(trimmed);
        // SyncEngine merges the joined list into local storage and triggers onRemoteUpdate
        // Read updated lists from local
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
      const trimmedDescription = listDescriptionInput.trim() || undefined;
      const newList: ShoppingList = {
        id: listId,
        name: trimmed,
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
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

    const trimmedDescription = listDescriptionInput.trim() || undefined;
    setLists((current) =>
      current.map((list) =>
        list.id === editingListId
          ? { ...list, name: trimmed, description: trimmedDescription, updatedAt: timestamp }
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
    deleteListFromServer(listId);  // fire-and-forget, SyncEngine handles offline queuing
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
      await leaveListOnServer(listId);
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

  const goToLogin = () => {
    setRoute({ name: 'login' });
  };

  const goToSignup = () => {
    setRoute({ name: 'signup' });
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
    const currentActive = currentList.items.filter((item) => !item.purchased);
    preExistingNamesRef.current = new Set(currentActive.map((item) => normalizeName(item.name)));
    setSelectedRecent(currentActive.map((item) => ({ name: item.name, quantity: item.quantity })));
  };

  const handleOverlayAdd = () => {
    if (!currentList) return;

    const name = overlayInput.trim();
    if (!name) return;

    const existingActiveItem = currentList.items.find(
      (item) => !item.purchased && normalizeName(item.name) === normalizeName(name)
    );

    if (existingActiveItem) {
      const newQuantity = existingActiveItem.quantity + 1;
      updateListById(currentList.id, (list) => ({
        ...list,
        items: list.items.map((item) =>
          item.id === existingActiveItem.id
            ? { ...item, quantity: newQuantity }
            : item
        ),
      }));
      setSelectedRecent((current) =>
        current.map((item) =>
          normalizeName(item.name) === normalizeName(name)
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
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
      dismissedSuggestions: (list.dismissedSuggestions ?? []).filter(
        (d) => d.toLowerCase() !== name.toLowerCase()
      ),
    }));
    setOverlayInput('');
  };

  const mergeItemsIntoList = (
    listId: string,
    itemsToMerge: { name: string; quantity: number }[],
    quantityMode: 'set' | 'add',
    idSuffix = '',
  ) => {
    const timestamp = Date.now();
    updateListById(listId, (list) => {
      const currentItems = [...list.items];
      const newItems: ShoppingItem[] = [];

      itemsToMerge.forEach((toMerge, index) => {
        const existingActiveIndex = currentItems.findIndex(
          (item) => !item.purchased && normalizeName(item.name) === normalizeName(toMerge.name)
        );

        if (existingActiveIndex !== -1) {
          currentItems[existingActiveIndex] = {
            ...currentItems[existingActiveIndex],
            quantity: quantityMode === 'set'
              ? toMerge.quantity
              : currentItems[existingActiveIndex].quantity + toMerge.quantity,
          };
        } else {
          newItems.push({
            id: `${timestamp}-${index}${idSuffix}`,
            name: toMerge.name,
            purchased: false,
            createdAt: timestamp + index,
            quantity: toMerge.quantity,
          });
        }
      });

      return { ...list, items: [...newItems, ...currentItems] };
    });
  };

  const hasOverlayChanges = useMemo(() => {
    if (!isOverlayOpen) return false;
    const selectedNames = new Set(selectedRecent.map((s) => normalizeName(s.name)));
    const hasNew = selectedRecent.some((item) => !preExistingNamesRef.current.has(normalizeName(item.name)));
    let hasRemoved = false;
    preExistingNamesRef.current.forEach((name) => { if (!selectedNames.has(name)) hasRemoved = true; });
    return hasNew || hasRemoved;
  }, [isOverlayOpen, selectedRecent]);

  const handleAddSelected = () => {
    if (!currentList) return;

    const selectedNames = new Set(selectedRecent.map((s) => normalizeName(s.name)));

    // Items that were active when overlay opened but are no longer selected
    const removedNames = new Set<string>();
    preExistingNamesRef.current.forEach((name) => {
      if (!selectedNames.has(name)) removedNames.add(name);
    });

    const newCount = selectedRecent.filter(
      (item) => !preExistingNamesRef.current.has(normalizeName(item.name))
    ).length;
    const removedCount = removedNames.size;

    if (selectedRecent.length === 0 && removedCount === 0) {
      closeOverlay();
      return;
    }

    updateListById(currentList.id, (list) => {
      const timestamp = Date.now();
      const currentItems = list.items.filter(
        (item) => item.purchased || !removedNames.has(normalizeName(item.name))
      );
      const updatedItems = [...currentItems];
      const newItems: ShoppingItem[] = [];

      selectedRecent.forEach((selected, index) => {
        const existingIndex = updatedItems.findIndex(
          (item) => !item.purchased && normalizeName(item.name) === normalizeName(selected.name)
        );
        if (existingIndex !== -1) {
          updatedItems[existingIndex] = { ...updatedItems[existingIndex], quantity: selected.quantity };
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

      return { ...list, items: [...newItems, ...updatedItems] };
    });

    closeOverlay();

    const parts: string[] = [];
    if (newCount > 0) parts.push(`Items added to the list: ${newCount}`);
    if (removedCount > 0) parts.push(`Items removed from the list: ${removedCount}`);
    if (parts.length > 0) showToast(parts.join('\n'));
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
    mergeItemsIntoList(currentList.id, items, 'add', '-qa');
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

  const handleDismissSuggestion = (name: string) => {
    if (!currentList) return;
    updateListById(currentList.id, (list) => ({
      ...list,
      recents: list.recents.filter((r) => r.toLowerCase() !== name.toLowerCase()),
      dismissedSuggestions: [...(list.dismissedSuggestions ?? []), name],
    }));
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

  const createSavedSet = (name: string, items: SavedSetItem[]) => {
    const newSet: SavedSet = {
      id: createId(),
      name,
      items,
      createdAt: Date.now(),
    };
    setSavedSets((current) => [newSet, ...current]);
    showToast(`Saved set "${name}" created.`);
  };

  const updateSavedSet = (setId: string, items: SavedSetItem[]) => {
    setSavedSets((current) =>
      current.map((s) => (s.id === setId ? { ...s, items } : s))
    );
    const name = savedSets.find((s) => s.id === setId)?.name;
    showToast(name ? `"${name}" updated.` : 'Set updated.');
  };

  const deleteSavedSet = (setId: string) => {
    setSavedSets((current) => current.filter((s) => s.id !== setId));
    showToast('Set deleted.');
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
    suggestions,
    selectedRecent,
    hasOverlayChanges,
    handleOverlayAdd,
    handleAddSelected,
    handleToggleRecent,
    handleUpdateRecentQuantity,
    handleDismissSuggestion,
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
    listDescriptionInput,
    setListDescriptionInput,
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
    goToLogin,
    goToSignup,
    handleAddMultipleSelected,
    handleQuickAddMultiple,
    savedSets,
    createSavedSet,
    updateSavedSet,
    deleteSavedSet,
  };
};
