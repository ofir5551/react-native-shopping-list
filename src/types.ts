export type ShoppingItem = {
  id: string;
  name: string;
  purchased: boolean;
  createdAt: number;
  quantity: number;
};

export type ShoppingList = {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  items: ShoppingItem[];
  recents: string[];
  dismissedSuggestions: string[];
  ownerId?: string;
  shareCode?: string;
};

export type AppRoute =
  | { name: 'lists' }
  | { name: 'list'; listId: string }
  | { name: 'settings' }
  | { name: 'auth' }
  | { name: 'login' }
  | { name: 'signup' };

export type SelectedRecentItem = {
  name: string;
  quantity: number;
};

export type SavedSetItem = { name: string; quantity: number };
export type SavedSet = { id: string; name: string; items: SavedSetItem[]; createdAt: number };

