import { useEffect, useMemo, useState } from 'react';
import {
  loadLists,
  loadRoute,
  saveLists,
  saveRoute,
} from '../storage';
import { AppRoute, SelectedRecentItem, ShoppingItem, ShoppingList } from '../types';
import { MAX_RECENTS, sanitizeRecents } from '../utils/recents';

type ListNameModalMode = 'create' | 'rename';

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
  closeListNameModal: () => void;
  submitListName: () => void;
  deleteList: (listId: string) => void;
  goToSettings: () => void;
};

const DEFAULT_ROUTE: AppRoute = { name: 'lists' };

const normalizeName = (value: string) => value.trim().toLowerCase();

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useShoppingListsApp = (): ShoppingListsAppState => {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [route, setRoute] = useState<AppRoute>(DEFAULT_ROUTE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [overlayInput, setOverlayInput] = useState('');
  const [selectedRecent, setSelectedRecent] = useState<SelectedRecentItem[]>([]);
  const [isListNameModalOpen, setIsListNameModalOpen] = useState(false);
  const [listNameMode, setListNameMode] = useState<ListNameModalMode>('create');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [listNameInput, setListNameInput] = useState('');
  const [listNameError, setListNameError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      const [storedLists, storedRoute] = await Promise.all([
        loadLists(),
        loadRoute(),
      ]);
      if (!isMounted) return;

      setLists(storedLists);

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
    };

    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveLists(lists);
  }, [lists, isHydrated]);

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

  const submitListName = () => {
    const error = validateListName(listNameInput, editingListId);
    if (error) {
      setListNameError(error);
      return;
    }

    const trimmed = listNameInput.trim();
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
    setLists((current) => current.filter((list) => list.id !== listId));
    if (route.name === 'list' && route.listId === listId) {
      setRoute(DEFAULT_ROUTE);
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
    closeListNameModal,
    submitListName,
    deleteList,
    goToSettings,
  };
};
