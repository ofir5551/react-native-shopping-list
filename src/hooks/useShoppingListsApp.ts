import { useEffect, useMemo, useState } from 'react';
import {
  loadLists,
  loadRoute,
  saveLists,
  saveRoute,
} from '../storage';
import { AppRoute, ShoppingItem, ShoppingList } from '../types';
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
  selectedRecent: string[];
  handleOverlayAdd: () => void;
  handleAddSelected: () => void;
  handleToggleRecent: (name: string) => void;
  handleClearRecents: () => void;
  handleToggle: (id: string) => void;
  handleDelete: (id: string) => void;
  handleClearAll: () => void;
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
  const [selectedRecent, setSelectedRecent] = useState<string[]>([]);
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

    updateListById(currentList.id, (list) => ({
      ...list,
      recents: sanitizeRecents(
        [name, ...list.recents.filter((item) => item !== name)].slice(
          0,
          MAX_RECENTS
        )
      ),
    }));
    setSelectedRecent((current) =>
      current.includes(name) ? current : [...current, name]
    );
    setOverlayInput('');
  };

  const handleAddSelected = () => {
    if (!currentList || selectedRecent.length === 0) return;
    const timestamp = Date.now();
    const newItems: ShoppingItem[] = selectedRecent.map((name, index) => ({
      id: `${timestamp}-${index}`,
      name,
      purchased: false,
      createdAt: timestamp + index,
    }));
    updateListById(currentList.id, (list) => ({
      ...list,
      items: [...newItems, ...list.items],
    }));
    closeOverlay();
  };

  const handleToggleRecent = (name: string) => {
    setSelectedRecent((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
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
    handleClearRecents,
    handleToggle,
    handleDelete,
    handleClearAll,
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
